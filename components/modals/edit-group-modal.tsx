"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModal } from "@/hooks/use-modal-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, X, UserPlus, UserMinus } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { FileUpload } from "@/components/file-upload";
import { Id } from "@/convex/_generated/dataModel";

export const EditGroupModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { user } = useAuthStore();
  const updateGroup = useMutation(api.conversations.updateGroup);
  const addMembers = useMutation(api.conversations.addMembers);
  const removeMember = useMutation(api.conversations.removeMember);

  const isModalOpen = isOpen && type === "editGroup";
  const { conversation } = data;

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupName, setGroupName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);

  // Get conversation ID from data or conversation object
  const conversationId = conversation?._id || (conversation as any)?.id || data?.conversationId;

  // Get conversation details
  const conversationData = useQuery(
    api.conversations.getById,
    conversationId && user?.userId
      ? { conversationId: conversationId as Id<"conversations">, userId: user.userId }
      : "skip"
  );

  // Get friends for adding
  const availableFriends = useQuery(
    api.friends.getFriends,
    user?.userId ? { userId: user.userId } : "skip"
  );

  // Initialize form with conversation data
  useEffect(() => {
    if (conversationData) {
      setGroupName(conversationData.name || "");
      setImageUrl(conversationData.imageUrl || null);
    }
  }, [conversationData]);

  // Get current members (excluding current user for adding)
  const currentMemberIds = conversationData?.members
    ?.map((m: any) => m.profile?._id)
    .filter(Boolean) || [];

  const friendsToAdd = (availableFriends || []).filter(
    (friend) => friend && !currentMemberIds.includes(friend._id)
  );

  const filteredFriends = friendsToAdd.filter((friend) => {
    if (!friend) return false;
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      friend.name?.toLowerCase().includes(searchLower) ||
      friend.globalName?.toLowerCase().includes(searchLower)
    );
  });

  const toggleMemberSelection = (profileId: string) => {
    setSelectedMembersToAdd((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleUpdateGroup = async () => {
    if (!conversationId || !user?.userId) return;

    try {
      setIsLoading(true);
      await updateGroup({
        conversationId: conversationId as Id<"conversations">,
        name: groupName.trim() || undefined,
        imageUrl: imageUrl === "" ? null : (imageUrl || null),
        userId: user.userId,
      });
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Error updating group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!conversationId || !user?.userId || selectedMembersToAdd.length === 0) return;

    try {
      setIsLoading(true);
      await addMembers({
        conversationId: conversationId as Id<"conversations">,
        memberIds: selectedMembersToAdd as Id<"profiles">[],
        userId: user.userId,
      });
      setSelectedMembersToAdd([]);
      setSearchTerm("");
      router.refresh();
    } catch (error) {
      console.error("Error adding members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (profileId: string) => {
    if (!conversationId || !user?.userId) return;

    try {
      setIsLoading(true);
      await removeMember({
        conversationId: conversationId as Id<"conversations">,
        profileId: profileId as Id<"profiles">,
        userId: user.userId,
      });
      router.refresh();
    } catch (error) {
      console.error("Error removing member:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setGroupName("");
    setImageUrl(null);
    setSelectedMembersToAdd([]);
    onClose();
  };

  const currentUserProfileId = conversationData?.members?.find(
    (m: any) => m.profile?.userId === user?.userId
  )?.profile?._id;

  // Show loading state
  if (conversationData === undefined) {
    return (
      <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
        <DrawerContent className="bg-white dark:bg-[#313338] max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-2xl text-center font-bold">
              Edit Group
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Show error state if conversation not found or not a group
  if (!conversationData || conversationData.type !== "GROUP_MESSAGE") {
    return (
      <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
        <DrawerContent className="bg-white dark:bg-[#313338] max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-2xl text-center font-bold">
              Edit Group
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Group not found or not a group conversation.</p>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent className="bg-white dark:bg-[#313338] max-h-[90vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0 pb-2">
          <DrawerTitle className="text-2xl text-center font-bold">
            Edit Group
          </DrawerTitle>
          <DrawerDescription className="text-center text-zinc-500">
            Manage group settings and members
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div className="space-y-6 py-4">
            {/* Group Icon */}
            <div>
              <Label className="text-xs font-bold text-zinc-500 dark:text-secondary/70 uppercase">
                Group Icon
              </Label>
              <div className="flex items-center justify-center mt-2">
                <FileUpload
                  endpoint="serverImage"
                  value={imageUrl || ""}
                  onChange={(value) => setImageUrl(value || null)}
                />
              </div>
              {imageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageUrl(null)}
                  className="mt-2 text-xs"
                >
                  Remove icon
                </Button>
              )}
            </div>

            {/* Group Name */}
            <div>
              <Label className="text-xs font-bold text-zinc-500 dark:text-secondary/70 uppercase">
                Group Name
              </Label>
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            {/* Current Members */}
            <div>
              <Label className="text-xs font-bold text-zinc-500 dark:text-secondary/70 uppercase">
                Members ({conversationData?.members?.length || 0})
              </Label>
              <div className="space-y-2 mt-2">
                {conversationData?.members?.map((member: any) => {
                  const profile = member.profile;
                  if (!profile) return null;
                  const isCurrentUser = profile._id === currentUserProfileId;
                  const canRemove = !isCurrentUser;

                  return (
                    <div
                      key={member._id}
                      className="flex items-center gap-x-3 p-2 rounded-lg hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile.imageUrl} />
                        <AvatarFallback>
                          {profile.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1">
                        <p className="text-sm font-medium">
                          {profile.globalName || profile.name}
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground ml-2">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{profile.name}
                        </p>
                      </div>
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(profile._id)}
                          disabled={isLoading}
                          className="h-8 w-8"
                        >
                          <UserMinus className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Members */}
            <div>
              <Label className="text-xs font-bold text-zinc-500 dark:text-secondary/70 uppercase">
                Add Friends
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search for users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>

              {/* Selected Members to Add */}
              {selectedMembersToAdd.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedMembersToAdd.map((profileId) => {
                      const friend = availableFriends?.find((f) => f?._id === profileId);
                      if (!friend) return null;

                      return (
                        <div
                          key={profileId}
                          className="flex items-center gap-1 bg-indigo-500 text-white px-2 py-1 rounded-full text-xs"
                        >
                          <span>{friend.globalName || friend.name}</span>
                          <button
                            onClick={() => toggleMemberSelection(profileId)}
                            className="hover:bg-indigo-600 rounded-full p-0.5"
                            disabled={isLoading}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    onClick={handleAddMembers}
                    disabled={isLoading || selectedMembersToAdd.length === 0}
                    className="mt-2 bg-indigo-500 hover:bg-indigo-600"
                    size="sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add {selectedMembersToAdd.length} member{selectedMembersToAdd.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}

              {/* Friends List */}
              {filteredFriends.length > 0 && (
                <ScrollArea className="mt-2 max-h-[200px]">
                  <div className="space-y-2 pr-4">
                    {filteredFriends.map((friend) => {
                      if (!friend) return null;
                      const isSelected = selectedMembersToAdd.includes(friend._id);

                      return (
                        <div
                          key={friend._id}
                          className="flex items-center gap-x-3 p-2 rounded-lg hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 cursor-pointer transition"
                          onClick={() => toggleMemberSelection(friend._id)}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={friend.imageUrl} />
                            <AvatarFallback>
                              {friend.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1">
                            <p className="text-sm font-medium">
                              {friend.globalName || friend.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{friend.name}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              {filteredFriends.length === 0 && searchTerm && (
                <div className="text-center py-4 text-muted-foreground text-sm mt-2">
                  No friends found
                </div>
              )}
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-shrink-0 bg-gray-100 dark:bg-[#2b2d31] border-t mt-auto">
          <div className="flex items-center justify-between w-full gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={isLoading}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

