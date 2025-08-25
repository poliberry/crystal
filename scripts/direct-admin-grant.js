const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function grantAdminDirectly() {
  try {
    const memberId = "e0d62481-0b75-476f-976d-321c79416c94";
    
    console.log('Granting admin permission to member:', memberId);
    
    // First, check if the member exists
    const member = await db.member.findUnique({
      where: { id: memberId },
      include: { profile: true }
    });
    
    if (!member) {
      console.error('Member not found!');
      return;
    }
    
    console.log('Found member:', member.profile.name);
    
    // Grant ADMINISTRATOR permission
    await db.userPermission.upsert({
      where: {
        profileId_permission_scope_scopeId: {
          profileId: member.profileId,
          permission: 'ADMINISTRATOR',
          scope: 'SERVER',
          scopeId: member.serverId
        }
      },
      update: {
        granted: true
      },
      create: {
        profileId: member.profileId,
        permission: 'ADMINISTRATOR',
        scope: 'SERVER',
        scopeId: member.serverId,
        granted: true
      }
    });
    
    console.log('✅ Admin permission granted successfully!');
    
    // Verify the permission was granted
    const permission = await db.userPermission.findUnique({
      where: {
        profileId_permission_scope_scopeId: {
          profileId: member.profileId,
          permission: 'ADMINISTRATOR',
          scope: 'SERVER',
          scopeId: member.serverId
        }
      }
    });
    
    console.log('Verification:', permission);
    
  } catch (error) {
    console.error('Error granting admin permission:', error);
  } finally {
    await db.$disconnect();
  }
}

grantAdminDirectly();
