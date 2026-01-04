"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  User,
  Shield,
  Bell,
  Palette,
  Key,
  Globe,
  Mic,
  Video,
  Speaker,
  MessageSquare,
  Eye,
  Lock,
  Trash2,
  LogOut,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useModal } from "@/hooks/use-modal-store";
import { useLiveKit } from "../providers/media-room-provider";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent } from "../ui/card";
import { IconSettings } from "@tabler/icons-react";
import dayjs from "dayjs";
import { Calendar } from "lucide-react";
import Image from "next/image";
import { Sheet, SheetContent } from "../ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";

const profileSchema = z.object({
  avatar: z.string().optional(),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(32, "Display name must be 32 characters or less"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(32, "Username must be 32 characters or less"),
  bio: z.string().max(190, "Bio must be 190 characters or less").optional(),
  pronouns: z
    .string()
    .max(40, "Pronouns must be 40 characters or less")
    .optional(),
  bannerUrl: z.string().optional(),
});

const securitySchema = z.object({
  twoFactorEnabled: z.boolean(),
  emailNotifications: z.boolean(),
  phoneNumber: z.string().optional(),
});

type SettingsTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category?: string;
};

const settingsTabs: SettingsTab[] = [
  // User Settings
  { id: "account", label: "My Account", icon: User, category: "User Settings" },
  { id: "profile", label: "Profile", icon: User },
  { id: "privacy", label: "Privacy & Safety", icon: Shield },
  { id: "connections", label: "Connections", icon: Globe },

  // App Settings
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    category: "App Settings",
  },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "keybinds", label: "Keybinds", icon: Key },
  { id: "language", label: "Language", icon: Globe },

  // Voice & Video
  { id: "voice", label: "Voice & Video", icon: Mic, category: "Voice & Video" },
  { id: "audio", label: "Audio", icon: Speaker },

  // Chat
  { id: "text", label: "Text & Images", icon: MessageSquare, category: "Chat" },

  // Advanced
  { id: "advanced", label: "Advanced", icon: Eye, category: "Advanced" },
];

