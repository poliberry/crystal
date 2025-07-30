import { roomService } from "@/lib/livekit-room-service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const roomName = searchParams.get("room");

        if (!roomName) {
            return new Response("Room name is missing.", { status: 400 });
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