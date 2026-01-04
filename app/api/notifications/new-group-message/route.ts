import { Novu } from "@novu/api";
import { NextRequest, NextResponse } from "next/server";

const novu = new Novu({
    secretKey: process.env.NOVU_API_KEY,
});

export async function POST(request: NextRequest) {
    const { redirectUrl, title, body, imageUrl, conversationId, senderUserId, subscriberIds } = await request.json();

    if (!subscriberIds || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
        return NextResponse.json({ success: true, message: "No subscribers to notify" });
    }

    // Send notification to each subscriber
    const results = await Promise.allSettled(
        subscriberIds.map((subscriberId: string) =>
            novu.trigger({
                to: {
                    subscriberId: subscriberId,
                },
                payload: {
                    title: title,
                    body: body,
                    imageUrl: imageUrl,
                    redirectUrl: redirectUrl,
                    conversationId: conversationId,
                    senderUserId: senderUserId,
                },
                workflowId: "new-group-message",
            })
        )
    );

    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failedCount = results.filter(r => r.status === "rejected").length;

    return NextResponse.json({
        success: successCount > 0,
        successCount,
        failedCount,
        total: subscriberIds.length,
    });
}