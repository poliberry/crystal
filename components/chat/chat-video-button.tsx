"use client";

import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import qs from "query-string";

import { ActionTooltip } from "../action-tooltip";
import { useLiveKit } from "../providers/media-room-provider";
import { Button } from "../ui/button";

export const ChatVideoButton = ({ user, caller, conversationName, conversation, currentProfile }: any) => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const media = useLiveKit();

  const isAudio = searchParams?.get("audio");
  const isVideo = searchParams?.get("video");
  const conversationId = params?.conversationId as string;

  // Get the other user's profile for notifications
  const getOtherUser = () => {
    if (!conversation || !currentProfile) return null;
    
    // Find the other member in the conversation
    const otherMember = conversation.members?.find(
      (member: any) => 
        member.profileId !== currentProfile._id && 
        member.profileId !== currentProfile.id
    );
    
    return otherMember?.profile || otherMember?.member?.profile;
  };

  const sendCallNotification = async (isVideoCall: boolean) => {
    const otherUser = getOtherUser();
    if (!otherUser?.userId || !currentProfile || !conversationId) {
      console.warn("Cannot send call notification: missing required data", { 
        otherUser: !!otherUser, 
        userId: otherUser?.userId,
        currentProfile: !!currentProfile,
        conversationId 
      });
      return;
    }

    try {
      const response = await fetch("/api/notifications/incoming-dm-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriberId: otherUser.userId,
          title: isVideoCall ? "Incoming Video Call" : "Incoming Voice Call",
          body: `${currentProfile.globalName || currentProfile.name} is calling you`,
          imageUrl: currentProfile.imageUrl,
          conversationId: conversationId,
          conversationName: conversationName || "Direct Message",
          callerName: currentProfile.globalName || currentProfile.name,
          callerId: currentProfile._id || currentProfile.id,
          isVideo: `${isVideoCall}`,
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
  };

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
      // Start voice call
      if (conversationId && conversation && currentProfile) {
        // Send notification to the other user
        await sendCallNotification(false);
        
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
      // Start video call
      if (conversationId && conversation && currentProfile) {
        // Send notification to the other user
        await sendCallNotification(true);
        
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
