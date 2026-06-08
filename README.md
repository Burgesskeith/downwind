# Downwind Paddling

Marine Weather Paddle Planner — a full-stack app that scores 7-day downwind paddling conditions for any beach location worldwide.

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui
- **Backend**: Node.js, Express 5 (weather API only — no database for MVP)
- **Package manager**: pnpm workspaces

## Project structure

```text
├── client/          # React + Vite frontend
├── server/          # Express API server
├── lib/             # Shared packages (API spec, Zod schemas, React Query hooks)
├── attached_assets/ # Static assets
└── .env             # Local environment variables (copy from .env.example)
```

## Prerequisites

- Node.js 20+ (24 recommended)
- pnpm

No database is required for the MVP. Weather and geocoding use Open-Meteo (no API keys).

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start development servers (client on :5173, API on :3001):

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:5173](http://localhost:5173)

## Development in Cursor

1. Open this folder in Cursor.
2. Run **Tasks: Run Build Task** (or `pnpm dev`) to start the client and API together.
3. Optional: use the **Full stack (client + server)** launch configuration in `.vscode/launch.json`.

The Vite dev server proxies `/api` requests to the Express server.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API server port (default `3001`) |
| `API_URL` | No | API origin for Vite proxy (default `http://localhost:3001`) |
| `CLIENT_PORT` | No | Vite dev server port (default `5173`) |
| `LOG_LEVEL` | No | Server log level (default `info`) |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run client and server in parallel |
| `pnpm build` | Typecheck and build client + server |
| `pnpm typecheck` | Run TypeScript checks across the monorepo |

## Features

- Location search via Open-Meteo geocoding
- 7-day forecast cards with paddling condition scores
- Skill level selector (Beginner / Intermediate / Advanced)
- Last location and skill level saved in browser localStorage

## Roadmap

- **v2**: User accounts, MongoDB, saved preferences per user
- **v3**: Advertising (dormant `/advertise` pages kept in repo)
