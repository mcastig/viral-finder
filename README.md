# Viral Finder

Enter a topic and surface the YouTube videos that are massively **outperforming
their own channel** — videos pulling **3× or more** their channel's average
views. Results are persisted to PostgreSQL and reused as a cache so repeat
searches don't burn YouTube API quota.

<img width="1681" height="872" alt="Captura de pantalla 2026-06-16 a la(s) 2 23 40 a m" src="https://github.com/user-attachments/assets/e4610f15-04a3-4981-9c4e-db841d3996d6" />

<img width="1685" height="877" alt="Captura de pantalla 2026-06-16 a la(s) 2 24 00 a m" src="https://github.com/user-attachments/assets/cab62655-a272-4892-b6b5-c2f3fea810f9" />

## Features

- Search any topic and get a grid of **outlier** videos (views ≥ 3× the
  channel's lifetime average), each with a colored "3.4× more views!" badge.
- Per-channel **subscriber count** shown on every card.
- **Sort** results by outlier factor or by newest (client-side, instant).
- **Light/dark** theme toggle (persisted, no flash on load).
- PostgreSQL **cache** (24h TTL) so repeat searches cost zero YouTube quota.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **PostgreSQL** via **Prisma 6**
- **Pure CSS + BEM** (co-located `Component.css` per component)
- **Jest + React Testing Library** (`next/jest`) — **100% coverage**, enforced

## How outlier detection works

For each search (`src/lib/youtube.ts`):

1. `search.list` → top 50 candidate videos for the keyword (100 quota units)
2. `videos.list` → live view counts, batched in one call (1 unit)
3. `channels.list` → each channel's lifetime stats **and subscriber count**,
   batched in one call (1 unit)
4. **Baseline** = `channelTotalViews / channelVideoCount`
5. **Outlier** = `videoViews / baseline ≥ 3`

Using lifetime channel stats (instead of fetching every channel's last 10
uploads) keeps a fresh search at ~102 quota units total. The subscriber count
rides along on the same `channels.list` call, so it adds no extra quota.

The server action (`src/app/actions/findOutliers.ts`) checks the DB cache first
(24h TTL) and only calls YouTube on a miss, then stores the outliers.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable          | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/viral_finder?schema=public` |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (enable "YouTube Data API v3") |

### 3. Database

Start a local PostgreSQL instance with Docker (credentials match the default
`DATABASE_URL` in `.env.example`):

```bash
npm run db:up        # docker compose up -d  (Postgres on localhost:5432)
```

Then push the Prisma schema and generate the client:

```bash
npm run db:push      # creates tables from prisma/schema.prisma
# or, for a migration history:
npm run db:migrate
```

Stop the database when you're done with `npm run db:down`. Data persists in a
named Docker volume across restarts; run `docker compose down -v` to wipe it.

> Prefer your own Postgres? Skip `db:up` and just point `DATABASE_URL` at it.

### 4. Run

```bash
npm run dev          # http://localhost:3000
```

## Scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start the dev server                 |
| `npm run build`         | Production build                     |
| `npm run start`         | Start the production server          |
| `npm run lint`          | Run ESLint                           |
| `npm test`              | Run the Jest test suite              |
| `npm run test:watch`    | Run Jest in watch mode               |
| `npm run test:coverage` | Run Jest with the 100% coverage gate |
| `npm run db:up`         | Start local Postgres via Docker      |
| `npm run db:down`       | Stop the local Postgres container    |
| `npm run db:generate`   | Generate the Prisma client           |
| `npm run db:push`       | Sync schema to the database          |
| `npm run db:migrate`    | Create & apply a dev migration       |
| `npm run db:studio`     | Open Prisma Studio                   |

## Testing

Tests are co-located as `*.test.ts(x)` next to the code they cover and run on
`next/jest` (jsdom). Coverage is enforced at **100%** for statements, branches,
functions, and lines via `coverageThreshold` in `jest.config.ts`:

```bash
npm run test:coverage
```

## Project structure

```
prisma/
  schema.prisma                 # SearchQuery + YoutubeVideo models
src/
  app/
    actions/findOutliers.ts     # Server Action: cache → YouTube → persist
    layout.tsx                  # ThemeProvider, Header, no-flash theme script
    page.tsx                    # Home: search + results + sorting
    page.css
    globals.css                 # Design tokens (light/dark)
  components/                   # each folder: Component.tsx | .css | .test.tsx
    Header/
    ThemeToggle/
    SearchBar/
    SortControls/               # sort by outlier factor / newest
    VideoCard/                  # thumbnail, title, channel, subs, outlier badge
    VideoGrid/
    LoadingState/               # skeleton grid + spinner
  context/
    ThemeContext.tsx            # useSyncExternalStore over <html data-theme>
  lib/
    prisma.ts                   # singleton PrismaClient
    youtube.ts                  # YouTube API client + outlier math
    format.ts                   # count/factor/date formatters
    types.ts                    # shared DTOs + OUTLIER_FACTOR_THRESHOLD
docker-compose.yml              # local PostgreSQL
jest.config.ts                  # next/jest + 100% coverage threshold
```
