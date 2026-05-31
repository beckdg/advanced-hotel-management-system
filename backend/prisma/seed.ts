import {
  PrismaClient,
  ReservationStatus,
  RoomStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  HousekeepingStatus,
  MaintenanceStatus,
  MaintenancePriority,
  NotificationType,
  NotificationChannel,
} from '@prisma/client';
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
  'guests.read': 'View guest profiles',
  'guests.write': 'Manage guest profiles',
  'reservations.read': 'View reservations',
  'reservations.write': 'Manage reservations and check-in/out',
  'hotels.read': 'View hotels',
  'hotels.write': 'Manage hotels',
  'rooms.read': 'View rooms and room types',
  'rooms.write': 'Manage rooms and room types',
  'amenities.read': 'View amenities',
  'amenities.write': 'Manage amenities',
  'housekeeping.read': 'View housekeeping tasks',
  'housekeeping.write': 'Manage housekeeping tasks',
  'maintenance.read': 'View maintenance requests',
  'maintenance.write': 'Manage maintenance requests',
  'billing.read': 'View billing records',
  'billing.write': 'Manage billing records',
  'notifications.read': 'View notifications',
  'audit.read': 'View audit logs',
  'reports.read': 'View operational reports',
};

const HOTELS = [
  {
    name: 'StayFlow Grand Hotel',
    address: '123 Hospitality Boulevard',
    city: 'San Francisco',
    country: 'USA',
    phone: '+1-415-555-0100',
    email: 'info@stayflowgrand.com',
    timezone: 'America/Los_Angeles',
  },
  {
    name: 'StayFlow Harbor Inn',
    address: '45 Marina Drive',
    city: 'Seattle',
    country: 'USA',
    phone: '+1-206-555-0200',
    email: 'frontdesk@harborinn.com',
    timezone: 'America/Los_Angeles',
  },
  {
    name: 'StayFlow Mountain Lodge',
    address: '900 Alpine Road',
    city: 'Denver',
    country: 'USA',
    phone: '+1-303-555-0300',
    email: 'reservations@mountainlodge.com',
    timezone: 'America/Denver',
  },
];

const GUEST_NAMES = [
  { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '+1-555-0101' },
  { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '+1-555-0102' },
  { firstName: 'Robert', lastName: 'Johnson', email: 'robert.j@example.com', phone: '+1-555-0103' },
  { firstName: 'Emily', lastName: 'Williams', email: 'emily.w@example.com', phone: '+1-555-0104' },
  { firstName: 'Michael', lastName: 'Brown', email: 'michael.b@example.com', phone: '+1-555-0105' },
  { firstName: 'Sarah', lastName: 'Davis', email: 'sarah.d@example.com', phone: '+1-555-0106' },
  { firstName: 'David', lastName: 'Miller', email: 'david.m@example.com', phone: '+1-555-0107' },
  { firstName: 'Lisa', lastName: 'Wilson', email: 'lisa.w@example.com', phone: '+1-555-0108' },
  { firstName: 'James', lastName: 'Taylor', email: 'james.t@example.com', phone: '+1-555-0109' },
  { firstName: 'Anna', lastName: 'Anderson', email: 'anna.a@example.com', phone: '+1-555-0110' },
  { firstName: 'Chris', lastName: 'Thomas', email: 'chris.t@example.com', phone: '+1-555-0111' },
  { firstName: 'Maria', lastName: 'Garcia', email: 'maria.g@example.com', phone: '+1-555-0112' },
];

async function seedRolesAndPermissions() {
  for (const permission of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission },
      update: { description: PERMISSION_DESCRIPTIONS[permission] },
      create: { name: permission, description: PERMISSION_DESCRIPTIONS[permission] },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map((p) => [p.name, p.id]));

  for (const [roleName, rolePermissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName as RoleName] },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName as RoleName] },
    });

    for (const permissionName of rolePermissions) {
      const permissionId = permissionMap.get(permissionName);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  const users = [
    { email: 'admin@stayflow.com', name: 'System Admin', role: ROLES.SUPER_ADMIN, password: 'Admin123!' },
    { email: 'manager@stayflow.com', name: 'Hotel Manager', role: ROLES.HOTEL_MANAGER, password: 'Manager123!' },
    { email: 'frontdesk@stayflow.com', name: 'Front Desk', role: ROLES.FRONT_DESK, password: 'Front123!' },
    { email: 'housekeeping@stayflow.com', name: 'Housekeeping Lead', role: ROLES.HOUSEKEEPING, password: 'Clean123!' },
    { email: 'maintenance@stayflow.com', name: 'Maintenance Tech', role: ROLES.MAINTENANCE, password: 'Fix123!' },
    { email: 'finance@stayflow.com', name: 'Finance Officer', role: ROLES.FINANCE, password: 'Bill123!' },
  ];

  for (const u of users) {
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (!role) continue;
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: await hashPassword(u.password),
        roleId: role.id,
      },
    });
  }
  console.log(`Seeded ${users.length} demo users`);
}

