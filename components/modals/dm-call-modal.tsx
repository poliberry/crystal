"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { Avatar, AvatarImage } from "../ui/avatar";
import { useSocket } from "../providers/socket-provider";
import { useLiveKit } from "../providers/media-room-provider";
import { shouldReceiveCallAlerts } from "@/hooks/use-dnd-status";
import { useUser } from "@clerk/nextjs";

export const DMCallModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { socket } = useSocket();
  const { joinConversation } = useLiveKit();
  const { user } = useUser();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "dmCall";

  const { callData } = data;

  useEffect(() => {
    if (isModalOpen) {
      // Check if user should receive call alerts (including ringtone)
      const userStatus = user?.publicMetadata?.presence as string || localStorage.getItem("user-presence-status");
      
      if (shouldReceiveCallAlerts(userStatus)) {
        // Create audio element
        audioRef.current = new Audio("/sounds/incoming-call.ogg"); // Add your sound file to public/sounds/
        audioRef.current.loop = true; // Loop the sound
        audioRef.current.volume = 0.7; // Set volume (0-1)

        // Play the sound
        audioRef.current.play().catch((error) => {
          console.error("Error playing sound:", error);
        });
      }
    }

    // Cleanup: stop sound when modal closes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [isModalOpen, user?.publicMetadata?.presence]);

  const handleAccept = async () => {
    try {
      setIsLoading(true);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Emit call accepted event
      if (socket && callData) {
        socket.emit("call:accepted", {
          conversationId: callData.conversationId,
          type: callData.type,
        });
      }

      onClose();

      // Join the LiveKit room directly
      if (callData) {
        const isVideo = callData.type === "video";
        
        // Join the conversation call
        await joinConversation(
          callData.conversationId,
          callData.conversationName || "Call",
          true, // always enable audio
          isVideo // enable video only if it's a video call
        );

        // Navigate to conversation with call parameters
        const queryParam = isVideo ? "video=true" : "audio=true";
        router.push(`/conversations/${callData.conversationId}?${queryParam}`);
      }
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };  const handleDecline = async () => {
    try {
      setIsLoading(true);

      // Stop the sound when declining
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Emit call declined event to disconnect all users from the room
      if (socket && callData) {
        socket.emit("call:declined", {
          conversationId: callData.conversationId,
          type: callData.type,
        });
      }

      onClose();
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleDecline}>
      <DialogContent className="p-0 flex flex-col justify-center overflow-hidden">
        <div className="flex flex-col w-full h-64 items-center justify-center">
          <Avatar className="w-20 h-20 mb-4 animate-pulse">
            <AvatarImage src={callData?.caller.avatar} />
          </Avatar>
          <DialogTitle className="text-lg font-semibold">
            {callData?.type === "video" ? "Video call" : "Voice call"} from {callData?.caller.name}
          </DialogTitle>
        </div>
        <DialogFooter className="px-6 py-4">
          <div className="flex items-center justify-between gap-2 w-full">
            <Button
              disabled={isLoading}
              aria-disabled={isLoading}
              onClick={handleDecline}
              variant="destructive"
              className="w-full"
            >
              Decline
            </Button>
            <Button
              disabled={isLoading}
              aria-disabled={isLoading}
              onClick={handleAccept}
              variant="primary"
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              Accept
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
