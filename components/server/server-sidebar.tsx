import { ChannelType } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Radio, Megaphone } from "lucide-react";
import { redirect } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType } from "@/types/permissions";

import { ServerChannelListSimple } from "./server-channel-list-simple-buttons";
import { ServerHeader } from "./server-header";
import { ServerSearch } from "./server-search";
import { SignedIn } from "@clerk/nextjs";
import { UserCard } from "../navigation/user-card";

type ServerSidebarProps = {
  serverId: string;
};

const iconMap = {
  [ChannelType.TEXT]: <Hash className="mr-2 h-4 w-4" />,
  [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4" />,
  [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4" />,
  [ChannelType.STAGE]: <Radio className="mr-2 h-4 w-4" />,
  [ChannelType.ANNOUNCEMENT]: <Megaphone className="mr-2 h-4 w-4" />,
};

const getRoleIcon = (member: any) => {
  // Temporarily fallback to old role system while we verify the database
  if (member.role === 'ADMIN') {
    return <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />;
  }
  if (member.role === 'MODERATOR') {
    return <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />;
  }
  
  // TODO: Once database is verified, use this permission-based logic:
  // Check if member has administrator permission
  // if (member.memberRoles?.some((mr: any) => 
  //   mr.role.permissions?.some((p: any) => p.permission === 'ADMINISTRATOR' && p.grant === 'ALLOW')
  // )) {
  //   return <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />;
  // }
  
  // Check if member has moderation permissions
  // if (member.memberRoles?.some((mr: any) => 
  //   mr.role.permissions?.some((p: any) => 
  //     ['KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_MESSAGES'].includes(p.permission) && p.grant === 'ALLOW'
  //   )
  // )) {
  //   return <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />;
  // }
  
  return null;
};

export const ServerSidebar = async ({ serverId }: ServerSidebarProps) => {
  const profile = await currentProfile();

  if (!profile) redirect("/");

  // Get server details
  const server = await db.server.findFirst({
    id: serverId,
  });

  if (!server) redirect("/");

  // Get channels for this server (remove any potential sorting)
  // For now, use Prisma to avoid DNS issues during build
  // TODO: Migrate to ScyllaDB via API routes for better separation
  let channels: any[] = [];
  let categories: any[] = [];
  let members: any[] = [];

  try {
    channels = await db.channel.findMany({
      where: { serverId: serverId },
    });
    console.log('[ServerSidebar] Fetched channels:', channels?.length, channels);
    console.log('[ServerSidebar] Channel types found:', channels?.map((c: any) => ({ name: c.name, type: c.type })));
  } catch (error) {
    console.error('Error fetching channels, using empty array:', error);
    channels = [];
  }

  try {
    categories = await db.category.findMany({
      where: { serverId: serverId },
    });
    console.log('[ServerSidebar] Fetched categories:', categories?.length, categories);
  } catch (error) {
    console.error('Error fetching categories, using empty array:', error);
    categories = [];
  }

  try {
    members = await db.member.findMany({
      where: { serverId: serverId },
    });
    console.log('[ServerSidebar] Fetched members:', members?.length, members);
  } catch (error) {
    console.error('Error fetching members, using empty array:', error);
    members = [];
  }

  // For now, we'll skip the complex profile joins and role includes
  // TODO: Implement proper joins when we add support for them

  // Group channels by category and sort in JavaScript
  const channelsByCategory = channels.reduce((acc: any, channel: any) => {
    // Handle null, undefined, or empty string categoryId
    const categoryId = (channel.categoryId && channel.categoryId.trim() !== '') ? channel.categoryId : 'uncategorized';
    console.log('[ServerSidebar] Channel categorization:', {
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.type,
      originalCategoryId: channel.categoryId,
      resolvedCategoryId: categoryId
    });
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(channel);
    return acc;
  }, {});

  console.log('[ServerSidebar] Channels by category:', channelsByCategory);
  console.log('[ServerSidebar] Uncategorized channels:', channelsByCategory['uncategorized']);

  // Sort channels within each category by position
  Object.keys(channelsByCategory).forEach(categoryId => {
    channelsByCategory[categoryId].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  });

  // Structure categories with their channels and sort categories by position
  
  const structuredCategories = [
    // Uncategorized channels first
    ...(channelsByCategory['uncategorized'] ? [{
      id: 'uncategorized',
      name: 'CHANNELS',
      position: -1,
      channels: channelsByCategory['uncategorized'] || []
    }] : []),
    // Then actual categories
    ...categories
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0)) // Sort categories by position
      .map((category: any) => ({
        id: category.id,
        name: category.name.toUpperCase(),
        position: category.position || 0,
        channels: channelsByCategory[category.id] || []
      }))
  ];

  // Fallback: if no structured categories but we have channels, create a simple structure
  if (structuredCategories.length === 0 && channels.length > 0) {
    
    // Add TEXT channels
    if (channels.some((channel: any) => channel.type === 'TEXT')) {
      structuredCategories.push({
        id: 'fallback-text',
        name: 'TEXT CHANNELS',
        position: 0,
        channels: channels.filter((channel: any) => channel.type === 'TEXT')
      });
    }
    
    // Add AUDIO channels
    if (channels.some((channel: any) => channel.type === 'AUDIO')) {
      structuredCategories.push({
        id: 'fallback-audio',
        name: 'VOICE CHANNELS',
        position: 1,
        channels: channels.filter((channel: any) => channel.type === 'AUDIO')
      });
    }
    
    // Add VIDEO channels
    if (channels.some((channel: any) => channel.type === 'VIDEO')) {
      structuredCategories.push({
        id: 'fallback-video',
        name: 'VIDEO CHANNELS',
        position: 2,
        channels: channels.filter((channel: any) => channel.type === 'VIDEO')
      });
    }
  }

  console.log('[ServerSidebar] Final structured categories after fallback:', structuredCategories);

  const textChannels = channels.filter(
    (channel) => channel.type === 'TEXT'
  );
  const audioChannels = channels.filter(
    (channel) => channel.type === 'AUDIO'
  );
  const videoChannels = channels.filter(
    (channel) => channel.type === 'VIDEO'
  );
  const filteredMembers = members.filter(
    (member) => member.profileId !== profile.id
  );

  const currentMember = members.find(
    (member) => member.profileId === profile.id
  );
  
  if (!currentMember) redirect("/");

  // Simplified permission check for now
  const canManageChannels = currentMember.role === 'ADMIN' || currentMember.role === 'MODERATOR';
  
  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-r border-l border-muted">
      <ServerHeader 
        server={server} 
        member={currentMember}
        canManageChannels={canManageChannels}
      />
      <ScrollArea className="flex-1 px-3 backdrop-blur-2xl bg-white/20 dark:bg-black/20 pt-4 -mt-4">
        <div className="mt-2">
          <ServerSearch
            data={[
              {
                label: "Text Channels",
                type: "channel",
                data: textChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type as keyof typeof iconMap],
                })),
              },
              {
                label: "Voice Channels",
                type: "channel",
                data: audioChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type as keyof typeof iconMap],
                })),
              },
              {
                label: "Video Channels",
                type: "channel",
                data: videoChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type as keyof typeof iconMap],
                })),
              },
              {
                label: "Members",
                type: "member",
                data: filteredMembers?.map((member) => ({
                  id: member.id,
                  name: `Member ${member.id.slice(0, 8)}`, // Temporary until we add profile joins
                  icon: getRoleIcon(member),
                })),
              },
            ]}
          />

          <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
          <div className="mb-2">
            <ServerChannelListSimple
              categories={structuredCategories}
              member={currentMember}
              server={{ ...server, members: [] } as any} // Simplified server object
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
