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

export const LeaveServerModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { user } = useAuthStore();
  const leaveServer = useMutation(api.servers.leave);

  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "leaveServer";

  const { server } = data;

  const onClick = async () => {
    try {
      setIsLoading(true);

      const serverId = (server as any)?._id || (server as any)?.id;
      await leaveServer({ serverId: serverId as any, userId: user?.userId });

      onClose();
      router.refresh();
      router.push("/");
    } catch (error: unknown) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={isModalOpen} onOpenChange={onClose} direction="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-center font-bold">
            Leave Server
          </DrawerTitle>

          <DrawerDescription className="text-center">
            Are you sure you want to leave{" "}
            <span className="font-semibold text-indigo-500">
              {server?.name}
            </span>
            .
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
