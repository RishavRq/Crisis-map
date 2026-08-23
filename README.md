# Crisis Map — Real-Time Disaster Intelligence Platform

A military-grade situational awareness platform that aggregates live disaster data from **USGS** (earthquakes) and **GDACS** (floods, cyclones, wildfires, droughts) onto an interactive dark-theme map with spatial clustering, severity scoring, and a dispatcher dashboard.

## Architecture

```
Frontend (React + Leaflet)     Backend (Vercel Serverless)     Data Sources
┌─────────────────────┐        ┌──────────────────────┐        ┌──────────┐
│  Public Map          │ HTTP   │  API Routes           │        │  USGS    │
│  Dispatcher Dashboard│◄──────►│  /api/reports         │◄───┐   │  GDACS   │
│  Filter Bar          │ poll   │  /api/clusters        │    │   │  Mock    │
│  Live Feed           │ 10s    │  /api/events          │    │   └──────────┘
│  Report Modal        │        │  /api/submit          │    │
└─────────────────────┘        │  Cron: /api/cron/ingest│────┘
                               └──────────┬───────────┘
                                          │
                               ┌──────────▼───────────┐
                               │  Supabase             │
                               │  PostgreSQL + PostGIS  │
                               └──────────────────────┘
```

## Features

- **Multi-source ingestion** — USGS earthquake feed + GDACS global disaster alerts + mock data generator
- **Spatial clustering** — PostGIS `ST_ClusterDBSCAN` groups nearby reports within ~2km radius
- **Severity scoring** — Weighted algorithm (report volume × urgency × recency decay)
- **Real-time map** — Dark-themed Leaflet map with color-coded markers by severity
- **Dispatcher dashboard** — Incident verification queue with status toggles (unverified → dispatched → resolved)
- **Filter system** — Filter by severity, disaster type, and data source (USGS/GDACS/User/Mock)
- **Report submission** — Users can submit incident reports via modal form
- **Live event feed** — Scrolling feed of all system events and alerts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Leaflet, Zustand, Vite |
| Backend | Vercel Serverless Functions, Express (local dev) |
| Database | Supabase (PostgreSQL + PostGIS) |
| Ingestion | Vercel Cron Jobs (every minute) |
| External APIs | USGS Earthquake API, GDACS Disaster Alerts API |

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- Run `schema.sql` in Supabase SQL Editor

### Local Development

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Set up environment
cp .env.example .env
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL and SUPABASE_ANON_KEY in both .env files

# Start backend (port 8080)
cd backend && npm start

# Start frontend (port 5173) — in another terminal
npm run dev
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set env vars in Vercel dashboard:
# SUPABASE_URL, SUPABASE_ANON_KEY, CRON_SECRET, VITE_API_URL
```

## Project Structure

```
crisis-map/
├── api/                    # Vercel serverless functions
│   ├── health.ts
│   ├── reports.ts
│   ├── clusters.ts
│   ├── events.ts
│   ├── submit.ts
│   ├── status.ts
│   └── cron/ingest.ts      # Cron job: USGS + GDACS ingestion
├── backend/                 # Local dev server + shared services
│   ├── db/schema.sql        # Supabase schema (PostGIS)
│   └── src/
│       ├── app.ts           # Express + WebSocket server
│       ├── db.ts            # Supabase client
│       ├── repo.ts          # Database repository layer
│       ├── types.ts
│       └── services/        # Ingestion pollers
├── src/                     # React frontend
│   ├── components/          # Map, filters, cards, modals
│   ├── pages/               # PublicMap, Dashboard
│   ├── store/               # Zustand state management
│   ├── config.ts            # API URL configuration
│   └── types.ts             # Shared type definitions
├── vercel.json              # Vercel deployment config
└── tsconfig.api.json        # TypeScript config for API routes
```

## License

MIT
