import { roomService } from "@/lib/livekit-room-service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const roomName = searchParams.get("room");

        if (!roomName) {
            return new Response("Room name is missing.", { status: 400 });
        }

        // Check if LiveKit is properly configured
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.NEXT_PUBLIC_LIVEKIT_URL) {
            console.error("[ROOMS_GET]: LiveKit environment variables not configured");
            return new Response("LiveKit not configured.", { status: 500 });
        }

        // Assuming roomService is already imported and initialized
        const room = await roomService.listParticipants(roomName);

        if (!room) {
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(room), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("[ROOMS_GET]: ", error);
        return new Response("Internal Server Error.", { status: 500 });
    }
}