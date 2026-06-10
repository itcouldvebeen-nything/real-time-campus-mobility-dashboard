import { RideStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: RideStatus, to: RideStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export async function getDriverProfileId(userId: string) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId } });
  return profile?.id ?? null;
}

export async function updateDriverRating(driverId: string) {
  const ratings = await prisma.rating.findMany({ where: { driverId } });
  const avg = ratings.length
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : 0;
  await prisma.driverProfile.update({
    where: { id: driverId },
    data: { averageRating: Math.round(avg * 10) / 10 },
  });
}

export function calculateFare(pickupLat: number, pickupLng: number, destLat: number, destLng: number): number {
  const R = 6371;
  const dLat = ((destLat - pickupLat) * Math.PI) / 180;
  const dLng = ((destLng - pickupLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((pickupLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const baseFare = 20;
  const perKm = 15;
  return Math.round(baseFare + distanceKm * perKm);
}
