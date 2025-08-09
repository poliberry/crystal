"use client";

import { Plus, Users, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type ConversationHeaderProps = {
  currentProfile: any;
};

export const ConversationHeader = ({ currentProfile }: ConversationHeaderProps) => {
  const { onOpen } = useModal();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex flex-col gap-y-2 px-3 py-2 border-b border-muted">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Direct Messages</h2>
        <div className="flex items-center gap-x-1">
          <ActionTooltip label="Create Group">
            <Button
              onClick={() => onOpen("createGroup", { currentProfile })}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Users className="w-4 h-4" />
            </Button>
          </ActionTooltip>
          <ActionTooltip label="Start DM">
            <Button
              onClick={() => onOpen("createDirectMessage", { currentProfile })}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </ActionTooltip>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
};