async function seedAmenities() {
  const names = ['Wi-Fi', 'Mini Bar', 'Air Conditioning', 'Room Service', 'Safe', 'Smart TV', 'Coffee Maker'];
  for (const a of names) {
    await prisma.amenity.upsert({
      where: { name: a },
      update: {},
      create: { name: a, description: `${a} amenity` },
    });
  }
  return prisma.amenity.findMany();
}

async function seedHotelsAndRooms(amenities: { id: string }[]) {
  const existing = await prisma.hotel.findFirst({ where: { name: HOTELS[0].name } });
  if (existing) {
    console.log('Hotels already seeded, skipping property data.');
    return prisma.hotel.findMany({ include: { rooms: true, floors: true, roomTypes: true } });
  }

  const hotels = [];
  for (const h of HOTELS) {
    const hotel = await prisma.hotel.create({ data: h });
    const floors = await Promise.all(
      ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'].map((name, i) =>
        prisma.floor.create({ data: { name, floorNumber: i, hotelId: hotel.id } }),
      ),
    );

    const roomTypes = await Promise.all(
      [
        { name: 'Standard King', description: 'King bed, city view', maxOccupancy: 2, baseRate: 149.99 },
        { name: 'Deluxe Suite', description: 'Suite with living area', maxOccupancy: 4, baseRate: 299.99 },
        { name: 'Executive Room', description: 'Workspace and premium amenities', maxOccupancy: 2, baseRate: 199.99 },
      ].map((rt) => prisma.roomType.create({ data: { ...rt, hotelId: hotel.id } })),
    );

    const statuses: RoomStatus[] = [
      RoomStatus.AVAILABLE,
      RoomStatus.OCCUPIED,
      RoomStatus.RESERVED,
      RoomStatus.DIRTY,
      RoomStatus.CLEANING,
      RoomStatus.OUT_OF_SERVICE,
    ];

    let roomNum = 100;
    for (const floor of floors.slice(1)) {
      for (let i = 0; i < 6; i++) {
        roomNum += 1;
        const room = await prisma.room.create({
          data: {
            hotelId: hotel.id,
            roomNumber: String(roomNum),
            floorId: floor.id,
            roomTypeId: roomTypes[i % roomTypes.length].id,
            status: statuses[i % statuses.length],
          },
        });
        await prisma.roomAmenity.createMany({
          data: amenities.slice(0, 4).map((a) => ({ roomId: room.id, amenityId: a.id })),
          skipDuplicates: true,
        });
      }
    }
    hotels.push(
      await prisma.hotel.findUniqueOrThrow({
        where: { id: hotel.id },
        include: { rooms: true, floors: true, roomTypes: true },
      }),
    );
  }
  console.log(`Created ${hotels.length} hotels with rooms`);
  return hotels;
}

async function seedGuests() {
  const count = await prisma.guest.count();
  if (count >= GUEST_NAMES.length) return prisma.guest.findMany();

  for (const g of GUEST_NAMES) {
    const existing = await prisma.guest.findFirst({ where: { email: g.email } });
    if (!existing) {
      await prisma.guest.create({ data: g });
    }
  }
  return prisma.guest.findMany();
}

