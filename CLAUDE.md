# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server at http://localhost:3000
npm run build          # Production build
npm run start          # Start production server
npm run lint           # Run ESLint
npm test               # Run Jest (jsdom) tests
npm run test:coverage  # Run Jest with the enforced 100% coverage gate
npm run db:up          # Start local Postgres via Docker (docker-compose.yml)
npm run db:push        # Sync prisma/schema.prisma to PostgreSQL
npm run db:generate    # Regenerate the Prisma client
npm run db:studio      # Open Prisma Studio
```

## Architecture

Next.js 16 (App Router) + React 19 + TypeScript. The app lets a user search a
topic and returns YouTube "outlier" videos (views ≥ 3× their channel average),
caching results in PostgreSQL via Prisma.

**Request flow:** `page.tsx` (client) → `findOutliers` Server Action
(`src/app/actions/`) → cache lookup in Postgres (24h TTL); on miss it calls
`src/lib/youtube.ts` (search.list → videos.list → channels.list, computes the
outlier factor), persists outliers, and returns serializable DTOs. Sorting
(by outlier factor or newest) happens client-side in `page.tsx`.

**Conventions:**
- **Styling is pure CSS + BEM**, one `Component.css` co-located per component and
  imported directly into the `.tsx`. Design tokens live in `globals.css`; the
  light/dark theme is driven by `<html data-theme>` (set pre-paint by a no-flash
  script in `layout.tsx`, read via `useSyncExternalStore` in `ThemeContext`).
  Do **not** introduce Tailwind or CSS Modules.
- View counts and subscriber counts are `BigInt` in Prisma, mapped to `number`
  (`channelSubscribers` is nullable — `null` when the channel hides its count)
  in the DTO layer (`src/lib/types.ts`).
- The outlier threshold lives in `src/lib/types.ts` (`OUTLIER_FACTOR_THRESHOLD`).
- De-duplicate YouTube video IDs before persisting: `search.list` can return the
  same ID twice, which would violate the `(searchQueryId, youtubeId)` unique
  constraint. `youtube.ts` dedupes the IDs; `createMany` also uses
  `skipDuplicates`.
- Requires `DATABASE_URL` and `YOUTUBE_API_KEY` in `.env` (see `.env.example`).

## Testing

Tests use Jest + React Testing Library (`next/jest`), co-located as
`*.test.ts(x)` next to the code under test. **Coverage is enforced at 100%**
(statements/branches/functions/lines) via `coverageThreshold` in
`jest.config.ts` — adding untested code will fail `npm run test:coverage`.

Notes:
- For modules that mock `@/lib/*`, define the mock **inside** the `jest.mock`
  factory and read the `jest.fn`s back from the mocked module — `next/jest`
  (SWC) hoists ES imports, so a top-level mock const is in the TDZ when the
  factory runs (see `findOutliers.test.ts`).
- Test the root layout with `react-dom/server` `renderToStaticMarkup`, not RTL,
  to avoid an `<html> cannot be a child of <div>` warning.
