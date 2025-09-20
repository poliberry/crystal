"use client";

import { type ChannelType } from "@prisma/client";
import { Plus, Settings, ChevronUp, ChevronDown, Edit, Trash } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import type { ServerWithMembersWithProfiles } from "@/types";
import { PermissionType } from "@/types/permissions";
import { useCrystalPermissions } from "@/hooks/use-crystal-permissions";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type ServerSectionProps = {
  label: string;
  member?: any;
  sectionType: "channels" | "members" | "category";
  channelType?: ChannelType;
  categoryId?: string;
  server?: ServerWithMembersWithProfiles;
  categoryIndex?: number;
  totalCategories?: number;
  onMoveCategoryUp?: (categoryId: string) => void;
  onMoveCategoryDown?: (categoryId: string) => void;
};

export const ServerSection = ({
  label,
  member,
  sectionType,
  channelType,
  categoryId,
  server,
  categoryIndex = 0,
  totalCategories = 1,
  onMoveCategoryUp,
  onMoveCategoryDown,
}: ServerSectionProps) => {
  const { onOpen } = useModal();
  
  const { permissions } = useCrystalPermissions(member?.id);
  
  // Extract permission checks for easier use
  const canManageChannels = permissions.canManageChannels;
  const canManageMembers = permissions.canManageRoles;

  const sectionContent = (
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

  // For categories, wrap in context menu
  if (sectionType === "category" && canManageChannels && categoryId) {
    // Don't show move options for fallback categories (they have string IDs like 'fallback-text')
    const isFallbackCategory = categoryId.startsWith('fallback-');
    
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          {sectionContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {!isFallbackCategory && categoryIndex > 0 && onMoveCategoryUp && (
            <ContextMenuItem
              onClick={() => onMoveCategoryUp(categoryId)}
            >
              <ChevronUp className="w-4 h-4 mr-2" />
              Move Category Up
            </ContextMenuItem>
          )}
          {!isFallbackCategory && categoryIndex < totalCategories - 1 && onMoveCategoryDown && (
            <ContextMenuItem
              onClick={() => onMoveCategoryDown(categoryId)}
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Move Category Down
            </ContextMenuItem>
          )}
          {!isFallbackCategory && ((categoryIndex > 0 && onMoveCategoryUp) || (categoryIndex < totalCategories - 1 && onMoveCategoryDown)) && (
            <ContextMenuSeparator />
          )}
          <ContextMenuItem
            onClick={() => {
              // TODO: Add editCategory modal type
              // onOpen("editCategory", { categoryId })
            }}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Category
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-500"
            onClick={() => {
              // TODO: Add deleteCategory modal type
              // onOpen("deleteCategory", { categoryId })
            }}
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete Category
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return sectionContent;
};