async function seedReservationsAndBilling(
  hotels: Awaited<ReturnType<typeof seedHotelsAndRooms>>,
  guests: { id: string }[],
) {
  if ((await prisma.reservation.count()) > 5) {
    console.log('Reservations already seeded, skipping.');
    return;
  }

  const admin = await prisma.user.findUnique({ where: { email: 'admin@stayflow.com' } });
  const maintenanceUser = await prisma.user.findUnique({ where: { email: 'maintenance@stayflow.com' } });
  const hkUser = await prisma.user.findUnique({ where: { email: 'housekeeping@stayflow.com' } });

  const statuses: ReservationStatus[] = [
    ReservationStatus.PENDING,
    ReservationStatus.CONFIRMED,
    ReservationStatus.CHECKED_IN,
    ReservationStatus.CHECKED_OUT,
    ReservationStatus.CANCELLED,
  ];

  let resIndex = 0;
  for (const hotel of hotels) {
    const availableRooms = hotel.rooms.filter((r) => r.status !== RoomStatus.OUT_OF_SERVICE);
    for (let i = 0; i < Math.min(8, availableRooms.length); i++) {
      const room = availableRooms[i];
      const guest = guests[resIndex % guests.length];
      const status = statuses[resIndex % statuses.length];
      resIndex += 1;

      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + (i - 3) * 2);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3);

      const reservation = await prisma.reservation.create({
        data: {
          hotelId: hotel.id,
          roomId: room.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          status,
          totalGuests: 1 + (i % 3),
          notes: i % 2 === 0 ? 'VIP guest' : undefined,
          guests: { create: [{ guestId: guest.id, isPrimary: true }] },
        },
      });

      if ([ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT].includes(status)) {
        const nights = 3;
        const rate = Number(hotel.roomTypes[0]?.baseRate ?? 150);
        const subtotal = nights * rate;
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        const invoiceStatus =
          status === ReservationStatus.CHECKED_OUT ? InvoiceStatus.PAID : InvoiceStatus.ISSUED;

        const invoice = await prisma.invoice.create({
          data: {
            reservationId: reservation.id,
            status: invoiceStatus,
            subtotal,
            taxAmount: tax,
            totalAmount: total,
            issuedAt: new Date(),
            paidAt: invoiceStatus === InvoiceStatus.PAID ? new Date() : null,
            items: {
              create: [{
                description: `Room charge - ${nights} nights`,
                quantity: nights,
                unitPrice: rate,
                totalPrice: subtotal,
                category: 'ROOM',
              }],
            },
          },
        });

        if (invoiceStatus === InvoiceStatus.PAID) {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: total,
              method: PaymentMethod.CARD,
              status: PaymentStatus.COMPLETED,
              processedAt: new Date(),
              transactionReference: `TXN-${reservation.id.slice(0, 8)}`,
            },
          });
        }
      }

      if (room.status === RoomStatus.DIRTY && hkUser) {
        await prisma.housekeepingTask.create({
          data: {
            roomId: room.id,
            assignedToUserId: hkUser.id,
            status: HousekeepingStatus.DIRTY,
            notes: 'Post checkout cleaning',
          },
        });
      }

      if (room.status === RoomStatus.OUT_OF_SERVICE && maintenanceUser && admin) {
        await prisma.maintenanceRequest.create({
          data: {
            roomId: room.id,
            reportedByUserId: admin.id,
            assignedToUserId: maintenanceUser.id,
            title: 'HVAC repair needed',
            description: 'Air conditioning unit not cooling',
            priority: MaintenancePriority.HIGH,
            status: MaintenanceStatus.ASSIGNED,
          },
        });
      }
    }
  }

  if (admin) {
    for (const user of await prisma.user.findMany({ take: 3 })) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.RESERVATION_CREATED,
          channel: NotificationChannel.IN_APP,
          title: 'New reservation',
          message: 'A new reservation was created in the system.',
          readAt: null,
        },
      });
    }

    await prisma.auditLog.createMany({
      data: [
        { userId: admin.id, action: 'seed.completed', entity: 'System', entityId: 'seed' },
        { userId: admin.id, action: 'hotels.created', entity: 'Hotel', entityId: hotels[0]?.id },
        { userId: admin.id, action: 'reservations.created', entity: 'Reservation' },
      ],
    });
  }

  console.log('Created reservations, invoices, payments, housekeeping, maintenance, notifications');
}

async function main() {
  console.log('Seeding StayFlow database...');
  await seedRolesAndPermissions();
  const amenities = await seedAmenities();
  const hotels = await seedHotelsAndRooms(amenities);
  const guests = await seedGuests();
  await seedReservationsAndBilling(hotels, guests);
  console.log('Seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
