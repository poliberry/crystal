import type { Attachment, Member, Message, Profile, Server } from "@prisma/client";
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

export type NextApiResponseServerIo = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      pusher: any; // Pusher instance for backward compatibility
    };
  };
};
