import { PrismaClient } from '@prisma/client';
import { 
  ProfileQueries, 
  ServerQueries, 
  MemberQueries, 
  ChannelQueries, 
  MessageQueries,
  fromUuidString 
} from './scylla-queries';
import { initializeSchema } from './scylla-init';

// Initialize Prisma client for reading existing data
const prisma = new PrismaClient();

interface MigrationStats {
  profiles: number;
  servers: number;
  members: number;
  channels: number;
  messages: number;
  errors: string[];
}

export async function migrateAllData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    profiles: 0,
    servers: 0,
    members: 0,
    channels: 0,
    messages: 0,
    errors: []
  };

  try {
    console.log('🚀 Starting data migration from PostgreSQL to ScyllaDB...');
    
    // Initialize ScyllaDB schema
    console.log('📋 Initializing ScyllaDB schema...');
    const schemaReady = await initializeSchema();
    if (!schemaReady) {
      throw new Error('Failed to initialize ScyllaDB schema');
    }

    // Migrate Profiles
    console.log('👤 Migrating profiles...');
    const profiles = await prisma.profile.findMany();
    for (const profile of profiles) {
      try {
        await ProfileQueries.create({
          id: fromUuidString(profile.id),
          user_id: profile.userId,
          name: profile.name,
          global_name: profile.globalName || undefined,
          image_url: profile.imageUrl,
          email: profile.email,
          custom_css: profile.customCss || undefined,
          status: profile.status,
          prev_status: profile.prevStatus || undefined,
          bio: profile.bio || undefined,
          presence_status: profile.presenceStatus || undefined,
          pronouns: profile.pronouns || undefined,
          banner_url: profile.bannerUrl || undefined,
          allow_non_friend_dms: profile.allowNonFriendDMs,
          friend_request_privacy: profile.friendRequestPrivacy,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt
        });
        stats.profiles++;
      } catch (error) {
        stats.errors.push(`Profile ${profile.id}: ${error}`);
        console.error(`❌ Failed to migrate profile ${profile.id}:`, error);
      }
    }
    console.log(`✅ Migrated ${stats.profiles} profiles`);

    // Migrate Servers
    console.log('🏠 Migrating servers...');
    const servers = await prisma.server.findMany();
    for (const server of servers) {
      try {
        await ServerQueries.create({
          id: fromUuidString(server.id),
          name: server.name,
          image_url: server.imageUrl,
          invite_code: server.inviteCode,
          profile_id: fromUuidString(server.profileId),
          created_at: server.createdAt,
          updated_at: server.updatedAt
        });
        stats.servers++;
      } catch (error) {
        stats.errors.push(`Server ${server.id}: ${error}`);
        console.error(`❌ Failed to migrate server ${server.id}:`, error);
      }
    }
    console.log(`✅ Migrated ${stats.servers} servers`);

    // Migrate Members
    console.log('👥 Migrating members...');
    const members = await prisma.member.findMany();
    for (const member of members) {
      try {
        await MemberQueries.create({
          id: fromUuidString(member.id),
          server_id: fromUuidString(member.serverId),
          profile_id: fromUuidString(member.profileId),
          role: member.role,
          created_at: member.createdAt,
          updated_at: member.updatedAt
        });
        stats.members++;
      } catch (error) {
        stats.errors.push(`Member ${member.id}: ${error}`);
        console.error(`❌ Failed to migrate member ${member.id}:`, error);
      }
    }
    console.log(`✅ Migrated ${stats.members} members`);

    // Migrate Channels
    console.log('📺 Migrating channels...');
    const channels = await prisma.channel.findMany();
    for (const channel of channels) {
      try {
        await ChannelQueries.create({
          id: fromUuidString(channel.id),
          server_id: fromUuidString(channel.serverId),
          profile_id: fromUuidString(channel.profileId),
          name: channel.name,
          type: channel.type,
          position: channel.position,
          category_id: channel.categoryId ? fromUuidString(channel.categoryId) : undefined,
          created_at: channel.createdAt,
          updated_at: channel.updatedAt
        });
        stats.channels++;
      } catch (error) {
        stats.errors.push(`Channel ${channel.id}: ${error}`);
        console.error(`❌ Failed to migrate channel ${channel.id}:`, error);
      }
    }
    console.log(`✅ Migrated ${stats.channels} channels`);

    // Migrate Messages (with pagination to handle large datasets)
    console.log('💬 Migrating messages...');
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const messageBatch = await prisma.message.findMany({
        take: batchSize,
        skip: offset,
        orderBy: { createdAt: 'asc' }
      });

      if (messageBatch.length === 0) {
        hasMore = false;
        break;
      }

      for (const message of messageBatch) {
        try {
          await MessageQueries.create({
            id: fromUuidString(message.id),
            channel_id: fromUuidString(message.channelId),
            member_id: fromUuidString(message.memberId),
            content: message.content,
            deleted: message.deleted,
            created_at: message.createdAt,
            updated_at: message.updatedAt
          });
          stats.messages++;
        } catch (error) {
          stats.errors.push(`Message ${message.id}: ${error}`);
          console.error(`❌ Failed to migrate message ${message.id}:`, error);
        }
      }

      offset += batchSize;
      console.log(`📝 Migrated ${stats.messages} messages so far...`);

      if (messageBatch.length < batchSize) {
        hasMore = false;
      }
    }
    console.log(`✅ Migrated ${stats.messages} messages`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    stats.errors.push(`General error: ${error}`);
  } finally {
    await prisma.$disconnect();
  }

  return stats;
}

export async function validateMigration(): Promise<boolean> {
  try {
    console.log('🔍 Validating migration...');
    
    // Count records in both databases
    const prismaProfileCount = await prisma.profile.count();
    const prismaServerCount = await prisma.server.count();
    const prismaMemberCount = await prisma.member.count();
    const prismaChannelCount = await prisma.channel.count();
    const prismaMessageCount = await prisma.message.count();

    // For ScyllaDB, we'd need to implement count queries
    // This is a simplified validation
    console.log('📊 PostgreSQL/Prisma counts:');
    console.log(`  Profiles: ${prismaProfileCount}`);
    console.log(`  Servers: ${prismaServerCount}`);
    console.log(`  Members: ${prismaMemberCount}`);
    console.log(`  Channels: ${prismaChannelCount}`);
    console.log(`  Messages: ${prismaMessageCount}`);

    // TODO: Implement ScyllaDB counts and comparison
    console.log('⚠️ ScyllaDB validation not fully implemented yet');
    
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI interface for running migration
export async function runMigration() {
  console.log('🌟 Crystal Discord Clone - Data Migration Tool');
  console.log('================================================');
  
  const stats = await migrateAllData();
  
  console.log('\n📈 Migration Summary:');
  console.log(`✅ Profiles migrated: ${stats.profiles}`);
  console.log(`✅ Servers migrated: ${stats.servers}`);
  console.log(`✅ Members migrated: ${stats.members}`);
  console.log(`✅ Channels migrated: ${stats.channels}`);
  console.log(`✅ Messages migrated: ${stats.messages}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n🔍 Running validation...');
  const isValid = await validateMigration();
  
  if (isValid && stats.errors.length === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 You can now set USE_SCYLLA=true in your environment');
  } else {
    console.log('\n⚠️ Migration completed with issues. Please review the errors above.');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration().catch(console.error);
}
