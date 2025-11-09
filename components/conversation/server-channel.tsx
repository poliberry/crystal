"use client";

import {
  ChannelType,
  type Channel,
  MemberRole,
  type Server,
  type Conversation,
  ConversationType,
} from "@/types/conversation";
import { Edit, Hash, Lock, Mic, Trash, Video, GripVertical, Users, Phone, PhoneCall, Ellipsis } from "lucide-react";
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
import { Avatar, AvatarFallback } from "../ui/avatar";
import { AvatarImage } from "../ui/avatar";
import { useEffect, useState } from "react";
import { SwitchVoiceChannelModal } from "../modals/switch-voice-channel-modal";
import { useSocket } from "../providers/socket-provider";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { NotificationBadge } from "../notification-badge";
import { UnreadDot } from "../unread-dot";

type ServerChannelProps = {
  conversation: any;
  currentProfile: any;
  name: string;
  avatar?: string;
  type: ConversationType;
  lastMessage?: any;
  memberCount?: number;
};

const iconMap = {
  [ChannelType.TEXT]: Hash,
  [ChannelType.AUDIO]: Mic,
  [ChannelType.VIDEO]: Video,
};

export const ConversationChannel = ({
  conversation,
  currentProfile,
  name,
  avatar,
  type,
  lastMessage,
  memberCount,
}: ServerChannelProps) => {
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const media = useLiveKit();
  const { socket } = useSocket();
  const [users, setUsers] = useState<any[]>([]);
  const [partnerPresenceStatus, setPartnerPresenceStatus] = useState<string | null>(null);

  // Helper function to get the other profile in a direct message
  const getDirectMessagePartner = () => {
    if (type !== ConversationType.GROUP_MESSAGE) {
      const otherMember = conversation.members.find(
        (member: any) => member.profileId !== currentProfile.id
      );
      return otherMember?.profile;
    }
    return null;
  };

  const partner = getDirectMessagePartner();

  // Initialize partner presence status
  useEffect(() => {
    if (partner?.presenceStatus) {
      setPartnerPresenceStatus(partner.presenceStatus);
    }
  }, [partner?.profile?.presenceStatus]);

  // Listen for presence status updates
  useEffect(() => {
    if (!partner?.profile?.userId) return;

    const presenceHandler = (payload: { userId: string; presenceStatus: string | null }) => {
      if (payload.userId === partner.profile.userId) {
        setPartnerPresenceStatus(payload.presenceStatus);
      }
    };

    // @ts-ignore
    socket.on("user:presence:update", presenceHandler);
    
    return () => {
      // @ts-ignore
      socket.off("user:presence:update", presenceHandler);
    };
  }, [partner?.profile?.userId, socket]);

  const onClick = async () => {
    // Always navigate to the conversation ID, regardless of type
    router.push(`/conversations/${conversation.id}`);
  };

  const handleVoiceCall = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    // Emit websocket event for call initiation
    socket?.emit("call:start", {
      conversationId: conversation.id,
      type: "voice",
      callerId: currentProfile.id,
      callerName: currentProfile.globalName || currentProfile.name,
      callerAvatar: currentProfile.imageUrl,
      participantIds: conversation.members?.map((m: any) => m.member.profile.id) || [],
    });

    // Navigate and join the call
    router.push(`/conversations/${conversation.id}?audio=true`);
    media.joinConversation(conversation.id, name, true, false);
  };

  const handleVideoCall = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    // Emit websocket event for call initiation
    socket?.emit("call:start", {
      conversationId: conversation.id,
      type: "video",
      callerId: currentProfile.id,
      callerName: currentProfile.globalName || currentProfile.name,
      callerAvatar: currentProfile.imageUrl,
      participantIds: conversation.members?.map((m: any) => m.member.profile.id) || [],
    });

    // Navigate and join the call
    router.push(`/conversations/${conversation.id}?video=true`);
    media.joinConversation(conversation.id, name, true, true);
  };

  // Format last message time
  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  return (
    <div
      onClick={onClick} 
      className="flex flex-col items-start gap-1 cursor-pointer"
    >
      <div
        className={cn(
          "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
          params?.conversationId === conversation.id && "bg-zinc-700/20 dark:bg-zinc-700",
        )}
      >
        {/* Avatar or Group Icon */}
        <div className="flex-shrink-0">
          {type === ConversationType.GROUP_MESSAGE ? (
            <div className="w-8 h-8 rounded-full bg-zinc-500 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          ) : (
            <Avatar className="w-8 h-8">
              <AvatarImage src={avatar} />
              <AvatarFallback>
                {name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Conversation Info */}
        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "line-clamp-1 font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
                  params?.conversationId === conversation.id &&
                  "text-primary dark:text-zinc-200 dark:group-hover:text-white",
                )}
              >
                {name}
                {type === ConversationType.GROUP_MESSAGE && memberCount && (
                  <span className="text-xs text-zinc-400 ml-1">({memberCount})</span>
                )}
              </p>
              <UnreadDot conversationId={conversation.id} />
            </div>
          </div>
          
          {/* Show partner's custom status for direct messages */}
          {!lastMessage && type !== ConversationType.GROUP_MESSAGE && partnerPresenceStatus && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1">
              {partnerPresenceStatus}
            </p>
          )}
          
          {/* Last Message Preview */}
          {lastMessage && (
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1 flex-1">
                <span className="font-medium">{lastMessage.member.profile.name}:</span> {lastMessage.content}
              </p>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                {formatMessageTime(lastMessage.createdAt)}
              </span>
            </div>
          )}
        </div>

        {/* Call Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50"
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleVoiceCall}>
                <PhoneCall className="w-4 h-4 mr-2" />
                Voice Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleVideoCall}>
                <Phone className="w-4 h-4 mr-2" />
                Video Call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};