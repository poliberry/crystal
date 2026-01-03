import { Novu } from "@novu/api";
import { NextRequest, NextResponse } from "next/server";

const novu = new Novu({
    secretKey: process.env.NOVU_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { 
            title, 
            body, 
            imageUrl, 
            subscriberId, 
            conversationId, 
            conversationName, 
            callerName, 
            callerId, 
            isVideo 
        } = await request.json();

        if (!subscriberId) {
            return NextResponse.json({ success: false, error: "subscriberId is required" }, { status: 400 });
        }

        const result = await novu.trigger({
            to: {
                subscriberId: subscriberId,
            },
            payload: {
                type: "incoming-dm-call",
                title: title || "Incoming Call",
                body: body || "You have an incoming call",
                imageUrl: imageUrl || "",
                conversationId: conversationId || "",
                conversationName: conversationName || "Direct Message",
                callerName: callerName || "Unknown",
                callerId: callerId || "",
                isVideo: `${isVideo}` || 'false',
            },
            workflowId: "incoming-dm-call",
        });

        return NextResponse.json(
            result.result.status === "processed" 
                ? { success: true } 
                : { success: false, error: "Notification not processed" }
        );
    } catch (error) {
        console.error("Error sending call notification:", error);
        return NextResponse.json(
            { success: false, error: "Failed to send notification" }, 
            { status: 500 }
        );
    }
}