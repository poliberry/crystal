"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModal } from "@/hooks/use-modal-store";
import { useOrigin } from "@/hooks/use-origin";
import { ActionTooltip } from "../action-tooltip";
import { useAuthStore } from "@/lib/auth-store";

export const InviteModal = () => {
  const { isOpen, onOpen, onClose, type, data } = useModal();
  const origin = useOrigin();
  const { user } = useAuthStore();
  const regenerateInviteCode = useMutation(api.servers.regenerateInviteCode);

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "invite";

  const { server } = data;
  const inviteUrl = `${origin}/invite/${server?.inviteCode}`;

  const onCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  const onNew = async () => {
    try {
      setIsLoading(true);

      const serverId = (server as any)?._id || (server as any)?.id;
      const updatedServer = await regenerateInviteCode({
        serverId: serverId as any,
        userId: user?.userId,
      });

      if (updatedServer) {
        onOpen("invite", { server: updatedServer as any });
      }
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
            Invite Friends
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-6">
          <Label className="uppercase text-xs font-bold text-zinc-500">
            Server invite link
          </Label>

          <div className="flex items-center mt-2 gap-x-2">
            <Input
              className="bg-zinc-300/30 dark:bg-zinc-300/10 text-black dark:text-white cursor-pointer pointer-events-none"
              tabIndex={-1}
              value={inviteUrl}
              disabled={isLoading}
              aria-disabled
            />
            <ActionTooltip
              side="left"
              align="end"
              label={copied ? "Copied" : "Copy to clipboard"}
            >
              <Button
                disabled={isLoading}
                aria-disabled={isLoading}
                onClick={onCopy}
                size="icon"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </ActionTooltip>
          </div>

          <Button
            disabled={isLoading}
            aria-disabled={isLoading}
            onClick={onNew}
            variant="link"
            size="sm"
            className="text-xs text-zinc-500 mt-4"
          >
            Generate a new link
            <RefreshCw className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
