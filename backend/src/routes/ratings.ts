import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { updateDriverRating } from '../services/rideService.js';
import { paramId } from '../lib/params.js';

const router = Router();

const ratingSchema = z.object({
  rideId: z.string(),
  score: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
});

router.post('/', authenticate, requireRole('PASSENGER'), async (req: AuthRequest, res) => {
  try {
    const data = ratingSchema.parse(req.body);

    const ride = await prisma.ride.findUnique({
      where: { id: data.rideId },
      include: { rating: true },
    });

    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.passengerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (ride.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Can only rate completed rides' });
    }
    if (ride.rating) {
      return res.status(400).json({ error: 'Ride already rated' });
    }
    if (!ride.driverId) {
      return res.status(400).json({ error: 'No driver assigned to this ride' });
    }

    const rating = await prisma.rating.create({
      data: {
        rideId: data.rideId,
        driverId: ride.driverId,
        passengerId: req.user!.userId,
        score: data.score,
        feedback: data.feedback,
      },
      include: {
        passenger: { select: { name: true } },
      },
    });

    await updateDriverRating(ride.driverId);

    const io = req.app.get('io');
    io.emit('rating:new', rating);

    res.status(201).json(rating);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

router.get('/driver/:driverId', authenticate, async (req, res) => {
  const ratings = await prisma.rating.findMany({
    where: { driverId: paramId(req, 'driverId') },
    orderBy: { createdAt: 'desc' },
    include: {
      passenger: { select: { name: true } },
      ride: { select: { pickupLocation: true, destination: true } },
    },
  });
  res.json(ratings);
});

export default router;
