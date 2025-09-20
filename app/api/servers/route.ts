import { NextResponse, type NextRequest } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/invite-code";
import { MemberRole, ChannelType } from "@/lib/constants";

// Default permissions for the server owner role
const OWNER_PERMISSIONS = [
  'ADMINISTRATOR',
  'VIEW_CHANNELS',
  'MANAGE_CHANNELS',
  'MANAGE_ROLES',
  'MANAGE_SERVER', // Changed from MANAGE_GUILD to match frontend
  'VIEW_AUDIT_LOG',
  'VIEW_GUILD_INSIGHTS',
  'MANAGE_WEBHOOKS',
  'CREATE_INSTANT_INVITE',
  'CHANGE_NICKNAME',
  'MANAGE_NICKNAMES',
  'KICK_MEMBERS',
  'BAN_MEMBERS',
  'SEND_MESSAGES',
  'EMBED_LINKS',
  'ATTACH_FILES',
  'READ_MESSAGE_HISTORY',
  'MENTION_EVERYONE',
  'USE_EXTERNAL_EMOJIS',
  'CONNECT',
  'SPEAK',
  'MUTE_MEMBERS',
  'DEAFEN_MEMBERS',
  'MOVE_MEMBERS',
  'USE_VAD'
];

// Default permissions for @everyone role (basic member permissions)
const EVERYONE_PERMISSIONS = [
  'VIEW_CHANNELS',
  'CREATE_INSTANT_INVITE',
  'CHANGE_NICKNAME',
  'SEND_MESSAGES',
  'EMBED_LINKS',
  'ATTACH_FILES',
  'READ_MESSAGE_HISTORY',
  'USE_EXTERNAL_EMOJIS',
  'CONNECT',
  'SPEAK',
  'USE_VAD'
];

export async function POST(req: NextRequest) {
  try {
    const { name, imageUrl } = await req.json();

    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    console.log('Creating server with enhanced role system...');
    console.log('DB instance check:', {
      hasDb: !!db,
      hasCategory: !!db?.category,
      hasRole: !!db?.role,
      hasServer: !!db?.server,
      dbKeys: db ? Object.keys(db) : 'no db'
    });

    // Create the server
    const server = await db.server.create({
      data: {
        profileId: profile.id,
        name,
        imageUrl: imageUrl,
        inviteCode: generateInviteCode(),
      },
    });

    console.log('Server created:', server.id);

    // Create the "General" category
    const generalCategory = await db.category.create({
      data: {
        serverId: server.id,
        name: "General",
        position: 0, // Ensure position is stored as an integer
      },
    });

    console.log('General category created:', generalCategory.id);

    // Create @everyone role (default role for all members)
    const everyoneRole = await db.role.create({
      data: {
        serverId: server.id,
        name: "@everyone",
        color: "#99aab5",
        position: 0,
        hoisted: false,
        mentionable: false,
      },
    });

    console.log('Everyone role created:', everyoneRole.id);

    // Create server owner role
    const ownerRole = await db.role.create({
      data: {
        serverId: server.id,
        name: "Server Owner",
        color: "#f04747",
        position: 1000,
        hoisted: true,
        mentionable: false,
      },
    });

    console.log('Owner role created:', ownerRole.id);

    // Add permissions to @everyone role
    const everyonePermissions = await Promise.all(
      EVERYONE_PERMISSIONS.map(permission =>
        db.rolePermission.create({
          data: {
            roleId: everyoneRole.id,
            permission,
            scope: 'server',
            grantType: 'allow',
            targetId: server.id, // For server-level permissions, target is the server
          },
        })
      )
    );

    console.log('Everyone permissions created:', everyonePermissions.length);

    // Add permissions to owner role
    const ownerPermissions = await Promise.all(
      OWNER_PERMISSIONS.map(permission =>
        db.rolePermission.create({
          data: {
            roleId: ownerRole.id,
            permission,
            scope: 'server',
            grantType: 'allow',
            targetId: server.id, // For server-level permissions, target is the server
          },
        })
      )
    );

    console.log('Owner permissions created:', ownerPermissions.length);

    // Create the admin member record
    const member = await db.member.create({
      data: {
        serverId: server.id,
        profileId: profile.id,
        role: 'ADMIN', // Basic role designation
      },
    });

    console.log('Member created:', member);

    // Since we don't have a member_roles junction table yet, we'll need to implement
    // a way to check if a member has the owner role. For now, we can check if the
    // member's profileId matches the server's profileId (server owner)
    // TODO: Implement proper member-role assignments in the future

    // Create default channels in the General category
    const textChannel = await db.channel.create({
      data: {
        name: "general",
        type: 'TEXT', // Use string instead of ChannelType.TEXT
        serverId: server.id,
        profileId: profile.id,
        categoryId: generalCategory.id,
        position: 0,
      },
    });

    console.log('Text channel created:', textChannel.id);

    const voiceChannel = await db.channel.create({
      data: {
        name: "General",
        type: 'AUDIO', // Use string instead of ChannelType.AUDIO
        serverId: server.id,
        profileId: profile.id,
        categoryId: generalCategory.id,
        position: 1,
      },
    });

    console.log('Voice channel created:', voiceChannel.id);

    // Return the server with full structure
    return NextResponse.json({
      ...server,
      categories: [generalCategory],
      roles: [everyoneRole, ownerRole],
      members: [{
        ...member,
        roles: [ownerRole],
        profile: {
          id: profile.id,
          name: profile.name,
          imageUrl: profile.imageUrl,
        }
      }],
      channels: [textChannel, voiceChannel]
    });
  } catch (error: unknown) {
    console.error("[SERVERS_POST]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
