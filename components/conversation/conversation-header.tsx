"use client";

import { Plus, Users, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { IconShoppingBag, IconUsersGroup } from "@tabler/icons-react";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";

type ConversationHeaderProps = {
  currentProfile: any;
};

export const ConversationHeader = ({ currentProfile }: ConversationHeaderProps) => {
  const { onOpen } = useModal();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  return (
    <div className="flex flex-col gap-y-2 px-3 py-2 border-b border-muted">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex flex-col items-start w-full gap--2">
        <Button variant="ghost" onClick={() => router.push("/conversations")} className="p-1.5 w-full justify-start cursor-pointer">
          <IconUsersGroup className="w-4 h-4" />
          <span className="text-sm font-semibold">Friends</span>
        </Button>
        <Button variant="ghost" disabled className="p-1.5 w-full justify-start cursor-not-allowed">
          <IconShoppingBag className="w-4 h-4" />
          <span className="text-sm font-semibold">Marketplace</span>
          <Badge variant="outline" className="ml-auto">
            <span className="text-xs font-semibold uppercase">Coming soon</span>
          </Badge>
        </Button>
      </div>
    </div>
  );
};
