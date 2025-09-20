import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all memberships for this profile
    const members = await db.member.findMany({
      profileId: profile.id,
    });

    // Get servers for these memberships
    const servers = await Promise.all(
      members.map(async (member) => {
        const server = await db.server.findFirst({
          id: member.serverId,
        });
        return server;
      })
    );

    // Filter out null servers and return
    const validServers = servers.filter(server => server !== null);

    return NextResponse.json(validServers);
  } catch (error) {
    console.error("[SERVERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
