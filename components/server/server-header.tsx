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
import type { ServerWithMembersWithProfiles } from "@/types";
import { Card, CardContent } from "../ui/card";
import { PermissionType } from "@/types/permissions";
import { useServerPermissions } from "@/hooks/use-permissions";

type ServerHeaderProps = {
  server: ServerWithMembersWithProfiles;
  member: any;
  canManageChannels?: boolean;
};

export const ServerHeader = ({ server, member, canManageChannels }: ServerHeaderProps) => {
  const { onOpen } = useModal();
  
  const permissions = useServerPermissions(member?.id || '');
  
  // Extract permission checks for easier use
  const canManageServer = permissions.getPermission(PermissionType.MANAGE_SERVER).granted;
  const canManageChannelsCheck = permissions.getPermission(PermissionType.MANAGE_CHANNELS).granted;
  const canManageRoles = permissions.getPermission(PermissionType.MANAGE_ROLES).granted;
  const canCreateInvite = permissions.getPermission(PermissionType.CREATE_INSTANT_INVITE).granted;
  const isAdmin = permissions.getPermission(PermissionType.ADMINISTRATOR).granted;

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
        {canCreateInvite && (
          <DropdownMenuItem
            onClick={() => onOpen("invite", { server })}
            className="text-indigo-600 dark:text-indigo-400 px-3 py-2 text-sm cursor-pointer"
          >
            Invite People
            <UserPlus className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {canManageServer && (
          <DropdownMenuItem
            onClick={() => onOpen("enhancedServerSettings", { server, currentMember: member })}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Server Settings
            <Settings className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {canManageRoles && (
          <DropdownMenuItem
            onClick={() => onOpen("members", { server })}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Manage Members
            <Users className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {canManageChannelsCheck && (
          <DropdownMenuItem
            onClick={() => onOpen("createChannel")}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Create Channel
            <PlusCircle className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {canManageChannelsCheck && (
          <DropdownMenuItem
            onClick={() => onOpen("createCategory")}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Create Category
            <FolderPlus className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {(canManageChannelsCheck || canManageServer || canManageRoles) && <DropdownMenuSeparator />}
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => onOpen("deleteServer", { server })}
            className="text-rose-500 px-3 py-2 text-sm cursor-pointer"
          >
            Delete Server
            <Trash className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
        {!isAdmin && (
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
