import { Router } from 'express';
import { z } from 'zod';
import { DriverStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { getDriverProfileId } from '../services/rideService.js';

const router = Router();

router.get('/available', authenticate, async (_req, res) => {
  const drivers = await prisma.driverProfile.findMany({
    where: { status: DriverStatus.ONLINE, isVerified: true },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  });
  res.json(drivers);
});

router.patch('/status', authenticate, requireRole('DRIVER'), async (req: AuthRequest, res) => {
  const schema = z.object({
    status: z.enum(['ONLINE', 'OFFLINE', 'BUSY']),
    lat: z.number().optional(),
    lng: z.number().optional(),
  });
  try {
    const data = schema.parse(req.body);
    const profileId = await getDriverProfileId(req.user!.userId);
    if (!profileId) return res.status(404).json({ error: 'Driver profile not found' });

    const profile = await prisma.driverProfile.update({
      where: { id: profileId },
      data: {
        status: data.status as DriverStatus,
        ...(data.lat !== undefined && { currentLat: data.lat }),
        ...(data.lng !== undefined && { currentLng: data.lng }),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    const io = req.app.get('io');
    io.emit('driver:status', {
      driverId: profile.id,
      status: profile.status,
      lat: profile.currentLat,
      lng: profile.currentLng,
      name: profile.user.name,
    });

    res.json(profile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/location', authenticate, requireRole('DRIVER'), async (req: AuthRequest, res) => {
  const { lat, lng } = req.body;
  const profileId = await getDriverProfileId(req.user!.userId);
  if (!profileId) return res.status(404).json({ error: 'Driver profile not found' });

  const profile = await prisma.driverProfile.update({
    where: { id: profileId },
    data: { currentLat: lat, currentLng: lng },
  });

  const io = req.app.get('io');
  io.emit('driver:location', { driverId: profile.id, lat, lng });

  res.json(profile);
});

router.get('/dashboard', authenticate, requireRole('DRIVER'), async (req: AuthRequest, res) => {
  const profileId = await getDriverProfileId(req.user!.userId);
  if (!profileId) return res.status(404).json({ error: 'Driver profile not found' });

  const [profile, rides, ratings, hourlyStats] = await Promise.all([
    prisma.driverProfile.findUnique({
      where: { id: profileId },
      include: { user: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.ride.findMany({
      where: { driverId: profileId },
      orderBy: { requestedAt: 'desc' },
      take: 50,
      include: {
        passenger: { select: { name: true } },
        rating: true,
      },
    }),
    prisma.rating.findMany({
      where: { driverId: profileId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        passenger: { select: { name: true } },
        ride: { select: { pickupLocation: true, destination: true } },
      },
    }),
    prisma.ride.findMany({
      where: { driverId: profileId, status: 'COMPLETED' },
      select: { requestedAt: true, fare: true },
    }),
  ]);

  const activeRides = rides.filter((r) =>
    ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)
  );
  const completedRides = rides.filter((r) => r.status === 'COMPLETED');
  const totalEarnings = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);

  const hourCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;
  hourlyStats.forEach((r) => {
    const hour = new Date(r.requestedAt).getHours();
    hourCounts[hour]++;
  });

  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    profile,
    stats: {
      totalRides: profile!.totalRides,
      activeRides: activeRides.length,
      completedRides: completedRides.length,
      totalEarnings,
      averageRating: profile!.averageRating,
    },
    activeRides,
    rideHistory: rides,
    ratings,
    peakHours,
  });
});

export default router;
