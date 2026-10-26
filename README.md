# Housio

**Don't just see it. Experience it.**

Live site: https://housio-phi.vercel.app

Housio is an accommodation booking platform for Nairobi. Guests can look around every room in a 360° panorama, read a
floor plan, compare up to three stays side by side, check what is nearby and book with clear pricing and refund rules.
Owners manage listings in Owner Studio, and admins review listings, owners and reviews.

"Housio" is a working name and has not been cleared as a trademark.

## Features

- **Search** by neighbourhood, dates, guests, price, stay length and amenities, with live quotes.
- **360° tours**: real room panoramas in a lightweight React Three Fiber viewer. Drag, pinch, scroll or use the keyboard; move between rooms with tabs, arrows or the floor plan. A small preview paints first and the 4K image swaps in, with a still-image fallback when WebGL is unavailable.
- **Floor plan**: an interactive plan that stays in sync with the tour.
- **Compare**: up to three stays in a table, or two tours side by side.
- **Housio Fit**: transparent rule-based matching. Unknown data never counts as a match.
- **Around**: nearby places from OpenStreetMap with source links and straight-line distances.
- **TrueView labels** on owner-uploaded photos and models.
- **Bookings** with 15-minute holds, a database exclusion constraint against double booking and policy-based refunds.
- **Reviews** only after completed stays, with admin moderation. **Collections** with share links and voting.
- **Owner Studio** for listings, units, spaces, photos, availability blocks and rate overrides. **Admin** for listing review, owner verification and review moderation.

## Try it

Ten listings are seeded (Westlands 1, Kilimani 2, Karen 1, Kitisuru 2, South B 1, Lang'ata 1, Gigiri 1, Runda 1).
They are flagged in the database (`is_demo`), and the server keeps them read-only for the shared accounts.

| Role | Email | Password |
|---|---|---|
| Guest | guest@demo.housio.local | HousioDemo123! |
| Second guest | guest2@demo.housio.local | HousioDemo123! |
| Owner | owner@demo.housio.local | HousioDemo123! |
| Admin | admin@demo.housio.local | HousioDemo123! |

The homepage has one-click sign-in buttons.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · React Three Fiber · MapLibre GL · Zod · Supabase Postgres · Vitest · Playwright.

## Architecture

- All tables live in a private `app` schema with row-level security enabled and no policies, so the Data API cannot read them directly.
- The app calls `public.api_*` SECURITY DEFINER functions through `/rest/v1/rpc` from the server only. Each function checks the session token and role.
- Sessions are random tokens stored as SHA-256 hashes; the browser holds an HTTP-only `hs_session` cookie. Passwords use bcrypt.
- Properties, units, spaces and assets are separate tables. A unit can have child units, and a space can be separately bookable.
- Overlapping bookings are rejected by an exclusion constraint on `(unit_id, stay daterange)`; holds lock the parent unit so parent and child units cannot be double booked.
- Pricing (`lib/pricing.ts`) and refunds (`lib/cancellation.ts`) mirror the database functions, which remain authoritative.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable key
```

Apply the migrations in `supabase/migrations` in order, then load the seed data:

```bash
npm run seed:sql             # regenerates supabase/seed.sql from data/
psql "$DATABASE_URL" -f supabase/seed.sql
npm run dev
```

### Environment variables

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Publishable key, used server-side only |
| `NEXT_PUBLIC_SITE_URL` | Public base URL |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Optional MapLibre style URL |

## Data pipelines

- `npm run panoramas`: downloads the Poly Haven room panoramas, writes full and preview WebPs plus listing photos, and records sources in `data/panoramas.json`.
- `scripts/extract-pois-pbf.py`: extracts nearby places from the Geofabrik Kenya OSM extract into `data/pois.json` (requires `pyosmium`). `scripts/fetch-pois.py` does the same through the Overpass API.
- `scripts/measure-tour.mjs`: measures how long the tour takes to show and sharpen against a running app.

See [LICENCES.md](LICENCES.md) for every asset and data source.

## Testing

```bash
npm run lint
npm run typecheck
npm test                     # unit tests
npm run test:db              # database integration tests (needs .env.local values in the environment)
npx playwright install chromium
E2E_BASE_URL=http://localhost:3000 npm run e2e
```

## Known limitations

- No payment provider is connected yet; listings outside the seed are refused with `payment_provider_not_configured`.
- Room panoramas come from a shared library rather than each property.
- Locations are representative points within each neighbourhood, not exact addresses.
