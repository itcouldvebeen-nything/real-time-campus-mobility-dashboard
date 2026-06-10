import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CAMPUS_LOCATIONS = [
  { name: 'Main Gate', lat: 29.8647, lng: 77.8968 },
  { name: 'James Thomason Building', lat: 29.8675, lng: 77.8962 },
  { name: 'Library', lat: 29.8668, lng: 77.8975 },
  { name: 'Rajendra Bhawan', lat: 29.8655, lng: 77.8985 },
  { name: 'Convocation Hall', lat: 29.8680, lng: 77.8955 },
  { name: 'Hospital', lat: 29.8635, lng: 77.8990 },
  { name: 'Sports Complex', lat: 29.8620, lng: 77.8945 },
  { name: 'Cafeteria', lat: 29.8660, lng: 77.8960 },
];

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const passenger = await prisma.user.upsert({
    where: { email: 'passenger@test.com' },
    update: {},
    create: {
      email: 'passenger@test.com',
      password,
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      role: 'PASSENGER',
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@test.com' },
    update: {},
    create: {
      email: 'driver@test.com',
      password,
      name: 'Suresh Kumar',
      phone: '+91 98765 43211',
      role: 'DRIVER',
      driverProfile: {
        create: {
          vehicleNumber: 'UK-07-AB-1234',
          vehicleType: 'E-Rickshaw',
          licenseNumber: 'DL-2024-5678',
          isVerified: true,
          status: 'ONLINE',
          currentLat: 29.8660,
          currentLng: 77.8965,
        },
      },
    },
    include: { driverProfile: true },
  });

  const driver2 = await prisma.user.upsert({
    where: { email: 'driver2@test.com' },
    update: {},
    create: {
      email: 'driver2@test.com',
      password,
      name: 'Amit Singh',
      phone: '+91 98765 43212',
      role: 'DRIVER',
      driverProfile: {
        create: {
          vehicleNumber: 'UK-07-CD-5678',
          vehicleType: 'E-Rickshaw',
          licenseNumber: 'DL-2024-9012',
          isVerified: true,
          status: 'ONLINE',
          currentLat: 29.8650,
          currentLng: 77.8970,
        },
      },
    },
    include: { driverProfile: true },
  });

  if (driverUser.driverProfile) {
    for (let i = 0; i < 5; i++) {
      const pickup = CAMPUS_LOCATIONS[i % CAMPUS_LOCATIONS.length];
      const dest = CAMPUS_LOCATIONS[(i + 2) % CAMPUS_LOCATIONS.length];
      const ride = await prisma.ride.create({
        data: {
          passengerId: passenger.id,
          driverId: driverUser.driverProfile.id,
          pickupLocation: pickup.name,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          destination: dest.name,
          destLat: dest.lat,
          destLng: dest.lng,
          status: 'COMPLETED',
          fare: 35 + i * 5,
          requestedAt: new Date(Date.now() - (i + 1) * 86400000),
          acceptedAt: new Date(Date.now() - (i + 1) * 86400000 + 120000),
          startedAt: new Date(Date.now() - (i + 1) * 86400000 + 300000),
          completedAt: new Date(Date.now() - (i + 1) * 86400000 + 900000),
        },
      });
      await prisma.rating.create({
        data: {
          rideId: ride.id,
          driverId: driverUser.driverProfile.id,
          passengerId: passenger.id,
          score: 4 + (i % 2),
          feedback: i % 2 === 0 ? 'Great ride, very punctual!' : 'Smooth and comfortable.',
        },
      });
    }
    await prisma.driverProfile.update({
      where: { id: driverUser.driverProfile.id },
      data: { totalRides: 5, averageRating: 4.4 },
    });
  }

  console.log('Seed completed!');
  console.log('Demo accounts (password: password123):');
  console.log('  Passenger: passenger@test.com');
  console.log('  Driver 1:  driver@test.com');
  console.log('  Driver 2:  driver2@test.com');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
