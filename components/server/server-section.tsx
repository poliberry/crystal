"use client";

import { type ChannelType } from "@prisma/client";
import { Plus, Settings } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import type { ServerWithMembersWithProfiles } from "@/types";
import { PermissionType } from "@/types/permissions";
import { useServerPermissions } from "@/hooks/use-permissions";

type ServerSectionProps = {
  label: string;
  member?: any;
  sectionType: "channels" | "members" | "category";
  channelType?: ChannelType;
  categoryId?: string;
  server?: ServerWithMembersWithProfiles;
};

export const ServerSection = ({
  label,
  member,
  sectionType,
  channelType,
  categoryId,
  server,
}: ServerSectionProps) => {
  const { onOpen } = useModal();
  
  const permissions = useServerPermissions(member?.id || '');
  
  // Extract permission checks for easier use
  const canManageChannels = permissions.getPermission(PermissionType.MANAGE_CHANNELS).granted;
  const canManageMembers = permissions.getPermission(PermissionType.MANAGE_ROLES).granted;
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </p>

      {canManageChannels && sectionType === "category" && (
        <ActionTooltip label="Create Channel" side="top">
          <button
            onClick={() => onOpen("createChannel", { channelType, categoryId })}
            className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        </ActionTooltip>
      )}

      {canManageMembers && sectionType === "members" && (
        <ActionTooltip label="Manage Members" side="top">
          <button
            onClick={() => onOpen("members", { server })}
            className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </ActionTooltip>
      )}
    </div>
  );
};
