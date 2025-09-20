"use client";

import { 
  ChevronDown,
  FolderPlus,
  LogOut,
  PlusCircle,
  Settings,
  Trash,
  UserPlus,
  Users,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";
import { useCrystalPermissions } from "@/hooks/use-crystal-permissions";
import type { ServerWithMembersWithProfiles } from "@/types";
import { Card, CardContent } from "../ui/card";

type ServerHeaderProps = {
  server: ServerWithMembersWithProfiles;
  member: any;
  canManageChannels?: boolean;
};

export const ServerHeader = ({ server, member, canManageChannels }: ServerHeaderProps) => {
  const { onOpen } = useModal();
  
  // Debug logging
  console.log('[ServerHeader] Member prop:', member);
  console.log('[ServerHeader] Member ID:', member?.id);
  
  // Use the new Crystal permission system
  const { permissions, loading } = useCrystalPermissions(member?.id);

  if (loading) {
    return (
      <div className="relative w-full max-w-md h-32 overflow-hidden z-[10]">
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative w-full max-w-md h-32 overflow-hidden z-[10]">
          {/* Background Image */}
          <img
            src={server.imageUrl}
            alt="Card Background"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Transparent to black gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent dark:via-black/50 via-white/50 dark:to-black to-white" />

          {/* Card content on top */}
          <Card className="relative bg-transparent border-none shadow-none h-full">
            <CardContent className="h-full flex flex-col justify-end text-black dark:text-white p-3">
              <div className="flex flex-row justify-between items-center w-full">
              <h2 className="text-md font-semibold">{server.name}</h2>
              <ChevronDown />
              </div>
            </CardContent>
          </Card>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 text-xs font-medium text-black dark:text-neutral-400 space-y-[2px]">
        {permissions.canInviteMembers && (
          <DropdownMenuItem
            onClick={() => onOpen("invite", { server })}
            className="text-indigo-600 dark:text-indigo-400 px-3 py-2 text-sm cursor-pointer"
          >
            Invite People
            <UserPlus className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {permissions.canManageServer && (
          <DropdownMenuItem
            onClick={() => onOpen("enhancedServerSettings", { server, currentMember: member })}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Server Settings
            <Settings className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {permissions.canManageMembers && (
          <DropdownMenuItem
            onClick={() => onOpen("members", { server })}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Manage Members
            <Users className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {permissions.canCreateChannels && (
          <DropdownMenuItem
            onClick={() => onOpen("createChannel")}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Create Channel
            <PlusCircle className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {permissions.canManageCategories && (
          <DropdownMenuItem
            onClick={() => onOpen("createCategory")}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Create Category
            <FolderPlus className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {(permissions.canManageChannels || permissions.canManageServer || permissions.canManageMembers) && <DropdownMenuSeparator />}
        {(permissions.canDeleteServer || permissions.isServerOwner) && (
          <DropdownMenuItem
            onClick={() => onOpen("deleteServer", { server })}
            className="text-rose-500 px-3 py-2 text-sm cursor-pointer"
          >
            Delete Server
            <Trash className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {!permissions.isServerOwner && !permissions.isAdmin && (
          <DropdownMenuItem
            onClick={() => onOpen("leaveServer", { server })}
            className="text-rose-500 px-3 py-2 text-sm cursor-pointer"
          >
            Leave Server
            <LogOut className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
