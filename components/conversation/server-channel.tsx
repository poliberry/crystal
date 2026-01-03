"use client";

import {
  ChannelType,
  type Channel,
  MemberRole,
  type Server,
  type Conversation,
  ConversationType,
} from "@/types/conversation";
import {
  Edit,
  Hash,
  Lock,
  Mic,
  Trash,
  Video,
  GripVertical,
  Users,
  Phone,
  PhoneCall,
  Ellipsis,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

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
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { AvatarImage } from "../ui/avatar";
import { useEffect, useState } from "react";
import { SwitchVoiceChannelModal } from "../modals/switch-voice-channel-modal";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NotificationBadge } from "../notification-badge";
import { UnreadDot } from "../unread-dot";
import { useMutation } from "convex/react";
import { GroupAvatar } from "../group-avatar";

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
  const { user } = useAuthStore();
  const media = useLiveKit();
  const [partnerPresenceStatus, setPartnerPresenceStatus] = useState<
    string | null
  >(null);

  // Get partner profile for presence status
  const getDirectMessagePartner = () => {
    if (type !== ConversationType.GROUP_MESSAGE) {
      const otherMember = conversation.members?.find(
        (member: any) => 
          member.profileId !== currentProfile._id && 
          member.profileId !== currentProfile.id
      );
      return otherMember?.profile;
    }
    return null;
  };

  const partner = getDirectMessagePartner();

  // Get real-time partner status from Convex
  const partnerProfile = useQuery(
    api.profiles.getByUserId,
    partner?.userId && user?.userId
      ? { userId: partner.userId }
      : "skip"
  );

  // Update presence status from Convex query
  useEffect(() => {
    if (partnerProfile?.presenceStatus) {
      setPartnerPresenceStatus(partnerProfile.presenceStatus);
    }
  }, [partnerProfile?.presenceStatus]);

  const conversationId = conversation._id || conversation.id;

  const onClick = async () => {
    router.push(`/conversations/${conversationId}`);
  };

  const handleVoiceCall = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Send notification to the other user (only for DM calls)
    if (type !== ConversationType.GROUP_MESSAGE && partner?.userId && currentProfile) {
      try {
        const response = await fetch("/api/notifications/incoming-dm-call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriberId: partner.userId,
            title: "Incoming Voice Call",
            body: `${currentProfile.globalName || currentProfile.name} is calling you`,
            imageUrl: currentProfile.imageUrl,
            conversationId: conversationId,
            conversationName: name,
            callerName: currentProfile.globalName || currentProfile.name,
            callerId: currentProfile._id || currentProfile.id,
            isVideo: false,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to send call notification:", response.status, errorData);
        } else {
          const result = await response.json();
          console.log("Call notification sent successfully:", result);
        }
      } catch (notifError) {
        console.error("Failed to send call notification:", notifError);
      }
    } else {
      console.warn("Cannot send call notification: missing partner or profile", { 
        isGroup: type === ConversationType.GROUP_MESSAGE,
        partnerUserId: partner?.userId,
        currentProfile: !!currentProfile 
      });
    }

    // Navigate and join the call
    router.push(`/conversations/${conversationId}?audio=true`);
    media.joinConversation(conversationId, name, true, false);
  };

  const handleVideoCall = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Send notification to the other user (only for DM calls)
    if (type !== ConversationType.GROUP_MESSAGE && partner?.userId && currentProfile) {
      try {
        const response = await fetch("/api/notifications/incoming-dm-call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriberId: partner.userId,
            title: "Incoming Video Call",
            body: `${currentProfile.globalName || currentProfile.name} is calling you`,
            imageUrl: currentProfile.imageUrl,
            conversationId: conversationId,
            conversationName: name,
            callerName: currentProfile.globalName || currentProfile.name,
            callerId: currentProfile._id || currentProfile.id,
            isVideo: true,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to send call notification:", response.status, errorData);
        } else {
          const result = await response.json();
          console.log("Call notification sent successfully:", result);
        }
      } catch (notifError) {
        console.error("Failed to send call notification:", notifError);
      }
    } else {
      console.warn("Cannot send call notification: missing partner or profile", { 
        isGroup: type === ConversationType.GROUP_MESSAGE,
        partnerUserId: partner?.userId,
        currentProfile: !!currentProfile 
      });
    }

    // Navigate and join the call
    router.push(`/conversations/${conversationId}?video=true`);
    media.joinConversation(conversationId, name, true, true);
  };

  // Format last message time
  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
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
          "group px-1 py-1 flex items-center gap-x-2 w-full bg-transparent hover:bg-muted transition mb-1",
          (params?.conversationId === conversation._id || params?.conversationId === conversation.id) &&
            "bg-muted-foreground/10"
        )}
      >
        {/* Avatar or Group Icon */}
        <div className="flex-shrink-0">
          {type === ConversationType.GROUP_MESSAGE ? (
            <GroupAvatar
              members={conversation.members || []}
              imageUrl={conversation.imageUrl}
              size={32}
              className="rounded-none"
            />
          ) : (
            <Avatar className="w-8 h-8 rounded-none after:rounded-none">
              <AvatarImage src={avatar} className="rounded-none after:rounded-none" />
              <AvatarFallback>
                {name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
              <AvatarFallback className="rounded-none after:rounded-none">
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
                  params?.conversationId === conversation._id &&
                    "text-primary dark:text-zinc-200 dark:group-hover:text-white"
                )}
              >
                {name}
                {type === ConversationType.GROUP_MESSAGE && memberCount && (
                  <span className="text-xs text-zinc-400 ml-1">
                    ({memberCount})
                  </span>
                )}
              </p>
              <UnreadDot conversationId={conversation._id} />
            </div>
          </div>

          {/* Show partner's custom status for direct messages */}
          {!lastMessage &&
            type !== ConversationType.GROUP_MESSAGE &&
            partnerPresenceStatus && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1">
                {partnerPresenceStatus}
              </p>
            )}

          {/* Last Message Preview */}
          {lastMessage && (() => {
            // Check if message is from current user
            const messageProfileId = lastMessage.profileId || lastMessage.member?.profileId || lastMessage.member?.profile?._id || lastMessage.profile?._id;
            const isCurrentUser = messageProfileId === currentProfile._id || messageProfileId === currentProfile.id;
            
            // Get the sender's name
            const senderName = isCurrentUser 
              ? "You" 
              : (lastMessage.member?.profile?.globalName || 
                 lastMessage.member?.profile?.name || 
                 lastMessage.profile?.globalName || 
                 lastMessage.profile?.name || 
                 "Unknown");
            
            return (
              <div className="flex items-center justify-between w-full">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1 flex-1">
                  <span className="font-medium">
                    {senderName}:
                  </span>{" "}
                  {lastMessage.content}
                </p>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                  {formatMessageTime(lastMessage.createdAt)}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Call Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger>
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
