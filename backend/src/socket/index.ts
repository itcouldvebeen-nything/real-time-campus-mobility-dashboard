import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: 'PASSENGER' | 'DRIVER';
}

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      socket.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.userId} (${socket.role})`);

    socket.join(`user:${socket.userId}`);
    if (socket.role === 'DRIVER') {
      socket.join('drivers');
    }
    if (socket.role === 'PASSENGER') {
      socket.join('passengers');
    }

    socket.on('ride:subscribe', (rideId: string) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on('ride:unsubscribe', (rideId: string) => {
      socket.leave(`ride:${rideId}`);
    });

    socket.on('driver:goOnline', async (data: { lat?: number; lng?: number }) => {
      if (socket.role !== 'DRIVER') return;
      const profile = await prisma.driverProfile.findUnique({
        where: { userId: socket.userId },
        include: { user: { select: { name: true } } },
      });
      if (!profile) return;

      const updated = await prisma.driverProfile.update({
        where: { id: profile.id },
        data: {
          status: 'ONLINE',
          ...(data.lat !== undefined && { currentLat: data.lat }),
          ...(data.lng !== undefined && { currentLng: data.lng }),
        },
      });

      io.emit('driver:status', {
        driverId: updated.id,
        status: updated.status,
        lat: updated.currentLat,
        lng: updated.currentLng,
        name: profile.user.name,
      });
    });

    socket.on('driver:goOffline', async () => {
      if (socket.role !== 'DRIVER') return;
      const profile = await prisma.driverProfile.findUnique({
        where: { userId: socket.userId },
      });
      if (!profile) return;

      const updated = await prisma.driverProfile.update({
        where: { id: profile.id },
        data: { status: 'OFFLINE' },
      });

      io.emit('driver:status', {
        driverId: updated.id,
        status: updated.status,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.userId}`);
    });
  });

  return io;
}
