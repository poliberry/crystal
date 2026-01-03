import { Novu } from "@novu/api";
import { NextRequest, NextResponse } from "next/server";

const novu = new Novu({
    secretKey: process.env.NOVU_API_KEY,
});

export async function POST(request: NextRequest) {
    const { redirectUrl, title, body, imageUrl, conversationId } = await request.json();

    const result = await novu.trigger({
        to: {
            type: "Topic",
            topicKey: `group-${conversationId}`,
        },
        payload: {
            title: title,
            body: body,
            imageUrl: imageUrl,
            redirectUrl: redirectUrl,
        },
        workflowId: "new-group-message",
    })

    return NextResponse.json(result.result.status === "processed" ? { success: true } : { success: false });
}