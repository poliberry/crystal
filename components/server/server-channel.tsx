import {
  ChannelType,
  type Channel,
  MemberRole,
  type Server,
} from "@prisma/client";
import {
  Edit,
  Hash,
  Lock,
  Mic,
  Trash,
  Video,
  GripVertical,
  Radio,
  Volume2,
  Megaphone,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { ActionTooltip } from "@/components/action-tooltip";
import { type ModalType, useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { useLiveKit } from "../providers/media-room-provider";
import { currentProfile } from "@/lib/current-profile";
import { currentUser, useUser } from "@clerk/nextjs";
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
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarImage } from "../ui/avatar";
import { useEffect, useState } from "react";
import { SwitchVoiceChannelModal } from "../modals/switch-voice-channel-modal";
import { useSocket } from "../providers/socket-provider";
import { NotificationBadge } from "../notification-badge";
import { UnreadDot } from "../unread-dot";

type ServerChannelProps = {
  channel: Channel;
  server: Server;
  role?: MemberRole;
};

const iconMap = {
  [ChannelType.TEXT]: Hash,
  [ChannelType.AUDIO]: Mic,
  [ChannelType.VIDEO]: Video,
  [ChannelType.STAGE]: Radio,
  [ChannelType.ANNOUNCEMENT]: Megaphone,
};

export const ServerChannel = ({
  channel,
  server,
  role,
}: ServerChannelProps) => {
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const media = useLiveKit();
  const { socket } = useSocket();
  const [users, setUsers] = useState<any[]>([]);

  const getConnectedUsers = async () => {
    const res = await fetch(`/api/rooms?room=${channel.id}`);
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    if (channel.type === ChannelType.AUDIO || (channel.type as any) === "STAGE") {
      getConnectedUsers();
    }

    socket.on("room:update", (payload: boolean) => {
      if (payload === true) {
        getConnectedUsers();
      }
    });
  }, [channel.id, channel.type]);

  const Icon = iconMap[channel.type as keyof typeof iconMap];

  const onClick = async () => {
    if (channel.type === ChannelType.AUDIO || (channel.type as any) === "STAGE") {
      if (!media.connected) {
        media?.join(
          channel.id,
          channel.name,
          server.name,
          server.id,
          "channel",
          true,
          false // Always false for audio and stage channels
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
    } else if (channel.type === ChannelType.VIDEO) {
      if (!media.connected) {
        media?.join(
          channel.id,
          channel.name,
          server.name,
          server.id,
          "channel",
          true,
          true // Video enabled for video channels
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

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={onClick}
          className="flex flex-col items-start gap-1"
        >
          <div
            className={cn(
              "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
              params?.channelId === channel.id &&
                "bg-zinc-700/20 dark:bg-zinc-700"
            )}
          >
            {channel.type === ChannelType.TEXT && (
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
                (channel.type === ChannelType.AUDIO || (channel.type as any) === "STAGE") &&
                media.roomName === channel.name && <ConnectedUsers />}
              {media.connected &&
                (channel.type === ChannelType.AUDIO || (channel.type as any) === "STAGE") &&
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
                (channel.type === ChannelType.AUDIO || (channel.type as any) === "STAGE") &&
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

            {role !== MemberRole.GUEST && (
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