export const UserSettingsModal = () => {
  const { isOpen, onClose, type } = useModal();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const customisation = useQuery(
    api.userCustomisation.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const updateProfile = useMutation(api.profiles.update);
  const updateCustomisation = useMutation(api.userCustomisation.update);
  // Note: notificationSettings API will be available after Convex regenerates
  // @ts-ignore - Will be available after Convex regenerates API
  const notificationSettings = useQuery(api.notificationSettings?.getByUserId, 
    user?.userId ? { userId: user.userId } : "skip"
  );
  // @ts-ignore - Will be available after Convex regenerates API
  const updateNotificationSettings = useMutation(api.notificationSettings?.update);
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isModalOpen = isOpen && type === "userSettings";

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      avatar: profile?.imageUrl || "",
      displayName: profile?.globalName || "",
      username: profile?.name || "",
      bio: profile?.bio || "",
      pronouns: profile?.pronouns || "",
      bannerUrl: profile?.bannerUrl || "",
    },
  });

  useEffect(() => {
    if (profile) {
      const imageUrl = profile?.imageUrl || "";
      profileForm.setValue("avatar", imageUrl);
      setAvatar(imageUrl || null);
      const bannerUrl = profile?.bannerUrl || "";
      profileForm.setValue("bannerUrl", bannerUrl);
      setBanner(bannerUrl || null);
      profileForm.setValue("displayName", profile?.globalName || "");
      profileForm.setValue("username", profile?.name || "");
      profileForm.setValue("bio", profile?.bio || "");
      profileForm.setValue("pronouns", profile?.pronouns || "");
    }
  }, [profile, profileForm]);

  const securityForm = useForm({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      twoFactorEnabled: false,
      emailNotifications: true,
      phoneNumber: "",
    },
  });

  const handleClose = () => {
    onClose();
    setActiveTab("account");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setAvatarError("Avatar image must be less than 2MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setAvatarError("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        profileForm.setValue("avatar", base64String);
        setAvatarError(null);
      };
      reader.onerror = () => {
        setAvatarError("Failed to read image file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    profileForm.setValue("avatar", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setBannerError("Banner image must be less than 2MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setBannerError("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBanner(base64String);
        profileForm.setValue("bannerUrl", base64String);
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
    profileForm.setValue("bannerUrl", "");
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  };

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!profile) return;

    try {
      setLoading(true);
      // Update profile using Convex
      await updateProfile({
        profileId: profile._id,
        imageUrl: avatar || values.avatar || undefined,
        name: values.username,
        globalName: values.displayName,
        bio: values.bio,
        pronouns: values.pronouns,
        bannerUrl: banner || values.bannerUrl || undefined,
        userId: user?.userId,
      });
    } catch (error) {
      console.error(error);
    } finally {
      // Socket updates can be handled separately if needed
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-500";
      case "IDLE":
        return "bg-yellow-500";
      case "DND":
        return "bg-red-500";
      case "INVISIBLE":
      case "OFFLINE":
      default:
        return "bg-gray-500";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">My Account</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 rounded-full">
                    <AvatarImage
                      src={profile?.imageUrl}
                      alt={
                        profile?.globalName || profile?.name || "User Avatar"
                      }
                    />
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">
                      {profile?.globalName || profile?.name}
                    </h4>
                    <p className="text-muted-foreground">@{profile?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit User Profile
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Account Management</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        );

      case "profile":
        // Watch form values for real-time preview updates
        const watchedDisplayName = profileForm.watch("displayName");
        const watchedUsername = profileForm.watch("username");
        const watchedBio = profileForm.watch("bio");
        const watchedPronouns = profileForm.watch("pronouns");
        const watchedBannerUrl = profileForm.watch("bannerUrl");
        const watchedAvatar = profileForm.watch("avatar");

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Profile</h3>
              <p className="text-muted-foreground mb-6">
                This information will be visible to other users. When you click
                "Save Changes", your changes will appear on the right.
              </p>
            </div>
            <div className="flex flex-row gap-16 w-full">
              <div className="w-full">
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="avatar">Avatar</Label>
                    <div className="flex flex-row items-center gap-4">
                      <div className="relative">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt="Avatar"
                            className="w-24 h-24 rounded-none object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-none bg-muted border-2 border-border flex items-center justify-center">
                            <User className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            size="sm"
                          >
                            {avatar ? "Change Avatar" : "Upload Avatar"}
                          </Button>
                          {avatar && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveAvatar}
                              size="sm"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Max 1MB, JPG/PNG/GIF/WEBP
                        </p>
                        {avatarError && (
                          <p className="text-sm text-red-500">{avatarError}</p>
                        )}
                        {profileForm.formState.errors.avatar && (
                          <p className="text-sm text-red-500">
                            {profileForm.formState.errors.avatar.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      {...profileForm.register("displayName")}
                      placeholder="Enter your display name"
                      className={cn(
                        profileForm.formState.errors.displayName &&
                          "border-red-500"
                      )}
                    />
                    {profileForm.formState.errors.displayName && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      {...profileForm.register("username")}
                      placeholder="Enter your username"
                      className={cn(
                        profileForm.formState.errors.username &&
                          "border-red-500"
                      )}
                    />
                    {profileForm.formState.errors.username && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Input
                      id="pronouns"
                      {...profileForm.register("pronouns")}
                      placeholder="e.g., they/them"
                      className={cn(
                        profileForm.formState.errors.pronouns &&
                          "border-red-500"
                      )}
                    />
                    <p className="text-sm text-muted-foreground">
                      Let others know how to refer to you.
                    </p>
                    {profileForm.formState.errors.pronouns && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.pronouns.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerUrl">Banner</Label>
                    <div className="flex flex-col items-start gap-4">
                      {banner && (
                        <div className="relative w-full">
                          <img
                            src={banner}
                            alt="Banner"
                            className="w-full h-32 object-cover border-2 border-border"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-2 w-full">
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBannerChange}
                          className="hidden"
                          id="banner-upload"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => bannerInputRef.current?.click()}
                            size="sm"
                          >
                            {banner ? "Change Banner" : "Upload Banner"}
                          </Button>
                          {banner && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveBanner}
                              size="sm"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Max 2MB, JPG/PNG/GIF/WEBP
                        </p>
                        {bannerError && (
                          <p className="text-sm text-red-500">{bannerError}</p>
                        )}
                        {profileForm.formState.errors.bannerUrl && (
                          <p className="text-sm text-red-500">
                            {profileForm.formState.errors.bannerUrl.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">About Me</Label>
                    <Textarea
                      id="bio"
                      {...profileForm.register("bio")}
                      placeholder="Tell others about yourself..."
                      className={cn(
                        "resize-none",
                        profileForm.formState.errors.bio && "border-red-500"
                      )}
                      rows={3}
                    />
                    <p className="text-sm text-muted-foreground">
                      You can use markdown and links if you'd like.
                    </p>
                    {profileForm.formState.errors.bio && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.bio.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={loading}>
                    Save Changes
                  </Button>
                </form>
              </div>
              <div className="w-[50%]">
                <Card className="w-full p-0 rounded-none shadow-lg">
                  <div className="relative">
                    {/* Mini Banner */}
                    <div className="h-20 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                      {banner || watchedBannerUrl ? (
                        <img
                          src={banner || watchedBannerUrl}
                          alt="Banner"
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="p-4 pt-3 space-y-3">
                      {/* Avatar and basic info */}
                      <div className="flex items-start gap-3 -mt-12 -ml-2">
                        <div className="relative rounded-none">
                          <Avatar className="w-20 h-20 border-[5px] border-background bg-background rounded-none after:border-none">
                            <AvatarImage
                              src={avatar || watchedAvatar}
                              alt={watchedDisplayName || "User"}
                              className="rounded-none border-none"
                            />
                            <AvatarFallback className="rounded-none border-none">
                              {(watchedDisplayName || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-none border-[5px] border-background",
                                getStatusColor(user?.status || "OFFLINE")
                              )}
                            />
                          </div>
                        </div>
                        {user?.status && (
                          <div className="bg-background border border-border rounded-lg px-3 py-2 z-[10] shadow-sm max-w-48 mt-10">
                            <p className="text-sm text-foreground truncate">
                              {user?.status}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        {/* Display Name and Username */}
                        <h3 className="font-bold leading-tight text-foreground text-xl truncate">
                          {watchedDisplayName || "Display Name"}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          @{watchedUsername || "username"}
                          {watchedPronouns && ` | ${watchedPronouns}`}
                        </p>
                      </div>

                      {/* Quick bio */}
                      <div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {watchedBio ||
                            "This user hasn't written anything about themselves yet."}
                        </p>
                      </div>

                      {/* Quick actions */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-9"
                        onClick={() => setActiveTab("profile")}
                      >
                        <IconSettings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Privacy & Safety</h3>
              <p className="text-muted-foreground mb-6">
                Control who can interact with you and how.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Direct Messages</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Allow direct messages from server members
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This setting is applied to each server individually.
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Message requests</p>
                      <p className="text-sm text-muted-foreground">
                        Allow message requests from users you don't share a
                        server with.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Friend Requests</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Who can send you friend requests</p>
                      <p className="text-sm text-muted-foreground">
                        Control who can send you friend requests.
                      </p>
                    </div>
                    <Select defaultValue="everyone">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="friends-of-friends">
                          Friends of Friends
                        </SelectItem>
                        <SelectItem value="server-members">
                          Server Members
                        </SelectItem>
                        <SelectItem value="none">No one</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow friend requests from server members</p>
                      <p className="text-sm text-muted-foreground">
                        This setting is applied to each server individually.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Data & Privacy</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Use data to improve Discord</p>
                      <p className="text-sm text-muted-foreground">
                        Allow Discord to use your data to improve the platform.
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Personalization</p>
                      <p className="text-sm text-muted-foreground">
                        Allow Discord to track app opens to personalize your
                        experience.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Appearance</h3>
              <p className="text-muted-foreground mb-6">
                Customize how Crystal looks for you.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Theme</h4>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-colors",
                      theme === "light" ? "border-primary" : "border-border",
                      "bg-white text-black"
                    )}
                  >
                    <div className="w-full h-16 bg-gray-100 rounded mb-2" />
                    <p className="text-sm font-medium">Light</p>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-colors",
                      theme === "dark" ? "border-primary" : "border-border",
                      "bg-gray-900 text-white"
                    )}
                  >
                    <div className="w-full h-16 bg-gray-800 rounded mb-2" />
                    <p className="text-sm font-medium">Dark</p>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-colors",
                      theme === "system" ? "border-primary" : "border-border",
                      "bg-gradient-to-r from-white to-gray-900 text-black"
                    )}
                  >
                    <div className="w-full h-16 bg-gradient-to-r from-gray-100 to-gray-800 rounded mb-2" />
                    <p className="text-sm font-medium">Sync with system</p>
                  </button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Chat Display</h4>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="font-medium">Chat Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Choose between Default chat mode or IRC-style chat mode.
                      </p>
                    </div>
                    <Card
                    onClick={() => updateCustomisation({
                      userId: user?.userId,
                      chatMode: "DEFAULT",
                    })}
                      className={`w-full bg-background px-4 cursor-pointer border-2 ${customisation?.chatMode === "DEFAULT" ? "border-primary" : "border-border"}`}
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, transparent, var(--card), var(--card)), url('/images/chat-default-toggle-header.png')",
                        backgroundPosition: "left",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <CardContent className="p-0 w-full flex flex-row items-center justify-end">
                        <span>Default mode</span>
                      </CardContent>
                    </Card>
                    <Card
                      onClick={() => updateCustomisation({
                        userId: user?.userId,
                        chatMode: "IRC",
                      })}
                      className={`w-full bg-background px-4 cursor-pointer border-2 ${customisation?.chatMode === "IRC" ? "border-primary" : "border-border"}`}
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, transparent, var(--card), var(--card)), url('/images/chat-irc-toggle-header.png')",
                        backgroundPosition: "left",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <CardContent className="p-0 w-full flex flex-row items-center justify-end">
                        <span>IRC mode</span>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compact Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Fit more messages on screen by reducing spacing.
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show timestamps</p>
                      <p className="text-sm text-muted-foreground">
                        Display message timestamps in chat.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Notifications</h3>
              <p className="text-muted-foreground mb-6">
                Choose what you get notified about.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">
                  Enable Desktop Notifications
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Direct Messages</p>
                    </div>
                    <Switch 
                      checked={notificationSettings?.directMessages ?? true}
                      onCheckedChange={async (checked) => {
                        if (user?.userId && updateNotificationSettings) {
                          await updateNotificationSettings({
                            userId: user.userId,
                            directMessages: checked,
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Server Messages</p>
                    </div>
                    <Switch 
                      checked={notificationSettings?.serverMessages ?? true}
                      onCheckedChange={async (checked) => {
                        if (user?.userId && updateNotificationSettings) {
                          await updateNotificationSettings({
                            userId: user.userId,
                            serverMessages: checked,
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Friend Requests</p>
                    </div>
                    <Switch 
                      checked={notificationSettings?.friendRequests ?? true}
                      onCheckedChange={async (checked) => {
                        if (user?.userId && updateNotificationSettings) {
                          await updateNotificationSettings({
                            userId: user.userId,
                            friendRequests: checked,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Sounds</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Message sounds</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Voice chat sounds</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Push Notifications</h4>
                <Select defaultValue="mentions">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All messages</SelectItem>
                    <SelectItem value="mentions">Only @mentions</SelectItem>
                    <SelectItem value="none">Nothing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "voice":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Voice & Video</h3>
              <p className="text-muted-foreground mb-6">
                Configure your microphone, camera, and other voice settings.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Input Device</h4>
                <Select defaultValue="default">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Default - System Default
                    </SelectItem>
                    <SelectItem value="microphone">
                      Built-in Microphone
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h4 className="font-medium mb-4">Output Device</h4>
                <Select defaultValue="default">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Default - System Default
                    </SelectItem>
                    <SelectItem value="speakers">Built-in Speakers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Camera</h4>
                <Select defaultValue="default">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Camera</SelectItem>
                    <SelectItem value="webcam">Built-in Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Voice Processing</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Echo Cancellation</p>
                      <p className="text-sm text-muted-foreground">
                        Removes echo from your microphone.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Noise Suppression</p>
                      <p className="text-sm text-muted-foreground">
                        Reduces background noise in your microphone.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Automatic Gain Control</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically adjusts your microphone volume.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Advanced</h3>
              <p className="text-muted-foreground mb-6">
                Advanced settings for power users.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Developer Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Developer Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Enables right-click copy ID and other developer
                        features.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Hardware Acceleration</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Hardware Acceleration</p>
                      <p className="text-sm text-muted-foreground">
                        Uses your GPU to make Discord smoother.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Reset</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    Reset Voice Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Reset Appearance Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">{activeTab}</h3>
              <p className="text-muted-foreground">
                This section is coming soon.
              </p>
            </div>
          </div>
        );
    }
  };

  const renderSidebar = () => {
    let currentCategory = "";
    return (
      <div className="space-y-1">
        {settingsTabs.map((tab) => {
          const showCategory = tab.category && tab.category !== currentCategory;
          if (showCategory && tab.category) {
            currentCategory = tab.category;
          }

          return (
            <div key={tab.id}>
              {showCategory && (
                <div className="px-2 py-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {tab.category}
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-1.5 text-sm font-medium rounded-md transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="h-[90%] border-border border-1 w-0 min-w-[70%]">
        <div className="flex flex-row w-full h-full min-h-0">
          {/* Sidebar */}
          <div className="flex flex-col w-1/4 p-4">
            <div className="flex items-center justify-between mb-6">
              <DialogTitle className="text-2xl font-bold">
                User Settings
              </DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto">{renderSidebar()}</div>
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  v1.0.0
                </Badge>
                <span>Build 12345</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col gap-1 p-4">
            <div className="p-4 flex-1 overflow-y-auto bg-background">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
