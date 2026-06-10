# CultRide — Design Document

**Real-Time Campus Mobility and Ride Management Platform**  
IIT Roorkee Campus | Version 1.0

---

## 1. Problem Understanding

IIT Roorkee spans a large geographical area where e-rickshaws serve as the primary last-mile transport. Today, ride coordination happens through informal channels — phone calls, word-of-mouth, and physical queues at popular stops. This leads to:

- **Inefficient resource utilization** — drivers idle in low-demand areas while passengers wait elsewhere
- **Uneven demand distribution** — no visibility into where rides are needed
- **Poor user experience** — no ride tracking, no fare transparency, no feedback loop
- **No centralized coordination** — fragmented, unreliable matching

**CultRide** addresses this by providing a centralized digital platform where passengers request rides, drivers manage availability, and the system coordinates assignment with real-time state synchronization across all clients.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────┐          ┌──────────────────┐             │
│  │  Passenger Web   │          │   Driver Web     │             │
│  │  (React + Vite)  │          │  (React + Vite)  │             │
│  └────────┬─────────┘          └────────┬─────────┘             │
│           │ REST API                     │ REST + WebSocket       │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
┌───────────┼──────────────────────────────┼──────────────────────┐
│           ▼                              ▼                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Express.js API Server (Port 3001)           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │   │
│  │  │ Auth     │ │ Drivers  │ │ Rides    │ │ Ratings     │  │   │
│  │  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes      │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │           Socket.IO Real-Time Engine               │  │   │
│  │  │  Rooms: user:{id}, drivers, passengers, ride:{id}  │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │              Prisma ORM + SQLite Database                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                     SERVER LAYER                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Monolithic API + Socket.IO | Simpler deployment for campus scale; shared auth context |
| JWT Authentication | Stateless, scalable, works with both REST and WebSocket |
| SQLite + Prisma | Zero-config reproducibility for judges/demo; easily migrates to PostgreSQL |
| React SPA | Fast, responsive UX with component reusability |
| Atomic ride assignment | `updateMany` with conditions prevents double-assignment race conditions |

---

## 3. Database Schema

### Entities

**User** — Base account for passengers and drivers  
**DriverProfile** — Extended driver data (vehicle, status, location, stats)  
**Ride** — Ride request with full lifecycle timestamps  
**Rating** — Post-ride feedback linked to ride and driver  

### Entity Relationship Diagram

```
┌──────────────┐       1:1        ┌──────────────────┐
│     User     │─────────────────│  DriverProfile   │
│──────────────│                 │──────────────────│
│ id (PK)      │                 │ id (PK)          │
│ email        │                 │ userId (FK, UQ)  │
│ password     │                 │ vehicleNumber    │
│ name         │                 │ vehicleType      │
│ phone        │                 │ licenseNumber    │
│ role         │                 │ status           │
│ createdAt    │                 │ currentLat/Lng   │
└──────┬───────┘                 │ totalRides       │
       │                         │ averageRating    │
       │ 1:N                     └────────┬─────────┘
       │                                │
       │         ┌──────────────┐       │ 1:N
       ├────────►│     Ride     │◄──────┘
       │         │──────────────│
       │         │ id (PK)      │
       │         │ passengerId  │
       │         │ driverId(FK) │
       │         │ pickup/dest  │
       │         │ status       │
       │         │ fare         │
       │         │ timestamps   │
       │         └──────┬───────┘
       │                │ 1:1
       │         ┌──────▼───────┐
       └────────►│   Rating     │
                 │──────────────│
                 │ id (PK)      │
                 │ rideId (UQ)  │
                 │ driverId     │
                 │ passengerId  │
                 │ score (1-5)  │
                 │ feedback     │
                 └──────────────┘
```

### Ride State Machine

```
REQUESTED ──► ACCEPTED ──► IN_PROGRESS ──► COMPLETED
    │              │              │
    └──────────────┴──────────────┴──► CANCELLED
```

Valid transitions are enforced server-side via `canTransition()` to maintain consistency.

---

## 4. API Overview

### Authentication
- `POST /api/auth/register` — Create passenger or driver account
- `POST /api/auth/login` — Returns JWT token
- `GET /api/auth/me` — Authenticated user profile
- `PATCH /api/auth/profile` — Update profile fields

### Drivers
- `GET /api/drivers/available` — Online verified drivers
- `PATCH /api/drivers/status` — Online/Offline/Busy + location
- `GET /api/drivers/dashboard` — Stats, history, ratings, peak hours

### Rides
- `POST /api/rides/request` — Create ride request
- `GET /api/rides/pending` — Unassigned requests (online drivers)
- `GET /api/rides/active` — Current active ride
- `POST /api/rides/:id/accept` — Atomic driver assignment
- `PATCH /api/rides/:id/status` — Lifecycle transitions
- `GET /api/rides/analytics/demand` — Demand analytics

### Ratings
- `POST /api/ratings` — Submit rating for completed ride
- `GET /api/ratings/driver/:id` — Driver rating history

---

## 5. Real-Time Communication Design

Socket.IO provides bidirectional communication with JWT authentication on connection.

### Server → Client Events
| Event | Payload | Trigger |
|-------|---------|---------|
| `ride:requested` | Ride object | Passenger requests ride |
| `ride:accepted` | Ride object | Driver accepts |
| `ride:in_progress` | Ride object | Driver starts ride |
| `ride:completed` | Ride object | Driver completes ride |
| `ride:cancelled` | Ride object | Ride cancelled |
| `driver:status` | Driver status + location | Driver goes online/offline |
| `rating:new` | Rating object | Passenger rates ride |

### Client → Server Events
| Event | Purpose |
|-------|---------|
| `driver:goOnline` | Driver availability + location |
| `driver:goOffline` | Remove from available pool |
| `ride:subscribe` | Join ride-specific room |

### Consistency Strategy
1. Database is source of truth — all state changes go through REST API with transactions
2. Socket events are broadcast **after** successful DB commit
3. Ride assignment uses conditional `updateMany` to prevent race conditions
4. Driver status set to BUSY on accept, ONLINE on complete/cancel

---

## 6. Key Design Decisions

1. **Campus-specific locations** — Predefined IIT Roorkee landmarks simplify UX and enable consistent analytics
2. **Haversine fare calculation** — Distance-based transparent pricing without external APIs
3. **Role-based routing** — Separate passenger and driver UIs from single codebase
4. **Seed data** — Demo accounts and historical rides for immediate dashboard visualization
5. **Leaflet + OpenStreetMap** — Free, no API key required, works offline with cached tiles
6. **Recharts for analytics** — Lightweight charting for demand and peak hour visualization

---

## 7. Scalability Considerations

| Concern | Current | Scale Path |
|---------|---------|------------|
| Database | SQLite | PostgreSQL with connection pooling |
| Real-time | Single Node process | Redis adapter for Socket.IO horizontal scaling |
| Auth | JWT | Refresh tokens + Redis session blacklist |
| Location | Static campus points | GPS tracking with geofencing |
| Assignment | First-accept wins | Dispatch algorithm with proximity scoring |

---

## 8. Security Measures

- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens with 7-day expiry
- Socket.IO connections authenticated via handshake token
- Role-based middleware on all protected routes
- Input validation with Zod schemas
- Ride authorization checks on status updates

---

*Export this document to PDF for submission (max 8 pages).*
