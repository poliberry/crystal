"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useModal } from "@/hooks/use-modal-store";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const DeleteMessageModal = () => {
  const { isOpen, onClose, type, data } = useModal();

  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "deleteMessage";

  const { messageId, messageType } = data;
  
  // Use the appropriate mutation based on message type
  const removeChannelMessage = useMutation(api.messages.remove);
  const removeDirectMessage = useMutation(api.directMessages.remove);

  const onClick = async () => {
    try {
      setIsLoading(true);
      
      if (!messageId || !messageType) {
        console.error("Missing messageId or messageType");
        return;
      }

      if (messageType === "messages") {
        await removeChannelMessage({ 
          messageId: messageId as Id<"messages"> 
        });
      } else if (messageType === "directMessages") {
        await removeDirectMessage({ 
          messageId: messageId as Id<"directMessages"> 
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
    <Drawer open={isModalOpen} onOpenChange={onClose} direction="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-center font-bold">
            Delete Message
          </DrawerTitle>

          <DrawerDescription className="text-center">
            Are you sure you want to do this? <br />
            The message will be permanently deleted.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerFooter>
          <div className="flex items-center justify-between w-full">
            <Button
              disabled={isLoading}
              aria-disabled={isLoading}
              onClick={onClose}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={isLoading}
              aria-disabled={isLoading}
              onClick={onClick}
              variant="destructive"
            >
              Confirm
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
