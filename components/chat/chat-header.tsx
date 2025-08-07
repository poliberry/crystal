import { Hash } from "lucide-react";

import { MobileToggle } from "../mobile-toggle";
import { SocketIndicator } from "../socket-indicator";
import { UserAvatar } from "../user-avatar";

import { ChatVideoButton } from "./chat-video-button";
import { PT_Serif } from "next/font/google";
import { cn } from "@/lib/utils";

type ChatHeaderProps = {
  serverId?: string;
  name: string;
  type: "channel" | "conversation" | "personal-space";
  imageUrl?: string;
};

export const ChatHeader = ({
  serverId,
  name,
  type,
  imageUrl,
}: ChatHeaderProps) => {
  return (
    <div className="text-md font-semibold px-3 flex z-[5] items-center h-12 border-b border-muted">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single:wght@100..900&display=swap" rel="stylesheet" />
      {serverId && <MobileToggle serverId={serverId} />}

      {type === "channel" && (
        <Hash className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mr-2" />
      )}

      {(type === "conversation" || type === "personal-space") && (
        <UserAvatar
          src={imageUrl}
          alt={name}
          className="h-8 w-8 md:h-8 md:w-8 mr-2"
        />
      )}

      <p className="text-xl text-black dark:text-white headerFont uppercase mt-0.5">{name} {type === "personal-space" && "(You)"}</p>

      <div className="ml-auto flex items-center">
        {type === "conversation" && <ChatVideoButton />}
        <SocketIndicator />
      </div>
    </div>
  );
};
