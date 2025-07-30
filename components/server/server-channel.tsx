"use client";

import {
  ChannelType,
  type Channel,
  MemberRole,
  type Server,
} from "@prisma/client";
import { Edit, Hash, Lock, Mic, Trash, Video, GripVertical } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ActionTooltip } from "@/components/action-tooltip";
import { type ModalType, useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { useLiveKit } from "../providers/media-room-provider";
import { currentProfile } from "@/lib/current-profile";
import { currentUser, useUser } from "@clerk/nextjs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../ui/context-menu";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarImage } from "../ui/avatar";
import { useEffect, useState } from "react";
import { SwitchVoiceChannelModal } from "../modals/switch-voice-channel-modal";
import { useSocket } from "../providers/socket-provider";

type ServerChannelProps = {
  channel: Channel;
  server: Server;
  role?: MemberRole;
};

const iconMap = {
  [ChannelType.TEXT]: Hash,
  [ChannelType.AUDIO]: Mic,
  [ChannelType.VIDEO]: Video,
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
    if (channel.type === ChannelType.AUDIO) {
      getConnectedUsers();
    }

    socket.on("room:update", (payload: boolean) => {
      if (payload === true) {
        getConnectedUsers();
      }
    });
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
    if (channel.type === ChannelType.AUDIO) {
      if (!media.connected) {
        const call_connect = new Audio("/sounds/call-connect.ogg");
        call_connect.play();
        media?.join(channel.id, channel.name, server.name, true, false);
        router.push(`/servers/${params?.serverId}/channels/${channel.id}`)
      } else if (media.connected && media.roomName !== channel.name) {
        onOpen("switchVoiceChannel", {
          channel,
          server,
        });
      } else {
        router.push(`/servers/${params?.serverId}/channels/${channel.id}`)
      }
    } else {
      router.push(`/servers/${params?.serverId}/channels/${channel.id}`)
    }
  };

  const onAction = (e: React.MouseEvent, action: ModalType) => {
    e.stopPropagation();
    onOpen(action, { channel, server });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div ref={setNodeRef}
          style={style}
          {...attributes}
          onClick={onClick} className="flex flex-col items-start gap-1">
          <div
            className={cn(
              "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
              params?.channelId === channel.id && "bg-zinc-700/20 dark:bg-zinc-700",
            )}
          >
            {/* Drag handle */}
            <span
              {...listeners}
              onClick={(e) => e.stopPropagation()} // Prevent drag handle click from navigating
              className="cursor-grab group-hover:block hidden active:cursor-grabbing mr-0.5"
              tabIndex={1}
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100" />
            </span>
            <Icon className="flex-shrink-0 w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <div className="flex flex-col items-start gap-1">
              <p
                className={cn(
                  "line-clamp-1 font-semibold text-xs text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
                  params?.channelId === channel.id &&
                  "text-primary dark:text-zinc-200 dark:group-hover:text-white",
                )}
              >
                {channel.name}
              </p>
              {media.connected && channel.type === ChannelType.AUDIO && media.roomName === channel.name && (
                <ConnectedUsers />
              )}
              {
                media.connected && channel.type === ChannelType.AUDIO && media.roomName !== channel.name && users.length > 0 && (
                  <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground px-2 pb-2">
                    {users.map((user) => {
                      const metadata = user.metadata ? JSON.parse(user.metadata) : {};
                      return (
                        <div key={user.identity} className="flex items-center gap-1">
                          <AvatarCard
                            name={user.identity}
                            image={metadata.avatar}
                            isSpeaking={user.isSpeaking}
                          />
                          <span>{user.identity}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              }
              {!media.connected && channel.type === ChannelType.AUDIO && users.length > 0 && (
                <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground px-2 pb-2">
                  {users.map((user) => {
                    const metadata = user.metadata ? JSON.parse(user.metadata) : {};
                    return (
                      <div key={user.identity} className="flex items-center gap-1">
                        <AvatarCard
                          name={user.identity}
                          image={metadata.avatar}
                          isSpeaking={user.isSpeaking}
                        />
                        <span>{user.identity}</span>
                      </div>
                    )
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
        <ContextMenuItem className="text-red-500" onClick={(e) => onAction(e, "deleteChannel")}>
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
          <div key={participant.sid} className="flex flex-row items-center gap-1 text-sm text-muted-foreground font-normal">
            <AvatarCard
              name={participant?.identity}
              image={metadata?.avatar}
              isSpeaking={participant.isSpeaking}
            />
            {participant.identity}
          </div>
        )
      })}
    </div>
  )
}

function AvatarCard({ name, image, isSpeaking }: { name: string; image?: string; isSpeaking: boolean }) {
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