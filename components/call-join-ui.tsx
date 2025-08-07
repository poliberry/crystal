"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Phone, 
  Video, 
  Users,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import { useLiveKit } from "./providers/media-room-provider";
import { ConversationType } from "@prisma/client";

type CallJoinUIProps = {
  conversationId: string;
  conversationName: string;
  conversationType: ConversationType;
  otherMember?: any;
  participantCount: number;
};

export const CallJoinUI = ({
  conversationId,
  conversationName,
  conversationType,
  otherMember,
  participantCount,
}: CallJoinUIProps) => {
  const router = useRouter();
  const { joinConversation } = useLiveKit();
  const [joining, setJoining] = useState(false);

  const joinWithAudio = async () => {
    setJoining(true);
    try {
      await joinConversation(conversationId, conversationName, true, false);
      router.push(`/conversations/${conversationId}?audio=true`);
    } catch (error) {
      console.error("Failed to join call:", error);
      setJoining(false);
    }
  };

  const joinWithVideo = async () => {
    setJoining(true);
    try {
      await joinConversation(conversationId, conversationName, true, true);
      router.push(`/conversations/${conversationId}?video=true`);
    } catch (error) {
      console.error("Failed to join call:", error);
      setJoining(false);
    }
  };

  return (
    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg mx-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Active call in {conversationName}
            </span>
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400">
                {participantCount} {participantCount === 1 ? "participant" : "participants"}
              </span>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs">
          Ongoing
        </Badge>
      </div>

      {/* Join Controls */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ActionTooltip label="Join with audio">
            <Button
              onClick={joinWithAudio}
              disabled={joining}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {joining ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Phone className="h-4 w-4 mr-2" />
              )}
              Join Audio
            </Button>
          </ActionTooltip>
          
          <ActionTooltip label="Join with video">
            <Button
              onClick={joinWithVideo}
              disabled={joining}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {joining ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Video className="h-4 w-4 mr-2" />
              )}
              Join Video
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};
