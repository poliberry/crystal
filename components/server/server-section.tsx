"use client";
  
import { Plus, Settings } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { ChannelType } from "@/types/conversation";
import { IconSettingsBolt } from "@tabler/icons-react";

type ServerSectionProps = {
  label: string;
  role?: string;
  sectionType: "channels" | "members" | "category";
  channelType?: string;
  categoryId?: string;
  server?: any;
};

export const ServerSection = ({
  label,
  role,
  sectionType,
  channelType,
  categoryId,
  server,
}: ServerSectionProps) => {
  const { onOpen } = useModal();
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </p>

      {role !== "GUEST" && sectionType === "category" && (
        <ActionTooltip label="Create Channel" side="top">
          <button
            onClick={() => onOpen("createChannel", { channelType: channelType as ChannelType | undefined, categoryId })}
            className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        </ActionTooltip>
      )}

      {role === "ADMIN" && sectionType === "members" && (
        <ActionTooltip label="Manage Members" side="top">
          <button
            onClick={() => onOpen("members", { server })}
            className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
          >
            <IconSettingsBolt className="h-4 w-4" />
          </button>
        </ActionTooltip>
      )}
    </div>
  );
};
