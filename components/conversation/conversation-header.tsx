"use client";

import { Plus, Users, MessageCircle, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { redirect } from "next/navigation";

type ConversationHeaderProps = {
  currentProfile: any;
};

export const ConversationHeader = ({ currentProfile }: ConversationHeaderProps) => {
  const { onOpen } = useModal();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex flex-col gap-y-2 px-3 py-2 border-b border-muted">
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
      {/* Friends Button */}
      <Button variant="ghost" onClick={() => redirect('/conversations')} className="px-4 py-2 w-full justify-start">
        <Users className="w-4 h-4 mr-2" />
        Friends
      </Button>
    </div>
  );
};
