import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { hasPermission, ServerPermission } from "@/lib/server-permissions";

export async function POST(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();
    const { action, targetUserId } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channel = await db.channel.findUnique({
      where: {
        id: params.channelId,
      },
      include: {
        server: {
          include: {
            members: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!channel || channel.type !== "STAGE") {
      return new NextResponse("Invalid channel", { status: 400 });
    }

    const member = channel.server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Handle different stage actions
    switch (action) {
      case "request_to_speak":
        // Check if user can request to speak
        if (!hasPermission(member.role, ServerPermission.REQUEST_TO_SPEAK)) {
          return new NextResponse("No permission to request to speak", { status: 403 });
        }
        
        // In a real implementation, you would store this request in the database
        // For now, we'll just return success
        return NextResponse.json({ success: true, message: "Speaker request sent" });

      case "approve_speaker":
      case "deny_speaker":
      case "remove_speaker":
        // Check if user can manage stage
        if (!hasPermission(member.role, ServerPermission.MANAGE_STAGE)) {
          return new NextResponse("No permission to manage stage", { status: 403 });
        }
        
        // In a real implementation, you would update the target user's permissions
        return NextResponse.json({ success: true, message: `Speaker ${action} successful` });

      case "step_down":
        // Check if user can manage stage (only moderators/admins can step down)
        if (!hasPermission(member.role, ServerPermission.MANAGE_STAGE)) {
          return new NextResponse("No permission to step down", { status: 403 });
        }
        
        // In a real implementation, you would remove the user's speaking permissions
        // For now, we'll just return success
        return NextResponse.json({ success: true, message: "Successfully stepped down from stage" });

      default:
        return new NextResponse("Invalid action", { status: 400 });
    }
  } catch (error) {
    console.log("[STAGE_ACTION]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channel = await db.channel.findUnique({
      where: {
        id: params.channelId,
      },
      include: {
        server: {
          include: {
            members: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!channel || channel.type !== "STAGE") {
      return new NextResponse("Invalid channel", { status: 400 });
    }

    const member = channel.server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Get stage information (speakers, audience, pending requests)
    // In a real implementation, you would fetch this from the database
    // For now, we'll return mock data
    return NextResponse.json({
      speakers: [], // Array of user IDs who are currently speakers
      audience: [], // Array of user IDs in the audience
      pendingRequests: [], // Array of user IDs who have requested to speak
      userPermissions: {
        canRequestToSpeak: hasPermission(member.role, ServerPermission.REQUEST_TO_SPEAK),
        canManageStage: hasPermission(member.role, ServerPermission.MANAGE_STAGE),
      },
    });
  } catch (error) {
    console.log("[STAGE_INFO]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
