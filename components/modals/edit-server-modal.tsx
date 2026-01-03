"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Settings, Trash2, Plus, X, Shield, Check, Users, Crown } from "lucide-react";

import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useModal } from "@/hooks/use-modal-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PERMISSIONS } from "@/lib/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dayjs from "dayjs";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Server name is required.",
  }),
  imageUrl: z.string().min(1, {
    message: "Server image is required.",
  }),
  bannerUrl: z.string().optional(),
});

export const EditServerModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { user } = useAuthStore();
  const updateServer = useMutation(api.servers.update);
  const createRole = useMutation(api.roles.create);
  const updateRole = useMutation(api.roles.update);
  const removeRole = useMutation(api.roles.remove);
  const toggleRole = useMutation(api.members.toggleRole);

  const isModalOpen = isOpen && type === "editServer";
  const { server } = data;
  const serverId = server ? ((server as any)?._id || (server as any)?.id) : null;

  const roles = useQuery(
    api.roles.getByServerId,
    serverId ? { serverId: serverId as any } : "skip"
  ) || [];

  const members = useQuery(
    api.members.getByServer,
    serverId && user?.userId ? { serverId: serverId as any, userId: user.userId } : "skip"
  ) || [];

  const [activeTab, setActiveTab] = useState<"overview" | "roles" | "members">("overview");
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleColor, setRoleColor] = useState("#5865F2");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [roleHoist, setRoleHoist] = useState(false);
  const [roleMentionable, setRoleMentionable] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      bannerUrl: "",
    },
  });

  const imageUrl = watch("imageUrl");
  const bannerUrl = watch("bannerUrl");

  useEffect(() => {
    if (server) {
      setValue("name", server.name);
      setValue("imageUrl", server.imageUrl);
      setValue("bannerUrl", server.bannerUrl || "");
      setBanner(server.bannerUrl || null);
    }
  }, [server, setValue]);

  // Sync selected member with updated members list
  useEffect(() => {
    if (selectedMember && members.length > 0) {
      const updatedMember = members.find((m: any) => m._id === selectedMember._id);
      if (updatedMember) {
        setSelectedMember(updatedMember);
      }
    }
  }, [members]);

  const isLoading = isSubmitting;

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setBannerError("Banner image must be less than 2MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setBannerError("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBanner(base64String);
        setValue("bannerUrl", base64String);
        setBannerError(null);
      };
      reader.onerror = () => {
        setBannerError("Failed to read image file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = () => {
    setBanner(null);
    setValue("bannerUrl", "");
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateServer({
        serverId: serverId as any,
        name: values.name,
        imageUrl: values.imageUrl,
        bannerUrl: banner || values.bannerUrl || undefined,
        userId: user?.userId,
      });

      reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    reset();
    setActiveTab("overview");
    setEditingRole(null);
    setIsCreatingRole(false);
    setRoleName("");
    setRoleColor("#5865F2");
    setRolePermissions([]);
    setRoleHoist(false);
    setRoleMentionable(false);
    setSelectedMember(null);
    setBanner(null);
    onClose();
  };

  const handleCreateRole = async () => {
    if (!serverId || !roleName.trim()) return;

    try {
      const maxPosition = roles.length > 0 
        ? Math.max(...roles.map((r: any) => r.position || 0))
        : 0;

      await createRole({
        serverId: serverId as any,
        name: roleName,
        color: roleColor,
        permissions: rolePermissions,
        position: maxPosition + 1,
        hoist: roleHoist,
        mentionable: roleMentionable,
        userId: user?.userId,
      });

      // Reset form
      setRoleName("");
      setRoleColor("#5865F2");
      setRolePermissions([]);
      setRoleHoist(false);
      setRoleMentionable(false);
      setIsCreatingRole(false);
    } catch (error) {
      console.error("Failed to create role:", error);
      alert("Failed to create role. Please try again.");
    }
  };

  const handleUpdateRole = async (roleId: string) => {
    if (!roleName.trim()) return;

    try {
      await updateRole({
        roleId: roleId as any,
        name: roleName,
        color: roleColor,
        permissions: rolePermissions,
        hoist: roleHoist,
        mentionable: roleMentionable,
        userId: user?.userId,
      });

      // Reset form
      setEditingRole(null);
      setRoleName("");
      setRoleColor("#5865F2");
      setRolePermissions([]);
      setRoleHoist(false);
      setRoleMentionable(false);
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role. Please try again.");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      await removeRole({
        roleId: roleId as any,
        userId: user?.userId,
      });
    } catch (error) {
      console.error("Failed to delete role:", error);
    }
  };

  const togglePermission = (permission: string) => {
    const hasPermission = rolePermissions.includes(permission);
    const hasAdmin = rolePermissions.includes(PERMISSIONS.ADMINISTRATOR);
    
    if (permission === PERMISSIONS.ADMINISTRATOR) {
      // If clicking ADMINISTRATOR
      if (hasAdmin) {
        // Remove ADMINISTRATOR
        setRolePermissions([]);
      } else {
        // Add ADMINISTRATOR (and remove all others)
        setRolePermissions([PERMISSIONS.ADMINISTRATOR]);
      }
    } else {
      // If clicking any other permission
      if (hasAdmin) {
        // If ADMINISTRATOR is selected, remove it and add this permission
        setRolePermissions([permission]);
      } else if (hasPermission) {
        // Remove the permission
        setRolePermissions(rolePermissions.filter((p) => p !== permission));
      } else {
        // Add the permission
        setRolePermissions([...rolePermissions, permission]);
      }
    }
  };

  const startEditRole = (role: any) => {
    setEditingRole(role);
    setIsCreatingRole(false);
    setRoleName(role.name);
    setRoleColor(role.color || "#5865F2");
    setRolePermissions(role.permissions || []);
    setRoleHoist(role.hoist || false);
    setRoleMentionable(role.mentionable || false);
  };

  const allPermissions = Object.values(PERMISSIONS);

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose}>
      <DrawerContent className="h-[90%] border-border">
        <DrawerHeader>
          <DrawerTitle className="text-2xl font-bold">Server Settings</DrawerTitle>
          <DrawerDescription>
            Manage your server settings, roles, and permissions
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-row h-full">
          {/* Sidebar */}
          <div className="w-48 border-r border-border p-4">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "overview"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("roles")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "roles"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Roles
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "members"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Members
              </button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            {activeTab === "overview" && (
        <form
          onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
          autoCapitalize="off"
          autoComplete="off"
        >
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Server Name
              </Label>
              <Input
                disabled={isLoading}
                className={cn(
                  errors.name && "border-red-500"
                )}
                placeholder="Enter server name"
                {...register("name")}
              />
              {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Server Image
                    </Label>
                    <div className="flex items-center gap-4">
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt="Server"
                          className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        />
                      )}
                      <FileUpload
                        endpoint="serverImage"
                        value={imageUrl}
                        onChange={(value) => setValue("imageUrl", value)}
                      />
                    </div>
                    {errors.imageUrl && (
                      <p className="text-sm text-red-500 mt-1">{errors.imageUrl.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Server Banner
                    </Label>
                    <div className="space-y-2">
                      {banner && (
                        <div className="relative w-full">
                          <img
                            src={banner}
                            alt="Banner"
                            className="w-full h-32 object-cover border-2 border-border rounded-md"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBannerChange}
                          className="hidden"
                          id="banner-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => bannerInputRef.current?.click()}
                        >
                          {banner ? "Change Banner" : "Upload Banner"}
                        </Button>
                        {banner && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveBanner}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Max 2MB, JPG/PNG/GIF/WEBP
                      </p>
                      {bannerError && (
                        <p className="text-sm text-red-500">{bannerError}</p>
              )}
            </div>
          </div>
                </div>

                <Separator />

                <div className="flex justify-end">
            <Button
              disabled={isLoading}
              type="submit"
            >
                    Save Changes
            </Button>
                </div>
        </form>
            )}

            {activeTab === "roles" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Roles</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage server roles and permissions
                    </p>
                  </div>
                  {!editingRole && !isCreatingRole && (
                    <Button
                      onClick={() => {
                        setIsCreatingRole(true);
                        setEditingRole(null);
                        setRoleName("");
                        setRoleColor("#5865F2");
                        setRolePermissions([]);
                        setRoleHoist(false);
                        setRoleMentionable(false);
                      }}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  )}
                </div>

                {isCreatingRole && (
                  <div className="space-y-4">
                    <div className="border border-border rounded-lg p-4 space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Role Name
                        </Label>
                        <Input
                          value={roleName}
                          onChange={(e) => setRoleName(e.target.value)}
                          placeholder="Enter role name"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Role Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={roleColor}
                            onChange={(e) => setRoleColor(e.target.value)}
                            className="w-12 h-10 rounded border border-border cursor-pointer"
                          />
                          <Input
                            value={roleColor}
                            onChange={(e) => setRoleColor(e.target.value)}
                            placeholder="#5865F2"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Display role members separately
                          </Label>
                          <Switch
                            checked={roleHoist}
                            onCheckedChange={setRoleHoist}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Allow anyone to @mention this role
                          </Label>
                          <Switch
                            checked={roleMentionable}
                            onCheckedChange={setRoleMentionable}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <Label className="text-sm font-medium mb-3 block">
                          Permissions
                        </Label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {allPermissions.map((permission) => {
                            const hasAdmin = rolePermissions.includes(PERMISSIONS.ADMINISTRATOR);
                            const isChecked = hasAdmin || rolePermissions.includes(permission);
                            return (
                              <div
                                key={permission}
                                className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                              >
                                <Label className="text-sm cursor-pointer flex-1">
                                  {permission.replace(/_/g, " ")}
                                </Label>
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(permission)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateRole}
                          disabled={!roleName.trim()}
                          className="flex-1"
                        >
                          Create Role
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsCreatingRole(false);
                            setRoleName("");
                            setRoleColor("#5865F2");
                            setRolePermissions([]);
                            setRoleHoist(false);
                            setRoleMentionable(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {editingRole && (
                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Edit Role: {editingRole.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRole(null);
                          setIsCreatingRole(false);
                          setRoleName("");
                          setRoleColor("#5865F2");
                          setRolePermissions([]);
                          setRoleHoist(false);
                          setRoleMentionable(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Role Name
                      </Label>
                      <Input
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="Enter role name"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Role Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={roleColor}
                          onChange={(e) => setRoleColor(e.target.value)}
                          className="w-12 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={roleColor}
                          onChange={(e) => setRoleColor(e.target.value)}
                          placeholder="#5865F2"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Display role members separately
                        </Label>
                        <Switch
                          checked={roleHoist}
                          onCheckedChange={setRoleHoist}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Allow anyone to @mention this role
                        </Label>
                        <Switch
                          checked={roleMentionable}
                          onCheckedChange={setRoleMentionable}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Permissions
                      </Label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allPermissions.map((permission) => {
                          const hasAdmin = rolePermissions.includes(PERMISSIONS.ADMINISTRATOR);
                          const isChecked = hasAdmin || rolePermissions.includes(permission);
                          return (
                            <div
                              key={permission}
                              className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                            >
                              <Label className="text-sm cursor-pointer flex-1">
                                {permission.replace(/_/g, " ")}
                              </Label>
                              <Switch
                                checked={isChecked}
                                onCheckedChange={() => togglePermission(permission)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleUpdateRole(editingRole._id)}
                        disabled={!roleName.trim()}
                        className="flex-1"
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteRole(editingRole._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Existing Roles</h4>
                  <div className="space-y-2">
                    {roles.map((role: any) => (
                      <div
                        key={role._id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: role.color || "#5865F2" }}
                          />
                          <div>
                            <p className="font-medium">{role.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {role.permissions.length} permissions
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditRole(role)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {roles.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No custom roles yet. Create one to get started!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "members" && (
              <div className="flex flex-row gap-6 h-full">
                {/* Left side - Member list */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">Members</h3>
                    <p className="text-sm text-muted-foreground">
                      Select a member to manage their roles
                    </p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-1">
                      {members.map((member: any) => {
                        // Get all roles for this member (support both new roleIds array and legacy roleId)
                        const memberRoleIds = member.roleIds || (member.roleId ? [member.roleId] : []);
                        const memberRoles = member.roles || memberRoleIds.map((id: string) => roles.find((r: any) => r._id === id)).filter(Boolean);
                        const isCurrentUser = member.profile?.userId === user?.userId;
                        const isOwner = server?.profileId === member.profile?._id;
                        const isSelected = selectedMember?._id === member._id;

                        return (
                          <div
                            key={member._id}
                            onClick={() => setSelectedMember(member)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                              isSelected
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted/50 border border-transparent"
                            )}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage
                                src={member.profile?.imageUrl}
                                alt={member.profile?.name || "Member"}
                              />
                              <AvatarFallback>
                                {(member.profile?.globalName || member.profile?.name || "M")
                                  .charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">
                                  {member.profile?.globalName || member.profile?.name || "Unknown"}
                                </p>
                                {isOwner && (
                                  <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                )}
                                {isCurrentUser && (
                                  <span className="text-xs text-muted-foreground">(You)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {memberRoles.length > 0 ? (
                                  memberRoles.map((role: any, idx: number) => (
                                    <div key={role?._id || idx} className="flex items-center gap-1">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                          backgroundColor: role?.color || "#5865F2",
                                        }}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {role?.name || "Unknown"}
                                      </span>
                                    </div>
                                  ))
                                ) : member.role ? (
                                  <span className="text-xs text-muted-foreground">
                                    {member.role}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No role</span>
                                )}
                                {(memberRoles.length > 0 || member.role) && (
                                  <span className="text-xs text-muted-foreground">•</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Joined {dayjs(member.createdAt).format("MMM D, YYYY")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {members.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No members found.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right side - Member details */}
                {selectedMember && (
                  <div className="w-96 flex flex-col border-l border-border pl-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage
                            src={selectedMember.profile?.imageUrl}
                            alt={selectedMember.profile?.name || "Member"}
                          />
                          <AvatarFallback>
                            {(selectedMember.profile?.globalName ||
                              selectedMember.profile?.name ||
                              "M")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">
                              {selectedMember.profile?.globalName ||
                                selectedMember.profile?.name ||
                                "Unknown"}
                            </h4>
                            {server?.profileId === selectedMember.profile?._id && (
                              <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            @{selectedMember.profile?.name || "unknown"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Joined</p>
                          <p className="font-medium">
                            {dayjs(selectedMember.createdAt).format("MMMM D, YYYY")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Roles</p>
                          {selectedMember.roles && selectedMember.roles.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {selectedMember.roles.map((role: any) => (
                                <div
                                  key={role._id}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-muted"
                                >
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: role.color || "#5865F2",
                                    }}
                                  />
                                  <span className="font-medium text-xs">{role.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : selectedMember.role ? (
                            <p className="font-medium mt-1">{selectedMember.role}</p>
                          ) : (
                            <p className="text-muted-foreground mt-1">No roles assigned</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex-1">
                      <h5 className="font-medium mb-3">Assign Roles</h5>
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-2">
                          {roles.map((role: any) => {
                            const memberRoleIds = selectedMember.roleIds || (selectedMember.roleId ? [selectedMember.roleId] : []);
                            const isAssigned = memberRoleIds.includes(role._id);
                            return (
                              <div
                                key={role._id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg transition-colors border",
                                  isAssigned
                                    ? "bg-primary/10 border-primary/20"
                                    : "hover:bg-muted/50 border-border"
                                )}
                              >
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: role.color || "#5865F2" }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{role.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {role.permissions.length} permission
                                    {role.permissions.length !== 1 ? "s" : ""}
                                  </p>
                                </div>
                                <Switch
                                  checked={isAssigned}
                                  onCheckedChange={async (checked) => {
                                    try {
                                      await toggleRole({
                                        memberId: selectedMember._id,
                                        roleId: role._id,
                                        userId: user?.userId,
                                      });
                                    } catch (error) {
                                      console.error("Failed to toggle role:", error);
                                      alert(
                                        error instanceof Error
                                          ? error.message
                                          : "Failed to toggle role"
                                      );
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}

                          {roles.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No custom roles available. Create roles in the Roles tab.
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {!selectedMember && (
                  <div className="w-96 flex items-center justify-center border-l border-border pl-6">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Select a member to view details
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
