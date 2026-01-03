"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerChannelList } from "./server-channel-list";
import { ConversationHeader } from "./conversation-header";
import { ActionTooltip } from "../action-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { MessageCircle, Users } from "lucide-react";

interface ConversationSidebarClientProps {
  initialConversations: any[];
  currentProfile: any;
}

export const ConversationSidebarClient = ({
  initialConversations,
  currentProfile,
}: ConversationSidebarClientProps) => {
  const { user } = useAuthStore();
  const { onOpen } = useModal();
  const conversations = useQuery(
    api.conversations.getMyConversations,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const displayConversations = conversations || initialConversations;

  return (
    <div className="flex flex-col h-full text-muted-foreground w-full bg-transparent">
      <ConversationHeader currentProfile={currentProfile} />
      <ScrollArea className="flex-1 px-3">
        <div className="flex items-center w-full justify-between mt-2 gap-2">
          <div className="flex items-center gap-x-1">
            <h2 className="text-sm font-semibold uppercase">Direct Messages</h2>
          </div>
          <div className="flex items-center gap-x-1">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  onClick={() => onOpen("createGroup", { currentProfile })}
                  variant="outline"
                  size="sm"
                  className="p-2"
                >
                  <Users className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create Group</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  onClick={() =>
                    onOpen("createDirectMessage", { currentProfile })
                  }
                  variant="outline"
                  size="sm"
                  className="p-2"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start DM</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="mt-2">
          <div className="mb-2">
            <ServerChannelList
              conversations={displayConversations}
              currentProfile={currentProfile}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
