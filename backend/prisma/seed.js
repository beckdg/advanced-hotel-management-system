"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const password_1 = require("../src/common/utils/password");
const rbac_constants_1 = require("../src/modules/rbac/rbac.constants");
const prisma = new client_1.PrismaClient();
const ROLE_DESCRIPTIONS = {
    [rbac_constants_1.ROLES.SUPER_ADMIN]: 'Full system access',
    [rbac_constants_1.ROLES.HOTEL_MANAGER]: 'Hotel operations management',
    [rbac_constants_1.ROLES.FRONT_DESK]: 'Front desk and guest services',
    [rbac_constants_1.ROLES.HOUSEKEEPING]: 'Room cleaning and housekeeping',
    [rbac_constants_1.ROLES.MAINTENANCE]: 'Property maintenance',
    [rbac_constants_1.ROLES.FINANCE]: 'Billing and financial operations',
};
const PERMISSION_DESCRIPTIONS = {
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
    for (const permission of rbac_constants_1.ALL_PERMISSIONS) {
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
    for (const [roleName, rolePermissions] of Object.entries(rbac_constants_1.ROLE_PERMISSIONS)) {
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: { description: ROLE_DESCRIPTIONS[roleName] },
            create: {
                name: roleName,
                description: ROLE_DESCRIPTIONS[roleName],
            },
        });
        for (const permissionName of rolePermissions) {
            const permissionId = permissionMap.get(permissionName);
            if (!permissionId)
                continue;
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
        where: { name: rbac_constants_1.ROLES.SUPER_ADMIN },
    });
    if (superAdminRole) {
        const adminEmail = 'admin@stayflow.com';
        const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!existingAdmin) {
            await prisma.user.create({
                data: {
                    email: adminEmail,
                    name: 'System Admin',
                    passwordHash: await (0, password_1.hashPassword)('Admin123!'),
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
//# sourceMappingURL=seed.js.map