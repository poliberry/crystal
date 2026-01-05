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
  Bell,
  BellOff,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { Id } from "@/convex/_generated/dataModel";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";
import { Card, CardContent } from "../ui/card";

type ServerHeaderProps = {
  server: any;
  role?: string;
};

export const ServerHeader = ({ server, role }: ServerHeaderProps) => {
  const { onOpen } = useModal();
  const { user } = useAuthStore();

  const isAdmin = role === ("ADMIN" as string);
  const isModerator = isAdmin || role === ("MODERATOR" as string);

  // Check if server is muted
  const isServerMuted = useQuery(
    api.mutedServers.isMuted,
    user?.userId
      ? { userId: user.userId, serverId: server._id as Id<"servers"> }
      : "skip"
  );

  const muteServer = useMutation(api.mutedServers.mute);
  const unmuteServer = useMutation(api.mutedServers.unmute);

  const handleToggleServerMute = async () => {
    if (!user?.userId) return;

    try {
      if (isServerMuted) {
        await unmuteServer({
          userId: user.userId,
          serverId: server._id as Id<"servers">,
        });
      } else {
        await muteServer({
          userId: user.userId,
          serverId: server._id as Id<"servers">,
        });
      }
    } catch (error) {
      console.error("Failed to toggle server mute:", error);
    }
  };

  return (
    <div className="w-full h-fit flex flex-col gap-0 relative">
      <DropdownMenu>
        <DropdownMenuTrigger className="absolute top-0 left-0 w-full px-2">
          <div className="flex flex-row justify-between items-center w-full py-2 text-muted-foreground">
            <h2 className="text-md font-semibold">{server?.name}</h2>
            <ChevronDown />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 text-xs font-medium text-foreground border-1 border-border space-y-[2px]">
          <DropdownMenuItem
            onClick={handleToggleServerMute}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            {isServerMuted ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Unmute Server
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Mute Server
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isModerator && (
            <DropdownMenuItem
              onClick={() => onOpen("invite", { server })}
              className="text-indigo-600 dark:text-indigo-400 px-3 py-2 text-sm cursor-pointer"
            >
              Invite People
              <UserPlus className="h-4 w-4 ml-auto" />
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem
              onClick={() => onOpen("editServer", { server })}
              className="px-3 py-2 text-sm cursor-pointer"
            >
              Server Settings
              <Settings className="h-4 w-4 ml-auto" />
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem
              onClick={() => onOpen("members", { server })}
              className="px-3 py-2 text-sm cursor-pointer"
            >
              Manage Members
              <Users className="h-4 w-4 ml-auto" />
            </DropdownMenuItem>
          )}
          {isModerator && (
            <DropdownMenuItem
              onClick={() => onOpen("createChannel")}
              className="px-3 py-2 text-sm cursor-pointer"
            >
              Create Channel
              <PlusCircle className="h-4 w-4 ml-auto" />
            </DropdownMenuItem>
          )}
          {isModerator && (
            <DropdownMenuItem
              onClick={() => onOpen("createCategory")}
              className="px-3 py-2 text-sm cursor-pointer"
            >
              Create Category
              <FolderPlus className="h-4 w-4 ml-auto" />
            </DropdownMenuItem>
          )}
          {isModerator && <DropdownMenuSeparator />}
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
      <div className="w-full h-32 object-cover" style={{ backgroundImage: `linear-gradient(to bottom, transparent, var(--sidebar)), url(${server?.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      </div>
    </div>
  );
};
