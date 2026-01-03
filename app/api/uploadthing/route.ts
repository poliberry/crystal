import { createRouteHandler } from "uploadthing/next";
import { NextRequest, NextResponse } from "next/server";

import { appFileRouter } from "./core";
import { UTApi } from "uploadthing/server";

// Make this route public and accessible for webhooks
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createRouteHandler({
  router: appFileRouter,
  config: {
    uploadthingId: process.env.UPLOADTHING_APP_ID!,
    uploadthingSecret: process.env.UPLOADTHING_SECRET!,
    callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/uploadthing`,
  },
});

// Handle OPTIONS for CORS preflight (needed for webhooks)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-uploadthing-hook",
    },
  });
}

// Wrap handlers to ensure webhooks are accessible
export async function GET(request: NextRequest) {
  try {
    return await handler.GET(request);
  } catch (error) {
    console.error("UploadThing GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handler.POST(request);
  } catch (error) {
    console.error("UploadThing POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const utapi = new UTApi();