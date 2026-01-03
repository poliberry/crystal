"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
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
import { Search, Users, Check, X } from "lucide-react";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export const CreateGroupModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { user } = useAuthStore();
  const createGroupConversation = useMutation(api.conversations.createGroup);

  const isModalOpen = isOpen && type === "createGroup";
  const { currentMember, currentProfile } = data;

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const availableMembers = useQuery(
    api.friends.getFriends,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const filteredMembers = (availableMembers || []).filter((member) => {
    if (!member) return false;
    if (!searchTerm.trim()) return true; // Show all friends when search is empty
    const searchLower = searchTerm.toLowerCase();
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.globalName?.toLowerCase().includes(searchLower)
    );
  });

  const toggleMemberSelection = (profileId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleCreateGroup = async () => {
    try {
      setIsLoading(true);

      if (selectedMembers.length === 0) {
        // If no members selected, just create a DM with the first available member
        return;
      }

      const conversation = await createGroupConversation({
        name: groupName.trim() || undefined,
        memberIds: selectedMembers as any[],
        userId: user?.userId,
      });

      if (conversation) {
        onClose();
        router.push(`/conversations/${conversation._id}`);
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setGroupName("");
    setSelectedMembers([]);
    onClose();
  };

  const canCreate = selectedMembers.length >= 1;

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent className="bg-white dark:bg-[#313338]">
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-center font-bold">
            Create a Group
          </DrawerTitle>
          <DrawerDescription className="text-center text-zinc-500">
            Add friends to start a group conversation
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 space-y-4">
          {/* Group Name */}
          <div>
            <Label className="text-xs font-bold text-zinc-500 dark:text-secondary/70 uppercase">
              Group Name (Optional)
            </Label>
            <Input
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-1"
              disabled={isLoading}
            />
          </div>

          {/* Search */}
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
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div>
              <Label className="text-xs font-bold text-zinc-500 dark:text-secondary/70 uppercase">
                Selected ({selectedMembers.length})
              </Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedMembers.map((profileId) => {
                  const member = availableMembers?.find((m) => m?._id === profileId) as any;
                  if (!member) return null;
                  
                  return (
                    <div
                      key={profileId}
                      className="flex items-center gap-1 bg-indigo-500 text-white px-2 py-1 rounded-full text-xs"
                    >
                      <span>{member.globalName || member.name}</span>
                      <button
                        onClick={() => toggleMemberSelection(profileId)}
                        className="hover:bg-indigo-600 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[200px] px-6">
          <div className="space-y-2">
            {filteredMembers.map((member) => {
              const isSelected = selectedMembers.includes(member?._id || "");
              if (!member) return null;
              
              return (
                <div
                  key={member._id}
                  className="flex items-center gap-x-3 p-2 rounded-lg hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 cursor-pointer transition"
                  onClick={() => toggleMemberSelection(member._id)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'bg-indigo-500 border-indigo-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.imageUrl} />
                    <AvatarFallback>
                      {member.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <p className="text-sm font-medium">
                      {member.globalName || member.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{member.name}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
              );
            })}
            {filteredMembers.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p>
                  {searchTerm 
                    ? "No users found" 
                    : availableMembers === undefined 
                      ? "Loading..." 
                      : availableMembers.length === 0 
                        ? "No friends available. Add friends to create a group."
                        : "No users found"}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="bg-gray-100 dark:bg-[#2b2d31]">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateGroup} 
            disabled={isLoading || !canCreate}
            className="bg-indigo-500 hover:bg-indigo-600"
          >
            {isLoading ? (
              <>Creating...</>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
