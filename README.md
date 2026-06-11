# CultRide — Real-Time Campus Mobility Platform

A full-stack ride management platform for IIT Roorkee campus, connecting passengers with e-rickshaw drivers through real-time coordination, live status updates, and analytics dashboards.

## Project Overview

CultRide solves fragmented campus transportation by providing a centralized digital system where passengers can request rides, drivers can manage availability and accept requests, and both parties receive live updates throughout the ride lifecycle.

Built for the **Real-Time Campus Mobility and Ride Management** challenge, the platform demonstrates real-time communication, geospatial data handling, ride assignment workflows, state synchronization, and multi-user coordination.

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Socket.IO Client, Leaflet, Recharts |
| **Backend** | Node.js, Express 5, TypeScript, Socket.IO, JWT Authentication |
| **Database** | SQLite via Prisma ORM |
| **Real-Time** | WebSockets (Socket.IO) |
| **Maps** | OpenStreetMap + Leaflet |

## Features

### Mandatory Features
- **User Authentication** — JWT-based registration/login for passengers and drivers
- **Profile Management** — Update name, phone; driver vehicle & license info
- **Driver Availability** — Go online/offline with real-time status broadcast
- **Ride Request Workflow** — Pickup/destination selection, fare estimation, request creation
- **Ride Assignment** — Drivers accept/reject; atomic single-driver assignment
- **Real-Time Updates** — Live ride status, driver availability, assignment notifications via Socket.IO
- **Ride Lifecycle** — REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED / CANCELLED
- **Driver Dashboard** — Stats cards, ride history, peak hours chart, ratings
- **Ratings & Feedback** — 1–5 star ratings with optional written feedback

### Bonus Features
- **Live Map Integration** — OpenStreetMap with pickup, destination, and driver markers
- **Ride Scheduling** — Optional future date/time booking
- **Demand Analytics** — Peak hours, popular pickup locations, demand charts

## Prerequisites

- Node.js 18+ 
- npm 9+

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/itcouldvebeen-nything/real-time-campus-mobility-dashboard
cd Cult
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
```

Default values work for local development.

### 4. Initialize database

```bash
npm run db:setup --prefix backend
```

This creates the SQLite database, runs migrations, and seeds demo data.

### 5. Run the application

**Option A — Run both servers together:**

```bash
npm install          # installs concurrently at root
npm run dev
```

**Option B — Run separately:**

```bash
# Terminal 1 — Backend (port 3001)
npm run dev --prefix backend

# Terminal 2 — Frontend (port 5173)
npm run dev --prefix frontend
```

### 6. Open the app

Visit **http://localhost:5173**

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Passenger | passenger@test.com | password123 |
| Driver | driver@test.com | password123 |
| Driver 2 | driver2@test.com | password123 |

## Running the Application

1. **Passenger flow:** Login → Select pickup & destination → Request ride → Track live status → Rate on completion
2. **Driver flow:** Login → Go Online (Dashboard) → View incoming requests → Accept → Start → Complete ride
3. **Real-time demo:** Open passenger and driver in separate browser windows/tabs to see live Socket.IO updates

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register passenger or driver |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/drivers/available` | List online drivers |
| PATCH | `/api/drivers/status` | Update driver online/offline |
| GET | `/api/drivers/dashboard` | Driver dashboard data |
| POST | `/api/rides/request` | Request a ride |
| GET | `/api/rides/pending` | Pending requests (drivers) |
| GET | `/api/rides/active` | Current active ride |
| POST | `/api/rides/:id/accept` | Accept ride (driver) |
| PATCH | `/api/rides/:id/status` | Update ride status |
| POST | `/api/ratings` | Submit rating |
| GET | `/api/rides/analytics/demand` | Demand analytics |

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ride:requested` | Server → All | New ride request |
| `ride:accepted` | Server → All | Ride assigned to driver |
| `ride:in_progress` | Server → All | Ride started |
| `ride:completed` | Server → All | Ride completed |
| `driver:status` | Server → All | Driver online/offline update |
| `driver:goOnline` | Client → Server | Driver goes online |
| `driver:goOffline` | Client → Server | Driver goes offline |

## Project Structure

```
Cult/
├── backend/
│   ├── prisma/          # Schema, seed data
│   └── src/
│       ├── routes/      # REST API endpoints
│       ├── socket/      # Socket.IO handlers
│       ├── middleware/  # JWT auth
│       └── services/    # Business logic
├── frontend/
│   └── src/
│       ├── components/  # UI components, map, tracker
│       ├── context/     # Auth state
│       ├── pages/       # Route pages
│       └── lib/         # API client, socket
├── docs/
│   └── DESIGN.md        # Design document
└── README.md
```

## Design Document

See [docs/DESIGN.md](docs/DESIGN.md) for system architecture, database schema, ERD, API design, and design decisions. Export to PDF for submission.

## License

MIT
