import { Router } from 'express';
import { z } from 'zod';
import { DriverStatus, RideStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  canTransition,
  calculateFare,
  getDriverProfileId,
} from '../services/rideService.js';
import { paramId } from '../lib/params.js';

const router = Router();

const requestRideSchema = z.object({
  pickupLocation: z.string().min(1),
  pickupLat: z.number(),
  pickupLng: z.number(),
  destination: z.string().min(1),
  destLat: z.number(),
  destLng: z.number(),
  scheduledAt: z.string().datetime().optional(),
});

function emitRideUpdate(req: AuthRequest, ride: object, event = 'ride:update') {
  const io = req.app.get('io');
  io.emit(event, ride);
}

router.post('/request', authenticate, requireRole('PASSENGER'), async (req: AuthRequest, res) => {
  try {
    const data = requestRideSchema.parse(req.body);

    const activeRide = await prisma.ride.findFirst({
      where: {
        passengerId: req.user!.userId,
        status: { in: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'] },
      },
    });
    if (activeRide) {
      return res.status(400).json({ error: 'You already have an active ride' });
    }

    const fare = calculateFare(data.pickupLat, data.pickupLng, data.destLat, data.destLng);

    const ride = await prisma.ride.create({
      data: {
        passengerId: req.user!.userId,
        pickupLocation: data.pickupLocation,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        destination: data.destination,
        destLat: data.destLat,
        destLng: data.destLng,
        fare,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
      include: {
        passenger: { select: { id: true, name: true, phone: true } },
      },
    });

    emitRideUpdate(req, ride, 'ride:requested');
    res.status(201).json(ride);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to request ride' });
  }
});

router.get('/pending', authenticate, requireRole('DRIVER'), async (req: AuthRequest, res) => {
  const profileId = await getDriverProfileId(req.user!.userId);
  if (!profileId) return res.status(404).json({ error: 'Driver profile not found' });

  const profile = await prisma.driverProfile.findUnique({ where: { id: profileId } });
  if (profile?.status !== DriverStatus.ONLINE) {
    return res.json([]);
  }

  const rides = await prisma.ride.findMany({
    where: { status: RideStatus.REQUESTED, driverId: null },
    orderBy: { requestedAt: 'desc' },
    include: {
      passenger: { select: { id: true, name: true, phone: true } },
    },
  });
  res.json(rides);
});

router.get('/my', authenticate, async (req: AuthRequest, res) => {
  const where =
    req.user!.role === 'PASSENGER'
      ? { passengerId: req.user!.userId }
      : { driver: { userId: req.user!.userId } };

  const rides = await prisma.ride.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    include: {
      passenger: { select: { id: true, name: true, phone: true } },
      driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
      rating: true,
    },
  });
  res.json(rides);
});

router.get('/active', authenticate, async (req: AuthRequest, res) => {
  const where =
    req.user!.role === 'PASSENGER'
      ? { passengerId: req.user!.userId, status: { in: [RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] } }
      : { driver: { userId: req.user!.userId }, status: { in: [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] } };

  const ride = await prisma.ride.findFirst({
    where,
    include: {
      passenger: { select: { id: true, name: true, phone: true } },
      driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
      rating: true,
    },
  });
  res.json(ride);
});

router.get('/analytics/demand', authenticate, async (_req, res) => {
  const rides = await prisma.ride.findMany({
    select: { pickupLocation: true, requestedAt: true, status: true },
  });

  const locationCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;

  rides.forEach((r) => {
    locationCounts[r.pickupLocation] = (locationCounts[r.pickupLocation] || 0) + 1;
    hourCounts[new Date(r.requestedAt).getHours()]++;
  });

  const popularLocations = Object.entries(locationCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const hourlyDemand = Object.entries(hourCounts).map(([hour, count]) => ({
    hour: Number(hour),
    count,
  }));

  res.json({ totalRides: rides.length, popularLocations, hourlyDemand });
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const ride = await prisma.ride.findUnique({
    where: { id: paramId(req) },
    include: {
      passenger: { select: { id: true, name: true, phone: true } },
      driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
      rating: true,
    },
  });
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
});

router.post('/:id/accept', authenticate, requireRole('DRIVER'), async (req: AuthRequest, res) => {
  const rideId = paramId(req);
  const profileId = await getDriverProfileId(req.user!.userId);
  if (!profileId) return res.status(404).json({ error: 'Driver profile not found' });

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.status !== RideStatus.REQUESTED) {
    return res.status(400).json({ error: 'Ride is no longer available' });
  }
  if (ride.driverId) {
    return res.status(409).json({ error: 'Ride already assigned to another driver' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ride.updateMany({
        where: { id: rideId, status: RideStatus.REQUESTED, driverId: null },
        data: {
          driverId: profileId,
          status: RideStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });
      if (updated.count === 0) {
        throw new Error('CONFLICT');
      }
      await tx.driverProfile.update({
        where: { id: profileId },
        data: { status: DriverStatus.BUSY },
      });
      return tx.ride.findUnique({
        where: { id: rideId },
        include: {
          passenger: { select: { id: true, name: true, phone: true } },
          driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
        },
      });
    });

    emitRideUpdate(req, result!, 'ride:accepted');
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'CONFLICT') {
      return res.status(409).json({ error: 'Ride already assigned to another driver' });
    }
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

router.post('/:id/reject', authenticate, requireRole('DRIVER'), async (req: AuthRequest, res) => {
  res.json({ message: 'Ride rejected' });
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  const rideId = paramId(req);
  const { status, cancelReason } = req.body as { status: RideStatus; cancelReason?: string };

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { driver: true },
  });
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  const isPassenger = req.user!.userId === ride.passengerId;
  const isDriver = ride.driver?.userId === req.user!.userId;
  if (!isPassenger && !isDriver) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (!canTransition(ride.status, status)) {
    return res.status(400).json({ error: `Cannot transition from ${ride.status} to ${status}` });
  }

  if (status === 'CANCELLED' && ride.status === 'IN_PROGRESS' && isPassenger) {
    return res.status(400).json({ error: 'Cannot cancel ride in progress' });
  }

  const timestamps: Record<string, Date> = {};
  if (status === 'IN_PROGRESS') timestamps.startedAt = new Date();
  if (status === 'COMPLETED') timestamps.completedAt = new Date();
  if (status === 'CANCELLED') timestamps.cancelledAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ride.update({
      where: { id: rideId },
      data: { status, cancelReason, ...timestamps },
      include: {
        passenger: { select: { id: true, name: true, phone: true } },
        driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
      },
    });

    if (status === 'COMPLETED' && ride.driverId) {
      await tx.driverProfile.update({
        where: { id: ride.driverId },
        data: { totalRides: { increment: 1 }, status: DriverStatus.ONLINE },
      });
    }
    if (status === 'CANCELLED' && ride.driverId) {
      await tx.driverProfile.update({
        where: { id: ride.driverId },
        data: { status: DriverStatus.ONLINE },
      });
    }

    return result;
  });

  emitRideUpdate(req, updated, `ride:${status.toLowerCase()}`);
  res.json(updated);
});

export default router;
