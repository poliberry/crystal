"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
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
import { useAuthStore } from "@/lib/auth-store";

export const DeleteChannelModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { user } = useAuthStore();
  const deleteChannel = useMutation(api.channels.remove);

  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "deleteChannel";

  const { server, channel } = data;

  const onClick = async () => {
    try {
      setIsLoading(true);

      const channelId = (channel as any)?._id || (channel as any)?.id;
      await deleteChannel({ channelId: channelId as any, userId: user?.userId });

      onClose();
      router.refresh();
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
            Delete Channel
          </DrawerTitle>

          <DrawerDescription className="text-center">
            Are you sure you want to do this? <br />
            <span className="text-indigo-500 font-semibold">
              #{channel?.name}
            </span>{" "}
            will be permanently deleted.
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
