"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChannelType } from "@/types/conversation";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import qs from "query-string";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModal } from "@/hooks/use-modal-store";
import { useLiveKit } from "../providers/media-room-provider";

export const SwitchVoiceChannelModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const { channel, server } = data;
  const media = useLiveKit();
  const params = useParams();
  const router = useRouter();

  const isModalOpen = isOpen && type === "switchVoiceChannel";

  const handleClose = () => {
    onClose();
  };

  const switchChannel = async () => {
    media.leave();
    onClose();
    setTimeout(() => {
      const call_switch = new Audio("/sounds/call-switch.ogg");
      call_switch.play();
      media.join(channel?.id as string, channel?.name as string, server?.name as string, server?.id as string, "channel", true, false);
      router.push(`/servers/${params?.serverId}/channels/${channel?.id}`)
    }, 500);
  }

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-left font-bold">
            Are you sure?
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-6 flex flex-col items-center gap-4">
          <span className="text-left">Looks like you are already in a voice channel. Are you sure you want to switch to <b>{channel?.name}</b>?</span>
          <Button
            variant="default"
            className="self-end"
            onClick={() => switchChannel()}
          >
            Switch channel
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
