import { Novu } from "@novu/api";
import { useNovu } from "@novu/react";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const novu = new Novu({
    secretKey: process.env.NOVU_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { notificationId, subscriberId } = await request.json();

        if (!notificationId || !subscriberId) {
            return NextResponse.json(
                { error: "Notification ID and subscriber ID are required" },
                { status: 400 }
            );
        }

        const tokenRes = await axios.post(`https://api.novu.co/v1/inbox/session`, {
            applicationIdentifier: '5yaf7M0vl7Lg',
            subscriber: {
                subscriberId,
            },
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `ApiKey ${process.env.NOVU_API_KEY}`,
            },
        });

        console.log(tokenRes.data);

        const token = tokenRes.data.token;

        // Mark notification as read using Novu API
        // The Novu API uses subscriber ID and notification ID to mark as read

        const archiveRes = await axios.patch(`https://api.novu.co/v1/inbox/notifications/${notificationId}/archive`, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (archiveRes.status === 200) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Failed to archive notification" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Error marking notification as read:", error);
        return NextResponse.json(
            { error: error.message || "Failed to mark notification as read" },
            { status: 500 }
        );
    }
}

