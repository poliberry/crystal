"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type GroupAvatarProps = {
  members: Array<{
    profile?: {
      imageUrl?: string | null;
      name?: string;
      _id?: string;
    } | null;
  }>;
  imageUrl?: string | null;
  className?: string;
  size?: number;
};

export const GroupAvatar = ({ members, imageUrl, className, size = 40 }: GroupAvatarProps) => {
  // If custom image is set, use it
  if (imageUrl) {
    return (
      <Avatar className={cn("rounded-full", className)} style={{ width: size, height: size }}>
        <AvatarImage src={imageUrl} alt="Group icon" />
        <AvatarFallback>G</AvatarFallback>
      </Avatar>
    );
  }

  // Get first 3 active members with profiles
  const activeMembers = members
    .filter((m) => m.profile)
    .slice(0, 3)
    .map((m) => m.profile!);

  if (activeMembers.length === 0) {
    return (
      <Avatar className={cn("rounded-full", className)} style={{ width: size, height: size }}>
        <AvatarFallback>G</AvatarFallback>
      </Avatar>
    );
  }

  // Single member - show their avatar
  if (activeMembers.length === 1) {
    const member = activeMembers[0];
    return (
      <Avatar className={cn("rounded-full", className)} style={{ width: size, height: size }}>
        <AvatarImage src={member.imageUrl || undefined} />
        <AvatarFallback>
          {member.name?.charAt(0)?.toUpperCase() || "G"}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Multiple members - create collage
  const avatarSize = size / 2;
  const gap = 2;

  return (
    <div
      className={cn("relative rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800", className)}
      style={{ width: size, height: size }}
    >
      {activeMembers.length === 2 ? (
        // 2 members: side by side
        <div className="flex h-full">
          <div className="flex-1 border-r border-zinc-300 dark:border-zinc-700">
            <Avatar
              className="rounded-none h-full w-full"
              style={{ width: "100%", height: "100%" }}
            >
              <AvatarImage src={activeMembers[0].imageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {activeMembers[0].name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1">
            <Avatar
              className="rounded-none h-full w-full"
              style={{ width: "100%", height: "100%" }}
            >
              <AvatarImage src={activeMembers[1].imageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {activeMembers[1].name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      ) : (
        // 3+ members: 2x2 grid (top-left, top-right, bottom-left)
        <div className="grid grid-cols-2 h-full">
          <div className="border-r border-b border-zinc-300 dark:border-zinc-700">
            <Avatar
              className="rounded-none h-full w-full"
              style={{ width: "100%", height: "100%" }}
            >
              <AvatarImage src={activeMembers[0].imageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {activeMembers[0].name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="border-b border-zinc-300 dark:border-zinc-700">
            <Avatar
              className="rounded-none h-full w-full"
              style={{ width: "100%", height: "100%" }}
            >
              <AvatarImage src={activeMembers[1].imageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {activeMembers[1].name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="border-r border-zinc-300 dark:border-zinc-700">
            <Avatar
              className="rounded-none h-full w-full"
              style={{ width: "100%", height: "100%" }}
            >
              <AvatarImage src={activeMembers[2].imageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {activeMembers[2].name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {members.length > 3 ? `+${members.length - 3}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

