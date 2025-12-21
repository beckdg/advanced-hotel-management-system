import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password';
import {
  ROLES,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  RoleName,
} from '../src/modules/rbac/rbac.constants';

const prisma = new PrismaClient();

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [ROLES.SUPER_ADMIN]: 'Full system access',
  [ROLES.HOTEL_MANAGER]: 'Hotel operations management',
  [ROLES.FRONT_DESK]: 'Front desk and guest services',
  [ROLES.HOUSEKEEPING]: 'Room cleaning and housekeeping',
  [ROLES.MAINTENANCE]: 'Property maintenance',
  [ROLES.FINANCE]: 'Billing and financial operations',
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'users.read': 'View user accounts',
  'users.update': 'Update user accounts',
  'reservations.read': 'View reservations',
  'reservations.update': 'Manage reservations',
  'rooms.read': 'View room status',
  'rooms.update': 'Manage room status',
  'billing.read': 'View billing records',
  'billing.update': 'Manage billing records',
};

async function main() {
  console.log('Seeding database...');

  for (const permission of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission },
      update: { description: PERMISSION_DESCRIPTIONS[permission] },
      create: {
        name: permission,
        description: PERMISSION_DESCRIPTIONS[permission],
      },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map((p) => [p.name, p.id]));

  for (const [roleName, rolePermissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName as RoleName] },
      create: {
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName as RoleName],
      },
    });

    for (const permissionName of rolePermissions) {
      const permissionId = permissionMap.get(permissionName);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { name: ROLES.SUPER_ADMIN },
  });

  if (superAdminRole) {
    const adminEmail = 'admin@stayflow.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'System Admin',
          passwordHash: await hashPassword('Admin123!'),
          roleId: superAdminRole.id,
        },
      });
      console.log('Created default admin: admin@stayflow.com / Admin123!');
    }
  }

  console.log('Seeding completed.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
