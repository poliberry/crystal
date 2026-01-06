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
import { useLiveKit } from "../providers/media-room-provider";
import { shouldReceiveCallAlerts } from "@/hooks/use-dnd-status";
import { useAuthStore } from "@/lib/auth-store";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "../ui/drawer";

export const DMCallModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { joinConversation } = useLiveKit();
  const { user } = useAuthStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "dmCall";

  const { callData } = data;

  useEffect(() => {
    if (isModalOpen) {
      // Check if user should receive call alerts (including ringtone)
      const statusFromStorage = localStorage.getItem("user-presence-status");
      const userStatus = user?.status || statusFromStorage;

      // shouldReceiveCallAlerts expects an object with status property
      const statusObj = userStatus ? { status: userStatus } : null;

      if (shouldReceiveCallAlerts(statusObj)) {
        // Create audio element
        audioRef.current = new Audio("/sounds/incomg-call.wav");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;

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
  }, [isModalOpen, user?.status]);

  const handleAccept = async () => {
    try {
      setIsLoading(true);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
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
  };

  const handleDecline = async () => {
    try {
      setIsLoading(true);

      // Stop the sound when declining
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      onClose();
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no call data
  if (!callData || !callData.caller) {
    return null;
  }

  return (
    <Drawer open={isModalOpen} onOpenChange={handleDecline}>
      <DrawerContent className="p-0 flex flex-col justify-center overflow-hidden w-1/2 mx-auto border-border border-1">
        <div className="flex flex-col w-full h-64 items-center justify-center px-6">
          <Avatar className="w-20 h-20 mb-4 animate-pulse ring-2 ring-primary">
            <AvatarImage
              src={callData.caller.avatar || "/logo.png"}
              alt={callData.caller.name}
            />
          </Avatar>
          <DrawerTitle className="text-lg font-semibold text-center">
            {callData.type === "video" ? "Video call" : "Voice call"} from{" "}
            <span className="text-primary">
              {callData.caller.name || "Unknown"}
            </span>
          </DrawerTitle>
          {callData.conversationName && (
            <DrawerDescription className="text-sm text-muted-foreground mt-2">
              {callData.conversationName}
            </DrawerDescription>
          )}
        </div>
        <DrawerFooter className="px-6 py-4 border-t border-border flex flex-row gap-2 items-center justify-center">
          <Button
            disabled={isLoading}
            aria-disabled={isLoading}
            onClick={handleDecline}
            variant="destructive"
            className="w-fit"
          >
            Decline
          </Button>
          <Button
            disabled={isLoading}
            aria-disabled={isLoading}
            onClick={handleAccept}
            variant="default"
            className="w-fit"
          >
            Accept
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
