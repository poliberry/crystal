// Set the database URL directly
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_8XWsA7nMlUcL@ep-orange-moon-a76x9o9o-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function grantAdminRole() {
  try {
    const memberId = "e0d62481-0b75-476f-976d-321c79416c94";
    
    console.log('Updating member role to ADMIN for:', memberId);
    
    // Update the member role to ADMIN (this works with the legacy admin system)
    const updatedMember = await db.member.update({
      where: { id: memberId },
      data: { role: 'ADMIN' },
      include: { profile: true }
    });
    
    console.log('✅ Member role updated to ADMIN for:', updatedMember.profile.name);
    console.log('New role:', updatedMember.role);
    
    // Also grant ADMINISTRATOR permission in the new system
    await db.userPermission.upsert({
      where: {
        memberId_permission_scope_targetId: {
          memberId: memberId,
          permission: 'ADMINISTRATOR',
          scope: 'SERVER',
          targetId: updatedMember.serverId
        }
      },
      update: {
        grant: 'ALLOW'
      },
      create: {
        memberId: memberId,
        permission: 'ADMINISTRATOR',
        scope: 'SERVER',
        grant: 'ALLOW',
        targetId: updatedMember.serverId,
        assignedBy: updatedMember.profileId,
        reason: 'Admin role grant'
      }
    });
    
    console.log('✅ ADMINISTRATOR permission also granted in new system');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

grantAdminRole();
