import { Novu } from "@novu/api";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const novu = new Novu({
    secretKey: process.env.NOVU_API_KEY,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
    const { redirectUrl, title, body, imageUrl, serverId, channelId, senderUserId, subscriberIds } = await request.json();

    if (!subscriberIds || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
        return NextResponse.json({ success: true, message: "No subscribers to notify" });
    }

    if (!channelId) {
        return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
    }

    // Filter subscribers based on notification settings, muted channels, and muted servers
    let filteredSubscriberIds: string[] = [];
    try {
        // Use the Convex HTTP client to query notification filters
        // Note: The API will be regenerated when Convex detects the new file
        filteredSubscriberIds = await convex.query("notificationFilters:filterSubscribers" as any, {
            subscriberIds: subscriberIds,
            channelId: channelId as any,
            serverId: serverId as any,
        });
    } catch (error) {
        console.error("Error filtering subscribers:", error);
        // If filtering fails, proceed with all subscribers (fail open)
        filteredSubscriberIds = subscriberIds;
    }

    if (filteredSubscriberIds.length === 0) {
        return NextResponse.json({ 
            success: true, 
            message: "No subscribers to notify after filtering",
            filteredCount: 0,
            totalCount: subscriberIds.length,
        });
    }

    // Send notification to each filtered subscriber
    const results = await Promise.allSettled(
        filteredSubscriberIds.map((subscriberId: string) =>
            novu.trigger({
                to: {
                    subscriberId: subscriberId,
                },
                payload: {
                    title: title,
                    body: body,
                    imageUrl: imageUrl,
                    redirectUrl: redirectUrl,
                    channelId: channelId,
                    senderUserId: senderUserId,
                },
                workflowId: "new-message",
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
        filteredCount: filteredSubscriberIds.length,
        excludedCount: subscriberIds.length - filteredSubscriberIds.length,
    });
}