"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveKit } from "@/components/providers/media-room-provider";

interface CallDetectorProps {
  conversationId: string;
}

export function CallDetector({ conversationId }: CallDetectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connected, conversationId: activeConversationId, roomType } = useLiveKit();

  useEffect(() => {
    // Check if there's an active call for this conversation
    if (connected && 
        activeConversationId === conversationId && 
        roomType === "conversation") {
      
      const hasCallParams = searchParams?.get('audio') || searchParams?.get('video');
      
      if (!hasCallParams) {
        // Redirect to the call with audio by default
        router.push(`/conversations/${conversationId}?audio=true`);
      }
    }
  }, [conversationId, router, searchParams, connected, activeConversationId, roomType]);

  return null; // This component doesn't render anything
}
