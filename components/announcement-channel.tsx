"use client";

import { ChannelType, MemberRole } from "@prisma/client";
import { Volume2, Pin, Megaphone } from "lucide-react";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AnnouncementChannelProps {
  channel: any;
  member: any;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
}

export const AnnouncementChannel = ({
  channel,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
}: AnnouncementChannelProps) => {
  const canPost = member.role === MemberRole.ADMIN || member.role === MemberRole.MODERATOR;

  return (
    <div className="bg-transparent flex flex-col h-full">
      {/* Custom Header for Announcements */}
      <div className="px-4 py-3 border-b border-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{channel.name}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages
        name={channel.name}
        chatId={chatId}
        member={member}
        type="channel"
        apiUrl={apiUrl}
        socketUrl={socketUrl}
        socketQuery={socketQuery}
        paramKey={paramKey}
        paramValue={paramValue}
      />

      {/* Input (only for admins/moderators) */}
      {canPost && (
        <ChatInput
          name={channel.name}
          type="channel"
          apiUrl="/api/socket/messages"
          query={socketQuery}
          member={member}
          channelId={channel.id}
        />
      )}
    </div>
  );
};
