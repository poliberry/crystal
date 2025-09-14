"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useUser } from "@clerk/nextjs";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { currentProfile } from "@/lib/current-profile";
import { Profile } from "@prisma/client";
import { useSocket } from "../providers/socket-provider";
import { Avatar, AvatarImage } from "../ui/avatar";

const profileSchema = z.object({
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
  bannerUrl: z.string().url("Invalid URL").optional(),
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
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const isModalOpen = isOpen && type === "userSettings";

  const getProfile = async () => {
    const response = await axios.get(`/api/profile`);
    console.log(response.data);
    setProfile({
      id: response.data.id,
      globalName: response.data.globalName,
      name: response.data.name,
      bio: response.data.bio,
      pronouns: response.data.pronouns,
      bannerUrl: response.data.bannerUrl,
    });

    profileForm.setValue("displayName", profile?.globalName);
    profileForm.setValue("username", profile?.name);
    profileForm.setValue("bio", profile?.bio);
    profileForm.setValue("pronouns", profile?.pronouns);
    profileForm.setValue("bannerUrl", profile?.bannerUrl || "");
  };

  useEffect(() => {
    getProfile();
  }, []);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.globalName,
      username: profile?.name,
      bio: profile?.bio,
      pronouns: profile?.pronouns,
      bannerUrl: profile?.bannerUrl || "",
    },
  });

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

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      setLoading(true);
      // API call to update profile
      await axios.patch("/api/user", values);
    } catch (error) {
      console.error(error);
    } finally {
      await Promise.all([
        await axios.post("/api/socket/update-room-profile", {
          name: values.displayName,
        }),
        await axios.post("/api/socket/poll-members"),
      ]).then(() => {
        setLoading(false);
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 headerFont">My Account</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 rounded-full">
                    <AvatarImage
                      src={profile?.imageUrl || user?.imageUrl}
                      alt={profile?.globalName || profile?.name || "User Avatar"}
                    />
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">
                      {profile?.globalName || profile?.name}
                    </h4>
                    <p className="text-muted-foreground">@{profile?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.primaryEmailAddress?.emailAddress}
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
        return (
          <div onLoad={getProfile} className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Profile</h3>
              <p className="text-muted-foreground mb-6">
                This information will be visible to other users.
              </p>
            </div>

            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={profileForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your display name"
                          required={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter your username" disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="pronouns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pronouns</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., they/them" required={false} />
                      </FormControl>
                      <FormDescription>
                        Let others know how to refer to you.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bannerUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your banner image URL"
                          required={false}
                        />
                      </FormControl>
                      <FormDescription>
                        Due to upload restrictions, you will need to host the
                        image yourself, and provide the link here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Me</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell others about yourself..."
                          className="resize-none"
                          rows={3}
                          required={false}
                        />
                      </FormControl>
                      <FormDescription>
                        You can use markdown and links if you'd like.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={loading}>
                  Save Changes
                </Button>
              </form>
            </Form>
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
                <Select defaultValue="everyone">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="friends-of-friends">
                      Friends of Friends
                    </SelectItem>
                    <SelectItem value="none">No one</SelectItem>
                  </SelectContent>
                </Select>
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
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Server Messages</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Friend Requests</p>
                    </div>
                    <Switch defaultChecked />
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
          if (showCategory) {
            currentCategory = tab.category || "";
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
                  getProfile();
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
      <DialogContent className="p-0 overflow-hidden max-w-full h-full rounded-none border-none">
        <div className="flex flex-row w-full h-full">
          {/* Sidebar */}
          <div className="flex flex-col w-1/4 p-4 border-r border-border bg-gradient-to-b from-white dark:from-black to-blue-300 dark:to-[#000226]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold headerFont uppercase">User Settings</h2>
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
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-black">{renderTabContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
