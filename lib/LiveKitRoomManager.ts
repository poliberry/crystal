// lib/LiveKitRoomManager.ts
import { Room } from "livekit-client";

let room: Room | null = null;

export function getLiveKitRoom(): Room {
  if (!room) {
    room = new Room();
  }
  return room;
}

export function disconnectLiveKitRoom() {
  room?.disconnect();
  room = null;
}
