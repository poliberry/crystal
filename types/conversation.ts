export enum ConversationType {
  DIRECT_MESSAGE = "DIRECT_MESSAGE",
  GROUP_MESSAGE = "GROUP_MESSAGE"
}

export enum ChannelType {
  TEXT = "TEXT",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO"
}

export enum MemberRole {
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  GUEST = "GUEST"
}

export enum UserStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  IDLE = "IDLE",
  DO_NOT_DISTURB = "DO_NOT_DISTURB"
}

export enum NotificationType {
  MESSAGE = "MESSAGE",
  MENTION = "MENTION",
  FRIEND_REQUEST = "FRIEND_REQUEST"
}

export type Profile = {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Member = {
  id: string;
  role: MemberRole;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
  profile: Profile;
};

export type Message = {
  id: string;
  content: string;
  fileUrl?: string;
  memberId: string;
  channelId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  member: Member;
};

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Server = {
  id: string;
  name: string;
  imageUrl: string;
  inviteCode: string;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
  members: Member[];
  channels: Channel[];
};

export type Conversation = {
  id: string;
  name?: string;
  type: ConversationType;
  members: Member[];
  createdAt: Date;
  updatedAt: Date;
};

export type Notification = {
  id: string;
  profileId: string;
  type: NotificationType;
  viewed: boolean;
  serverId?: string;
  channelId?: string;
  messageId?: string;
  conversationId?: string;
  triggeredById?: string;
  createdAt: Date;
  updatedAt: Date;
};