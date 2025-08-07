"use client";

import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import qs from "query-string";

import { ActionTooltip } from "../action-tooltip";
import { useLiveKit } from "../providers/media-room-provider";
import { useSocket } from "../providers/socket-provider";
import { Button } from "../ui/button";

export const ChatVideoButton = ({ user, caller, conversationName, conversation, currentProfile }: any) => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const media = useLiveKit();
  const { socket } = useSocket();

  const isAudio = searchParams?.get("audio");
  const isVideo = searchParams?.get("video");
  const conversationId = params?.conversationId as string;

  const handleVoiceCall = async () => {
    if (isAudio) {
      // End the call
      media.leave();
      const url = qs.stringifyUrl(
        {
          url: pathname || "",
          query: {
            audio: undefined,
            video: undefined,
          },
        },
        { skipNull: true },
      );
      router.push(url);
    } else {
      // Start voice call - emit socket event first
      if (conversationId && conversation && currentProfile) {
        // Emit websocket event for call initiation
        socket?.emit("call:start", {
          conversationId: conversationId,
          type: "voice",
          callerId: currentProfile.id,
          callerName: currentProfile.globalName || currentProfile.name,
          callerAvatar: currentProfile.imageUrl,
          participantIds: conversation.members?.map((m: any) => m.member.profile.id) || [],
        });

        media.joinConversation(conversationId, conversationName || "Call", true, false);
        const url = qs.stringifyUrl(
          {
            url: pathname || "",
            query: {
              audio: true,
              video: undefined,
            },
          },
          { skipNull: true },
        );
        router.push(url);
      }
    }
  };

  const handleVideoCall = async () => {
    if (isVideo) {
      // End the call
      media.leave();
      const url = qs.stringifyUrl(
        {
          url: pathname || "",
          query: {
            audio: undefined,
            video: undefined,
          },
        },
        { skipNull: true },
      );
      router.push(url);
    } else {
      // Start video call - emit socket event first
      if (conversationId && conversation && currentProfile) {
        // Emit websocket event for call initiation
        socket?.emit("call:start", {
          conversationId: conversationId,
          type: "video",
          callerId: currentProfile.id,
          callerName: currentProfile.globalName || currentProfile.name,
          callerAvatar: currentProfile.imageUrl,
          participantIds: conversation.members?.map((m: any) => m.member.profile.id) || [],
        });

        media.joinConversation(conversationId, conversationName || "Call", true, true);
        const url = qs.stringifyUrl(
          {
            url: pathname || "",
            query: {
              audio: true,
              video: true,
            },
          },
          { skipNull: true },
        );
        router.push(url);
      }
    }
  };

  const VoiceIcon = isAudio ? PhoneOff : Phone;
  const VideoIcon = isVideo ? VideoOff : Video;
  const voiceTooltipLabel = isAudio ? "End voice call" : "Start voice call";
  const videoTooltipLabel = isVideo ? "End video call" : "Start video call";

  return (
    <div className="flex items-center gap-2">
      <ActionTooltip side="bottom" label={voiceTooltipLabel}>
        <Button
          onClick={handleVoiceCall}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50"
        >
          <VoiceIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        </Button>
      </ActionTooltip>
      
      <ActionTooltip side="bottom" label={videoTooltipLabel}>
        <Button
          onClick={handleVideoCall}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50"
        >
          <VideoIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        </Button>
      </ActionTooltip>
    </div>
  );
};
