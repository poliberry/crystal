"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModal } from "@/hooks/use-modal-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { useEffect } from "react";

export const CreateDirectMessageModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "createDirectMessage";
  const { currentMember, currentProfile } = data;

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);

  useEffect(() => {
    if (isModalOpen && currentMember) {
      // Fetch available members (from same servers)
      fetchAvailableMembers();
    }
  }, [isModalOpen, currentMember]);

  const fetchAvailableMembers = async () => {
    try {
      const response = await axios.get(`/api/members/available/${currentMember.id}`);
      setAvailableMembers(response.data);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const filteredMembers = availableMembers.filter((member) =>
    member.profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.profile.globalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateDM = async (targetMemberId: string) => {
    try {
      setIsLoading(true);

      const response = await axios.post("/api/conversations/direct", {
        memberOneId: currentMember.id,
        memberTwoId: targetMemberId,
      });

      onClose();
      router.push(`/conversations/${response.data.id}`);
    } catch (error) {
      console.error("Error creating direct message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setAvailableMembers([]);
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#313338] p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Start a Direct Message
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Choose someone to send a direct message to
          </DialogDescription>
        </DialogHeader>

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
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-x-3 p-2 rounded-lg hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 cursor-pointer transition"
                onClick={() => handleCreateDM(member.id)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.profile.imageUrl} />
                  <AvatarFallback>
                    {member.profile.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium">
                    {member.profile.globalName || member.profile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{member.profile.name}
                  </p>
                </div>
                <MessageCircle className="w-4 h-4 ml-auto text-muted-foreground" />
              </div>
            ))}
            {filteredMembers.length === 0 && searchTerm && (
              <div className="text-center py-6 text-muted-foreground">
                <p>No users found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="bg-gray-100 dark:bg-[#2b2d31] px-6 py-4">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
