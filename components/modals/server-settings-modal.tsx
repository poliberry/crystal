"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Trash2, Users, Settings, Shield, UserPlus, Save, X } from "lucide-react";

import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { useModal } from "@/hooks/use-modal-store";
import { useServerPermissions } from "@/hooks/use-permissions";
import { PermissionType, PermissionScope, PermissionGrantType, PermissionOverride } from "@/types/permissions";
import type { ServerWithMembersWithProfiles } from "@/types";

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

export const ServerSettingsModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingRole, setEditingRole] = useState<{ name: string; color: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const isModalOpen = isOpen && type === "serverSettings";
  const { server } = data;

  const permissions = useServerPermissions(data.currentMember?.id || '');
  const canManageServer = permissions.getPermission(PermissionType.MANAGE_SERVER).granted;
  const canManageRoles = permissions.getPermission(PermissionType.MANAGE_ROLES).granted;

  console.log('Modal Debug:', {
    member: data.currentMember,
    permissions: permissions.results,
    canManageServer,
    canManageRoles,
    loading: permissions.loading
  });

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

  const fetchRoles = async () => {
    if (!server) return;
    try {
      console.log('Fetching roles for server:', server.id);
      const response = await axios.get(`/api/servers/${server.id}/roles`);
      console.log('Roles response:', response.data);
      setRoles(response.data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const fetchMembers = async () => {
    if (!server) return;
    try {
      console.log('Fetching members for server:', server.id);
      const response = await axios.get(`/api/servers/${server.id}/members`);
      console.log('Members response:', response.data);
      setMembers(response.data);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

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
    setActiveTab("general");
    setSelectedRole(null);
    setSelectedMember(null);
    setEditingRole(null);
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
      setRoles([...roles, response.data]);
    } catch (error) {
      console.error("Failed to create role:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRolePermissions = async (roleId: string, permission: PermissionType, granted: boolean) => {
    if (!server || !canManageRoles) return;
    
    try {
      // Get current role permissions as PermissionOverride objects
      const currentPermissions = selectedRole?.permissions || [];
      
      let updatedPermissions;
      if (granted) {
        // Add permission if not already present
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
        // Remove permission
        updatedPermissions = currentPermissions.filter(p => p.permission !== permission);
      }

      await axios.patch(`/api/servers/${server.id}/roles/${roleId}`, {
        permissions: updatedPermissions
      });
      
      // Update local state
      setRoles(roles.map(role => 
        role.id === roleId 
          ? { 
              ...role, 
              permissions: updatedPermissions
            }
          : role
      ));
      
      if (selectedRole?.id === roleId) {
        setSelectedRole({
          ...selectedRole,
          permissions: updatedPermissions
        });
      }
    } catch (error) {
      console.error("Failed to update role permissions:", error);
    }
  };

  const updateRole = async (roleId: string, updates: { name?: string; color?: string }) => {
    if (!server || !canManageRoles) return;
    
    try {
      const response = await axios.patch(`/api/servers/${server.id}/roles/${roleId}`, updates);
      
      // Update local state
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

  const assignRole = async (memberId: string, roleId: string) => {
    if (!server || !canManageRoles) return;
    
    try {
      await axios.post(`/api/servers/${server.id}/members/${memberId}/roles`, {
        roleId
      });
      fetchMembers(); // Refresh members list
    } catch (error) {
      console.error("Failed to assign role:", error);
    }
  };

  const removeRole = async (memberId: string, roleId: string) => {
    if (!server || !canManageRoles) return;
    
    try {
      await axios.delete(`/api/servers/${server.id}/members/${memberId}/roles/${roleId}`);
      fetchMembers(); // Refresh members list
    } catch (error) {
      console.error("Failed to remove role:", error);
    }
  };

  const assignUserPermission = async (memberId: string, permission: PermissionType, granted: boolean) => {
    if (!server || !canManageRoles) return;
    
    try {
      await axios.patch(`/api/servers/${server.id}/members/${memberId}/permissions`, {
        permission,
        granted,
        scope: PermissionScope.SERVER
      });
      
      // Refresh members to show updated permissions
      fetchMembers();
    } catch (error) {
      console.error("Failed to update user permission:", error);
    }
  };

  const allPermissions = [
    { type: PermissionType.ADMINISTRATOR, name: "Administrator", description: "Full control over the server" },
    { type: PermissionType.MANAGE_SERVER, name: "Manage Server", description: "Edit server settings and information" },
    { type: PermissionType.MANAGE_ROLES, name: "Manage Roles", description: "Create, edit, and delete roles" },
    { type: PermissionType.MANAGE_CHANNELS, name: "Manage Channels", description: "Create, edit, and delete channels" },
    { type: PermissionType.MANAGE_MESSAGES, name: "Manage Messages", description: "Delete and edit others' messages" },
    { type: PermissionType.VIEW_CHANNELS, name: "View Channels", description: "Access to view channels" },
    { type: PermissionType.SEND_MESSAGES, name: "Send Messages", description: "Send messages in text channels" },
    { type: PermissionType.ATTACH_FILES, name: "Attach Files", description: "Upload files and images" },
    { type: PermissionType.USE_EXTERNAL_EMOJIS, name: "Use External Emojis", description: "Use emojis from other servers" },
    { type: PermissionType.CREATE_INSTANT_INVITE, name: "Create Invite", description: "Create server invites" },
    { type: PermissionType.KICK_MEMBERS, name: "Kick Members", description: "Remove members from the server" },
    { type: PermissionType.BAN_MEMBERS, name: "Ban Members", description: "Ban members from the server" },
  ];

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogTitle className="hidden">Server Settings</DialogTitle>
        <DialogHeader className="pt-6 px-6 pb-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Server Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="general" className="px-6 pb-6 mt-6">
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
            </TabsContent>

            <TabsContent value="roles" className="px-6 pb-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Roles</CardTitle>
                        <CardDescription>Manage server roles and hierarchy</CardDescription>
                      </div>
                      <Button
                        onClick={createRole}
                        disabled={loading || !canManageRoles}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Create Role
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {roles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No roles found. Create your first role to get started.</p>
                        </div>
                      ) : (
                        roles.map((role) => (
                          <div
                            key={role.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                              selectedRole?.id === role.id ? 'bg-accent border-primary' : ''
                            }`}
                            onClick={() => setSelectedRole(role)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: role.color }}
                                />
                                <div>
                                  <p className="font-medium">{role.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {role.memberCount} members
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {role.permissions.length} permissions
                                </Badge>
                                {role.name !== "everyone" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteRole(role.id);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedRole && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: selectedRole.color }}
                        />
                        {editingRole ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingRole.name}
                              onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                              className="flex-1"
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
                          <div className="flex items-center gap-2 flex-1">
                            <span>{selectedRole.name}</span>
                            {selectedRole.name !== "everyone" && canManageRoles && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingRole({ name: selectedRole.name, color: selectedRole.color })}
                                className="ml-auto"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Configure permissions for this role
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {allPermissions.map((permission) => (
                          <div key={permission.type} className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">{permission.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                            <Switch
                              checked={selectedRole.permissions.some(p => p.permission === permission.type)}
                              onCheckedChange={(checked) =>
                                updateRolePermissions(selectedRole.id, permission.type, checked)
                              }
                              disabled={!canManageRoles}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="members" className="px-6 pb-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Server Members</CardTitle>
                    <CardDescription>
                      Manage member roles and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {members.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No members found.</p>
                        </div>
                      ) : (
                        members.map((member) => (
                          <div
                            key={member.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                              selectedMember?.id === member.id ? 'bg-accent border-primary' : ''
                            }`}
                            onClick={() => setSelectedMember(member)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img
                                  src={member.user.imageUrl}
                                  alt={member.user.name}
                                  className="w-10 h-10 rounded-full"
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
                              <div className="flex items-center gap-2">
                                <Select
                                  onValueChange={(roleId) => assignRole(member.id, roleId)}
                                  disabled={!canManageRoles}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Add role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles
                                      .filter(role => !member.roles.some(memberRole => memberRole.id === role.id))
                                      .map((role) => (
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
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedMember && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <img
                          src={selectedMember.user.imageUrl}
                          alt={selectedMember.user.name}
                          className="w-6 h-6 rounded-full"
                        />
                        {selectedMember.user.name} Permissions
                      </CardTitle>
                      <CardDescription>
                        Direct permissions for this member (overrides roles)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Current Roles</h4>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedMember.roles.map((role) => (
                              <Badge
                                key={role.id}
                                variant="secondary"
                                className="text-xs flex items-center gap-1"
                                style={{ backgroundColor: role.color + "20", color: role.color }}
                              >
                                {role.name}
                                {role.name !== "everyone" && canManageRoles && (
                                  <button
                                    onClick={() => removeRole(selectedMember.id, role.id)}
                                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium mb-2">Direct Permissions</h4>
                          <div className="space-y-3">
                            {allPermissions.map((permission) => (
                              <div key={permission.type} className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{permission.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => assignUserPermission(selectedMember.id, permission.type, false)}
                                    disabled={!canManageRoles}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Deny
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => assignUserPermission(selectedMember.id, permission.type, true)}
                                    disabled={!canManageRoles}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    Allow
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="px-6 pb-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Permission Overview</CardTitle>
                  <CardDescription>
                    View all permissions and their descriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {allPermissions.map((permission) => (
                      <div key={permission.type} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{permission.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {permission.description}
                            </p>
                          </div>
                          <Badge variant="outline">{permission.type}</Badge>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Roles with this permission:</p>
                          <div className="flex flex-wrap gap-1">
                            {roles
                              .filter(role => role.permissions.some(p => p.permission === permission.type))
                              .map((role) => (
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
