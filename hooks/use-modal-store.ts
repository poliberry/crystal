import type { Channel, ChannelType, Server } from "@/types/conversation";
import { create } from "zustand";

export type ModalType =
  | "createServer"
  | "cssEditor"
  | "createCategory"
  | "invite"
  | "editServer"
  | "members"
  | "createChannel"
  | "leaveServer"
  | "deleteServer"
  | "deleteChannel"
  | "editChannel"
  | "messageFile"
  | "switchVoiceChannel"
  | "userSettings"
  | "dmCall"
  | "deleteMessage"
  | "createDirectMessage"
  | "setStatus"
  | "createGroup";

type ModalData = {
  server?: Server;
  channel?: Channel;
  channelType?: ChannelType;
  categoryId?: string;
  apiUrl?: string;
  query?: Record<string, any>;
  callData?: any;
  currentMember?: any;
  currentProfile?: any;
};

type ModalStore = {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
};

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ isOpen: false, type: null, data: {} }),
}));
