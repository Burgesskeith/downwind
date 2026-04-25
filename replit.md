# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Marine Weather Paddle Planner — a full-stack web app that scores 7-day downwind paddling conditions for any beach location worldwide.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + framer-motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (weather + geocoding routes)
│   └── marine-weather/     # React Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

- **Location search** — Users type a beach or coastal town name; geocoded via Open-Meteo geocoding API
- **7-day forecast cards** — Each day shows score (1–10), condition label, wind info, swell info, alignment angle, and a short summary paragraph
- **Scoring algorithm** — Weights: wind/swell directional alignment (3.5 pts), swell height (2.5 pts), swell period (2 pts), wind speed (2.5 pts), shoreline alignment (±1 pt). Adjusted by skill level via `SKILL_PROFILES` in `weather.ts` (different ideal wind/swell bands per skill).
- **Skill level selector** — Beginner / Intermediate / Advanced dropdown next to the search box. Persisted in `localStorage`. Sent to `/weather/forecast` as `?skill=...` query param. Heavy conditions are capped at lower scores for beginners; light conditions score lower for advanced paddlers.
- **Free data sources** — Open-Meteo marine API + Open-Meteo forecast API (no API key required)

## API Routes

- `GET /api/weather/geocode?query=...` — Geocode location name to lat/lon
- `GET /api/weather/forecast?lat=...&lon=...&locationName=...` — 7-day paddle forecast
- `POST /api/ads/checkout` — Creates a Stripe Checkout session for buying an ad slot ($19.99)
- `GET /api/ads/verify?session_id=...` — Verifies Stripe payment, creates ad record
- `POST /api/ads/upload` — Saves the uploaded image path + click-through URL, activates the ad
- `GET /api/ads/current` — Returns the currently active ad (image + link), or null
- `POST /api/storage/uploads/request-url` — Returns a presigned URL for direct image upload
- `GET /api/storage/public-objects/*` — Serves uploaded ad images publicly

## Advertising / Stripe

The `/advertise` page lets businesses pay $19.99 for a 320×100 banner shown after today's forecast.

**Stripe is not yet configured.** The user dismissed the Replit Stripe integration. To enable payments, add `STRIPE_SECRET_KEY` to project secrets (use `sk_test_...` for testing, `sk_live_...` for production). Until configured, the checkout button will return an error but the rest of the app works fine — the ad card simply doesn't render when no active ad exists.

Ad data is stored in the `ads` PostgreSQL table (`stripe_session_id`, `image_path`, `link_url`, `active`, etc). Banner images live in object storage.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation.

- `src/routes/health.ts` — Health check
- `src/routes/weather.ts` — Weather forecast and geocoding
- Fetches from Open-Meteo APIs (no key needed)

### `artifacts/marine-weather` (`@workspace/marine-weather`)

React + Vite frontend. Components in `src/components/`, pages in `src/pages/`.

- `src/pages/Home.tsx` — Main page with location search and 7-day forecast grid
- `src/components/LocationSearch.tsx` — Debounced geocoding search with dropdown
- `src/components/ForecastCard.tsx` — Individual day card with score, swell/wind data
- `src/components/LoadingGrid.tsx` — Skeleton loading state
- `src/components/EmptyState.tsx` — Empty state when no location selected

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen. Run: `pnpm --filter @workspace/api-spec run codegen`

### `lib/db` (`@workspace/db`)

Drizzle ORM (PostgreSQL). No schema tables needed for current features (stateless API).
