import {
  Edit,
  Hash,
  Lock,
  Mic,
  Trash,
  Video,
  GripVertical,
  Bell,
  BellOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { ActionTooltip } from "@/components/action-tooltip";
import { type ModalType, useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { useLiveKit } from "../providers/media-room-provider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { UnreadDot } from "../unread-dot";

type ServerChannelProps = {
  channel: any;
  server: any;
  role?: string;
};

const iconMap = {
  ["TEXT" as string]: Hash,
  ["AUDIO" as string]: Mic,
  ["VIDEO" as string]: Video,
};

export const ServerChannel = ({
  channel,
  server,
  role,
}: ServerChannelProps) => {
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const media = useLiveKit();
  const [users, setUsers] = useState<any[]>([]);

  // Check if channel is muted
  const isChannelMuted = useQuery(
    api.mutedChannels.isMuted,
    user?.userId && channel.type === "TEXT"
      ? { userId: user.userId, channelId: channel._id as Id<"channels"> }
      : "skip"
  );

  const muteChannel = useMutation(api.mutedChannels.mute);
  const unmuteChannel = useMutation(api.mutedChannels.unmute);

  // Get connected users from LiveKit API route (not socket)
  const getConnectedUsers = async () => {
    const res = await fetch(`/api/rooms?room=${channel.id}`);
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    if (channel.type === "AUDIO") {
      getConnectedUsers();
      // Poll for updates instead of socket events
      const interval = setInterval(() => {
        getConnectedUsers();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [channel.id, channel.type]);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: channel.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = iconMap[channel.type];

  const onClick = async () => {
    if (channel.type === "AUDIO") {
      if (!media.connected) {
        media?.join(
          channel.id,
          channel.name,
          server.name,
          server.id,
          "channel",
          true,
          false
        );
        router.push(`/servers/${params?.serverId}/channels/${channel.id}`);
      } else if (media.connected && media.roomName !== channel.name) {
        onOpen("switchVoiceChannel", {
          channel,
          server,
        });
      } else {
        router.push(`/servers/${params?.serverId}/channels/${channel.id}`);
      }
    } else {
      router.push(`/servers/${params?.serverId}/channels/${channel.id}`);
    }
  };

  const onAction = (e: React.MouseEvent, action: ModalType) => {
    e.stopPropagation();
    onOpen(action, { channel, server });
  };

  const handleToggleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.userId || channel.type !== "TEXT") return;

    try {
      if (isChannelMuted) {
        await unmuteChannel({
          userId: user.userId,
          channelId: channel._id as Id<"channels">,
        });
      } else {
        await muteChannel({
          userId: user.userId,
          channelId: channel._id as Id<"channels">,
          serverId: server._id as Id<"servers">,
        });
      }
    } catch (error) {
      console.error("Failed to toggle channel mute:", error);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          onClick={onClick}
          className="flex flex-col items-start gap-1"
        >
          <div
            className={cn(
              "group px-1.5 py-1 flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
              params?.channelId === channel.id &&
                "bg-zinc-700/20 dark:bg-zinc-700"
            )}
          >
            {/* Drag handle */}
            {role !== "GUEST" && (
              <span
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab group-hover:block hidden active:cursor-grabbing mr-0.5"
                tabIndex={1}
                aria-label="Drag to reorder"
              >
                <GripVertical className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100" />
              </span>
            )}
            {channel.type === "TEXT" && (
              <UnreadDot channelId={channel.id} />
            )}
            <Icon className="flex-shrink-0 w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <div className="flex flex-col items-start gap-1 flex-1">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "line-clamp-1 font-semibold text-xs text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
                      params?.channelId === channel.id &&
                        "text-primary dark:text-zinc-200 dark:group-hover:text-white"
                    )}
                  >
                    {channel.name}
                  </p>
                </div>
              </div>
              {media.connected &&
                channel.type === "AUDIO" &&
                media.roomName === channel.name && <ConnectedUsers />}
              {media.connected &&
                channel.type === "AUDIO" &&
                media.roomName !== channel.name &&
                users.length > 0 && (
                  <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground px-2 pb-2">
                    {users.map((user) => {
                      const metadata = user.metadata
                        ? JSON.parse(user.metadata)
                        : {};
                      return (
                        <div
                          key={user.identity}
                          className="flex items-center gap-1"
                        >
                          <AvatarCard
                            name={user.identity}
                            image={metadata.avatar}
                            isSpeaking={user.isSpeaking}
                          />
                          <span>{user.identity}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              {!media.connected &&
                channel.type === "AUDIO" &&
                users.length > 0 && (
                  <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground px-2 pb-2">
                    {users.map((user) => {
                      const metadata = user.metadata
                        ? JSON.parse(user.metadata)
                        : {};
                      return (
                        <div
                          key={user.identity}
                          className="flex items-center gap-1"
                        >
                          <AvatarCard
                            name={user.identity}
                            image={metadata.avatar}
                            isSpeaking={user.isSpeaking}
                          />
                          <span>{user.identity}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>

            {role !== "GUEST" && (
              <div className="ml-auto flex items-center gap-x-2">
                <ActionTooltip label="Edit">
                  <Edit
                    onClick={(e) => onAction(e, "editChannel")}
                    className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                  />
                </ActionTooltip>
                <ActionTooltip label="Delete">
                  <Trash
                    onClick={(e) => onAction(e, "deleteChannel")}
                    className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                  />
                </ActionTooltip>
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {channel.type === "TEXT" && (
          <>
            <ContextMenuItem onClick={handleToggleMute}>
              {isChannelMuted ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Unmute Channel
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Mute Channel
                </>
              )}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {role !== "GUEST" && (
          <>
            <ContextMenuItem onClick={(e) => onAction(e, "editChannel")}>
              Edit Channel
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-500"
              onClick={(e) => onAction(e, "deleteChannel")}
            >
              Delete Channel
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

function ConnectedUsers() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const participants = [localParticipant, ...remoteParticipants];

  function safeParseMetadata(raw?: string): { avatar?: string } | null {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {participants.map((participant) => {
        const metadata = safeParseMetadata(participant?.metadata);
        return (
          <div
            key={participant.sid}
            className="flex flex-row items-center gap-1 text-sm text-muted-foreground font-normal"
          >
            <AvatarCard
              name={participant?.identity}
              image={metadata?.avatar}
              isSpeaking={participant.isSpeaking}
            />
            {participant.identity}
          </div>
        );
      })}
    </div>
  );
}

function AvatarCard({
  name,
  image,
  isSpeaking,
}: {
  name: string;
  image?: string;
  isSpeaking: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-6 h-6 rounded-full overflow-hidden border-2",
        isSpeaking ? "border-green-400" : "border-zinc-700"
      )}
    >
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-xs">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
