import type { Attachment, Member, Message, Profile, Server, DirectMessage } from "@prisma/client";
import type { Server as NetServer, Socket } from "net";
import type { NextApiResponse } from "next";

export type ServerWithMembersWithProfiles = Server & {
  members: (Member & { profile: Profile })[];
};

export type MessageWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile;
  };
  attachments: Attachment[]; // Attachments associated with the message
};

export type DirectMessageWithProfile = DirectMessage & {
  member?: (Member & {
    profile: Profile;
  }) | null;
  profile: Profile; // Direct profile for profile-based messages
  attachments: Attachment[]; // Attachments associated with the message
};

export type NextApiResponseServerIo = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      pusher: any; // Pusher instance for backward compatibility
    };
  };
};
