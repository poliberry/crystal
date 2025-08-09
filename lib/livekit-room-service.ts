import { RoomServiceClient } from "livekit-server-sdk";

// Validate environment variables
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

// Only create the client if all required environment variables are present
export const roomService = (LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) 
  ? new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null;