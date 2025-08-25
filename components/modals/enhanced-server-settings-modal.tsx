"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Shield, 
  Users, 
  Save, 
  UserPlus, 
  Trash2, 
  X, 
  Crown,
  MoreVertical,
  Palette,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit3,
  Plus,
  Hash,
  ChevronRight,
  Search,
  Filter
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";
import { useServerPermissions } from "@/hooks/use-permissions";
import { PermissionType, PermissionScope, PermissionGrantType, PermissionOverride, PERMISSION_GROUPS } from "@/types/permissions";
import type { ServerWithMembersWithProfiles } from "@/types";
import { UserAvatar } from "../user-avatar";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Server name is required.",
  }),
  imageUrl: z.string().min(1, {
    message: "Server image is required.",
  }),
});

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: PermissionOverride[];
  memberCount: number;
  position: number;
  hoisted: boolean;
  mentionable: boolean;
}

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    imageUrl: string;
  };
  roles: Role[];
}

export const EnhancedServerSettingsModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeRoleView, setActiveRoleView] = useState("list");
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingRole, setEditingRole] = useState<{ name: string; color: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const isModalOpen = isOpen && type === "enhancedServerSettings";
  const { server } = data;

  const permissions = useServerPermissions(data.currentMember?.id || '');
  const canManageServer = permissions.getPermission(PermissionType.MANAGE_SERVER).granted;
  const canManageRoles = permissions.getPermission(PermissionType.MANAGE_ROLES).granted;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (server) {
      form.setValue("name", server.name);
      form.setValue("imageUrl", server.imageUrl);
      fetchRoles();
      fetchMembers();
    }
  }, [server, form]);

  const fetchRoles = useCallback(async () => {
    if (!server) return;
    try {
      const response = await axios.get(`/api/servers/${server.id}/roles`);
      const rolesData = response.data.map((role: any) => ({
        ...role,
        memberCount: role.memberRoles?.length || 0
      }));
      setRoles(rolesData);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  }, [server]);

  const fetchMembers = useCallback(async () => {
    if (!server) return;
    try {
      const response = await axios.get(`/api/servers/${server.id}/members`);
      setMembers(response.data.members || []);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  }, [server]);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!canManageServer) return;
    
    try {
      await axios.patch(`/api/servers/${server?.id}`, values);
      form.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    form.reset();
    setActiveTab("overview");
    setActiveRoleView("list");
    setSelectedRole(null);
    setSelectedMember(null);
    setEditingRole(null);
    setSearchQuery("");
    setRoleFilter("all");
    onClose();
  };

  const createRole = async () => {
    if (!server || !canManageRoles) return;
    
    try {
      setLoading(true);
      const response = await axios.post(`/api/servers/${server.id}/roles`, {
        name: "New Role",
        color: "#99AAB5",
        permissions: []
      });
      setRoles([...roles, { ...response.data, memberCount: 0 }]);
    } catch (error) {
      console.error("Failed to create role:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRolePermissions = async (roleId: string, permission: PermissionType, granted: boolean) => {
    if (!server || !canManageRoles) return;
    
    try {
      const currentPermissions = selectedRole?.permissions || [];
      
      let updatedPermissions;
      if (granted) {
        const hasPermission = currentPermissions.some(p => p.permission === permission);
        if (!hasPermission) {
          updatedPermissions = [
            ...currentPermissions,
            {
              permission,
              grant: PermissionGrantType.ALLOW,
              scope: PermissionScope.SERVER,
              targetId: server.id
            }
          ];
        } else {
          updatedPermissions = currentPermissions;
        }
      } else {
        updatedPermissions = currentPermissions.filter(p => p.permission !== permission);
      }

      await axios.patch(`/api/servers/${server.id}/roles/${roleId}`, {
        permissions: updatedPermissions
      });
      
      setRoles(roles.map(role => 
        role.id === roleId 
          ? { ...role, permissions: updatedPermissions }
          : role
      ));
      
      if (selectedRole?.id === roleId) {
        setSelectedRole({ ...selectedRole, permissions: updatedPermissions });
      }
    } catch (error) {
      console.error("Failed to update role permissions:", error);
    }
  };

  const updateRole = async (roleId: string, updates: { name?: string; color?: string; hoisted?: boolean; mentionable?: boolean }) => {
    if (!server || !canManageRoles) return;
    
    try {
      await axios.patch(`/api/servers/${server.id}/roles/${roleId}`, updates);
      
      setRoles(roles.map(role => 
        role.id === roleId ? { ...role, ...updates } : role
      ));
      
      if (selectedRole?.id === roleId) {
        setSelectedRole({ ...selectedRole, ...updates });
      }
      
      setEditingRole(null);
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!server || !canManageRoles) return;
    
    try {
      await axios.delete(`/api/servers/${server.id}/roles/${roleId}`);
      setRoles(roles.filter(role => role.id !== roleId));
      if (selectedRole?.id === roleId) {
        setSelectedRole(null);
      }
    } catch (error) {
      console.error("Failed to delete role:", error);
    }
  };

  const moveRole = async (roleId: string, direction: 'up' | 'down') => {
    if (!server || !canManageRoles) return;
    
    try {
      const role = roles.find(r => r.id === roleId);
      if (!role) return;

      const sortedRoles = [...roles].sort((a, b) => b.position - a.position);
      const currentIndex = sortedRoles.findIndex(r => r.id === roleId);
      
      if (direction === 'up' && currentIndex > 0) {
        const targetRole = sortedRoles[currentIndex - 1];
        await axios.patch(`/api/servers/${server.id}/roles/${roleId}/position`, {
          position: targetRole.position + 1
        });
      } else if (direction === 'down' && currentIndex < sortedRoles.length - 1) {
        const targetRole = sortedRoles[currentIndex + 1];
        await axios.patch(`/api/servers/${server.id}/roles/${roleId}/position`, {
          position: targetRole.position - 1
        });
      }
      
      fetchRoles();
    } catch (error) {
      console.error("Failed to move role:", error);
    }
  };

  const assignRole = async (memberId: string, roleId: string) => {
    if (!server || !canManageRoles) return;
    
    try {
      await axios.post(`/api/servers/${server.id}/members/${memberId}/roles`, {
        roleId
      });
      fetchMembers();
    } catch (error) {
      console.error("Failed to assign role:", error);
    }
  };

  const removeRole = async (memberId: string, roleId: string) => {
    if (!server || !canManageRoles) return;
    
    try {
      await axios.delete(`/api/servers/${server.id}/members/${memberId}/roles/${roleId}`);
      fetchMembers();
    } catch (error) {
      console.error("Failed to remove role:", error);
    }
  };

  const getHighestRole = (memberRoles: Role[]) => {
    return memberRoles.sort((a, b) => b.position - a.position)[0];
  };

  const getPermissionDescription = (permission: PermissionType): string => {
    const descriptions: Record<PermissionType, string> = {
      [PermissionType.ADMINISTRATOR]: "Full control over the server",
      [PermissionType.MANAGE_SERVER]: "Edit server settings and information",
      [PermissionType.MANAGE_ROLES]: "Create, edit, and delete roles",
      [PermissionType.MANAGE_CHANNELS]: "Create, edit, and delete channels",
      [PermissionType.MANAGE_MESSAGES]: "Delete and edit others' messages",
      [PermissionType.VIEW_CHANNELS]: "Access to view channels",
      [PermissionType.SEND_MESSAGES]: "Send messages in text channels",
      [PermissionType.ATTACH_FILES]: "Upload files and images",
      [PermissionType.USE_EXTERNAL_EMOJIS]: "Use emojis from other servers",
      [PermissionType.CREATE_INSTANT_INVITE]: "Create server invites",
      [PermissionType.KICK_MEMBERS]: "Remove members from the server",
      [PermissionType.BAN_MEMBERS]: "Ban members from the server",
      // Add more descriptions as needed
    };
    return descriptions[permission] || permission;
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.roles.some(role => role.id === roleFilter);
    return matchesSearch && matchesRole;
  });

  const groupedMembers = filteredMembers.reduce((groups, member) => {
    const highestRole = getHighestRole(member.roles);
    const roleId = highestRole?.id || "no-role";
    const roleName = highestRole?.name || "No Role";
    
    if (!groups[roleId]) {
      groups[roleId] = {
        role: highestRole || { name: "No Role", color: "#99AAB5", position: -1 },
        members: []
      };
    }
    
    groups[roleId].members.push(member);
    return groups;
  }, {} as Record<string, { role: any; members: Member[] }>);

  const sortedGroups = Object.entries(groupedMembers).sort(([, a], [, b]) => 
    b.role.position - a.role.position
  );

  if (!isModalOpen) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0 bg-white dark:bg-gray-900">
        <div className="flex h-full">
          {/* Sidebar Navigation */}
          <div className="w-60 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <DialogHeader className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Server Settings
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="flex-1 px-2 py-4">
              <div className="space-y-1">
                <Button
                  variant={activeTab === "overview" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("overview")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Overview
                </Button>
                
                <Button
                  variant={activeTab === "roles" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("roles")}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Roles
                </Button>
                
                <Button
                  variant={activeTab === "members" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("members")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </Button>
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-bold mb-6">Server Overview</h2>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Server Information</CardTitle>
                          <CardDescription>
                            Customize your server's appearance and basic settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="flex items-center justify-center">
                            <FormField
                              control={form.control}
                              name="imageUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <FileUpload
                                      endpoint="serverImage"
                                      value={field.value}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Server Name</FormLabel>
                                <FormControl>
                                  <Input
                                    disabled={isLoading || !canManageServer}
                                    placeholder="Enter server name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleClose}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={isLoading || !canManageServer}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            )}

            {activeTab === "roles" && (
              <div className="flex-1 flex overflow-hidden">
                {/* Roles List */}
                <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Roles</h3>
                      <Button
                        onClick={createRole}
                        disabled={loading || !canManageRoles}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant={activeRoleView === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveRoleView("list")}
                      >
                        List
                      </Button>
                      <Button
                        variant={activeRoleView === "hierarchy" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveRoleView("hierarchy")}
                      >
                        Hierarchy
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                      {roles
                        .sort((a, b) => b.position - a.position)
                        .map((role) => (
                        <div
                          key={role.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            selectedRole?.id === role.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700'
                          }`}
                          onClick={() => setSelectedRole(role)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: role.color }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{role.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {role.memberCount} members
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {role.hoisted && (
                                <Eye className="h-4 w-4 text-gray-400" title="Displayed separately" />
                              )}
                              {role.mentionable && (
                                <Hash className="h-4 w-4 text-gray-400" title="Mentionable" />
                              )}
                              {role.name !== "everyone" && canManageRoles && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => moveRole(role.id, 'up')}
                                    >
                                      <ArrowUp className="h-4 w-4 mr-2" />
                                      Move Up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => moveRole(role.id, 'down')}
                                    >
                                      <ArrowDown className="h-4 w-4 mr-2" />
                                      Move Down
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => deleteRole(role.id)}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Role Details */}
                <div className="flex-1 overflow-y-auto">
                  {selectedRole ? (
                    <div className="p-6">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: selectedRole.color }}
                            />
                            {editingRole ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingRole.name}
                                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                  className="text-lg font-semibold"
                                />
                                <ColorPicker
                                  value={editingRole.color}
                                  onChange={(color: string) => setEditingRole({ ...editingRole, color })}
                                  disabled={!canManageRoles}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => updateRole(selectedRole.id, editingRole)}
                                  disabled={!canManageRoles}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingRole(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold">{selectedRole.name}</h2>
                                {selectedRole.name !== "everyone" && canManageRoles && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingRole({ name: selectedRole.name, color: selectedRole.color })}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <Badge variant="secondary">
                            {selectedRole.memberCount} members
                          </Badge>
                        </div>

                        {selectedRole.name !== "everyone" && (
                          <div className="flex gap-4 mb-6">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={selectedRole.hoisted}
                                onCheckedChange={(checked) => updateRole(selectedRole.id, { hoisted: checked })}
                                disabled={!canManageRoles}
                              />
                              <Label>Display role members separately from online members</Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={selectedRole.mentionable}
                                onCheckedChange={(checked) => updateRole(selectedRole.id, { mentionable: checked })}
                                disabled={!canManageRoles}
                              />
                              <Label>Allow anyone to @mention this role</Label>
                            </div>
                          </div>
                        )}
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Permissions</CardTitle>
                          <CardDescription>
                            Configure what members with this role can do
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPermissions]) => (
                              <div key={groupName}>
                                <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  {groupName.replace(/_/g, ' ')}
                                </h4>
                                <div className="space-y-3">
                                  {groupPermissions.map((permission) => (
                                    <div key={permission} className="flex items-center justify-between">
                                      <div className="space-y-1">
                                        <p className="font-medium">{permission.replace(/_/g, ' ')}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          {getPermissionDescription(permission)}
                                        </p>
                                      </div>
                                      <Switch
                                        checked={selectedRole.permissions.some(p => p.permission === permission)}
                                        onCheckedChange={(checked) =>
                                          updateRolePermissions(selectedRole.id, permission, checked)
                                        }
                                        disabled={!canManageRoles}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a role to view and edit its permissions</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "members" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Members</h3>
                    <Badge variant="secondary">{members.length} members</Badge>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: role.color }}
                              />
                              {role.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {sortedGroups.map(([roleId, group]) => (
                      <div key={roleId} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: group.role.color }}
                          />
                          <h4 className="font-medium text-sm uppercase tracking-wide">
                            {group.role.name} — {group.members.length}
                          </h4>
                        </div>
                        
                        <div className="space-y-2">
                          {group.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  src={member.user.imageUrl}
                                  className="h-8 w-8"
                                />
                                <div>
                                  <p className="font-medium">{member.user.name}</p>
                                  <div className="flex gap-1 mt-1">
                                    {member.roles.map((role) => (
                                      <Badge
                                        key={role.id}
                                        variant="secondary"
                                        className="text-xs"
                                        style={{ backgroundColor: role.color + "20", color: role.color }}
                                      >
                                        {role.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              {canManageRoles && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => setSelectedMember(member)}
                                    >
                                      <Edit3 className="h-4 w-4 mr-2" />
                                      Manage Roles
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
