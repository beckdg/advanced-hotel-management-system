import { PrismaClient, RoomStatus } from '@prisma/client';
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
  'hotels.read': 'View hotels',
  'hotels.write': 'Manage hotels',
  'rooms.read': 'View rooms and room types',
  'rooms.write': 'Manage rooms and room types',
  'amenities.read': 'View amenities',
  'amenities.write': 'Manage amenities',
  'billing.read': 'View billing records',
  'billing.update': 'Manage billing records',
};

async function seedRolesAndPermissions() {
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
}

async function seedHotelData() {
  const existingHotel = await prisma.hotel.findFirst({ where: { name: 'StayFlow Grand Hotel' } });
  if (existingHotel) {
    console.log('Sample hotel data already exists, skipping.');
    return;
  }

  const hotel = await prisma.hotel.create({
    data: {
      name: 'StayFlow Grand Hotel',
      address: '123 Hospitality Boulevard',
      city: 'San Francisco',
      country: 'USA',
      phone: '+1-415-555-0100',
      email: 'info@stayflowgrand.com',
      timezone: 'America/Los_Angeles',
    },
  });

  const floors = await Promise.all(
    [
      { name: 'Ground Floor', floorNumber: 0 },
      { name: 'First Floor', floorNumber: 1 },
      { name: 'Second Floor', floorNumber: 2 },
    ].map((floor) =>
      prisma.floor.create({
        data: { ...floor, hotelId: hotel.id },
      }),
    ),
  );

  const roomTypes = await Promise.all(
    [
      {
        name: 'Standard King',
        description: 'Comfortable king room with city view',
        maxOccupancy: 2,
        baseRate: 149.99,
      },
      {
        name: 'Deluxe Suite',
        description: 'Spacious suite with living area',
        maxOccupancy: 4,
        baseRate: 299.99,
      },
      {
        name: 'Executive Room',
        description: 'Premium room with workspace',
        maxOccupancy: 2,
        baseRate: 199.99,
      },
    ].map((rt) =>
      prisma.roomType.create({
        data: { ...rt, hotelId: hotel.id },
      }),
    ),
  );

  const amenities = await Promise.all(
    [
      { name: 'Wi-Fi', description: 'High-speed wireless internet' },
      { name: 'Mini Bar', description: 'In-room mini refrigerator' },
      { name: 'Air Conditioning', description: 'Climate control' },
      { name: 'Room Service', description: '24-hour room service' },
      { name: 'Safe', description: 'In-room electronic safe' },
    ].map((a) => prisma.amenity.create({ data: a })),
  );

  const roomConfigs = [
    { roomNumber: '101', floorIdx: 1, typeIdx: 0, status: RoomStatus.AVAILABLE },
    { roomNumber: '102', floorIdx: 1, typeIdx: 0, status: RoomStatus.OCCUPIED },
    { roomNumber: '103', floorIdx: 1, typeIdx: 2, status: RoomStatus.RESERVED },
    { roomNumber: '201', floorIdx: 2, typeIdx: 1, status: RoomStatus.DIRTY },
    { roomNumber: '202', floorIdx: 2, typeIdx: 1, status: RoomStatus.CLEANING },
    { roomNumber: 'G01', floorIdx: 0, typeIdx: 0, status: RoomStatus.OUT_OF_SERVICE },
  ];

  for (const config of roomConfigs) {
    const room = await prisma.room.create({
      data: {
        hotelId: hotel.id,
        roomNumber: config.roomNumber,
        floorId: floors[config.floorIdx].id,
        roomTypeId: roomTypes[config.typeIdx].id,
        status: config.status,
      },
    });

    await prisma.roomAmenity.createMany({
      data: amenities.slice(0, 3).map((a) => ({ roomId: room.id, amenityId: a.id })),
    });
  }

  console.log(`Created sample hotel: ${hotel.name} with ${floors.length} floors, ${roomTypes.length} room types, ${amenities.length} amenities`);
}

async function main() {
  console.log('Seeding database...');
  await seedRolesAndPermissions();
  await seedHotelData();
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
