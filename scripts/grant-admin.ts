import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantAdminToFirstMember() {
  try {
    // Get the first member in the database
    const member = await prisma.member.findFirst({
      select: {
        id: true,
        profileId: true,
        serverId: true
      }
    });

    if (!member) {
      console.log('No members found in database');
      return;
    }

    console.log('Found member:', member);

    // Grant ADMINISTRATOR permission
    const result = await prisma.userPermission.upsert({
      where: {
        memberId_permission_scope_targetId: {
          memberId: member.id,
          permission: 'ADMINISTRATOR',
          scope: 'SERVER',
          targetId: ''
        }
      },
      update: {
        grant: 'ALLOW',
        assignedBy: member.profileId
      },
      create: {
        memberId: member.id,
        permission: 'ADMINISTRATOR',
        scope: 'SERVER',
        targetId: null,
        grant: 'ALLOW',
        assignedBy: member.profileId
      }
    });

    console.log('Admin permission granted:', result);

    // Verify the permission was created
    const verification = await prisma.userPermission.findMany({
      where: {
        memberId: member.id,
        permission: 'ADMINISTRATOR'
      }
    });

    console.log('Verification - User permissions:', verification);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

grantAdminToFirstMember();
