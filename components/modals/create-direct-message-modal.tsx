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
import { Search, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export const CreateDirectMessageModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { user } = useAuthStore();
  const createDirectConversation = useMutation(api.conversations.createDirect);

  const isModalOpen = isOpen && type === "createDirectMessage";
  const { currentMember, currentProfile } = data;

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const availableFriends = useQuery(
    api.friends.getFriends,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const filteredMembers = (availableFriends || []).filter((friend) =>
    friend?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend?.globalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateDM = async (targetProfileId: string) => {
    try {
      setIsLoading(true);

        const conversation = await createDirectConversation({
          otherProfileId: targetProfileId as any,
          userId: user?.userId,
        });

      if (conversation) {
        onClose();
        router.push(`/conversations/${conversation._id}`);
      }
    } catch (error) {
      console.error("Error creating direct message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    onClose();
  };

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent className="bg-white dark:bg-[#313338]">
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-center font-bold">
            Start a Direct Message
          </DrawerTitle>
          <DrawerDescription className="text-center text-zinc-500">
            Choose someone to send a direct message to
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6">
          <div className="relative">
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

        <ScrollArea className="max-h-[300px] px-6">
          <div className="space-y-2">
            {filteredMembers.map((friend) => {
              if (!friend) return null;
              return (
                <div
                  key={friend._id}
                  className="flex items-center gap-x-3 p-2 rounded-lg hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 cursor-pointer transition"
                  onClick={() => handleCreateDM(friend._id)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={friend.imageUrl} />
                    <AvatarFallback>
                      {friend.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">
                      {friend.globalName || friend.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{friend.name}
                    </p>
                  </div>
                  <MessageCircle className="w-4 h-4 ml-auto text-muted-foreground" />
                </div>
              );
            })}
            {filteredMembers.length === 0 && searchTerm && (
              <div className="text-center py-6 text-muted-foreground">
                <p>No users found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="bg-gray-100 dark:bg-[#2b2d31]">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
