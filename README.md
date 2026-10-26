# Housio

**Don't just see it. Experience it.**

Housio is an accommodation booking platform for Nairobi. Guests can walk through an illustrative 3D interior, read a
floor plan, compare up to three stays side by side, check what is nearby and book with clear pricing and refund rules.
Owners manage listings in Owner Studio, and admins review listings, owners and reviews.

"Housio" is a working name and has not been cleared as a trademark.

## Features

- **Search** by neighbourhood, dates, guests, price, stay length and amenities, with live quotes.
- **Housio Explore**: a 3D interior built from each unit's rooms (React Three Fiber), with room-by-room navigation, furniture inspection, a performance panel and fallbacks to floor plan and photos.
- **SpaceMap**: an interactive floor plan with room sizes and verification status.
- **Housio Compare**: up to three stays in a table, or split-screen 3D.
- **Housio Fit**: transparent rule-based matching. Unknown data never counts as a match.
- **Around**: nearby places from OpenStreetMap with source links and straight-line distances.
- **TrueView labels** on every image and model (photo, illustrative render, illustrative model, owner-provided, verified).
- **Bookings** with 15-minute holds, a database exclusion constraint against double booking, simulated payment for demo listings and policy-based refunds.
- **Reviews** only after completed stays, with admin moderation. **Collections** with share links and voting.
- **Owner Studio** for listings, units, spaces, photos, availability blocks and rate overrides. **Admin** for listing review, owner verification and review moderation.

## Demo

Ten demonstration listings are seeded (Westlands 1, Kilimani 2, Karen 1, Kitisuru 2, South B 1, Lang'ata 1, Gigiri 1, Runda 1).
They are fictional, marked as demos, and use a simulated payment where no money moves.

| Role | Email | Password |
|---|---|---|
| Guest | guest@demo.housio.local | HousioDemo123! |
| Second guest | guest2@demo.housio.local | HousioDemo123! |
| Owner | owner@demo.housio.local | HousioDemo123! |
| Admin | admin@demo.housio.local | HousioDemo123! |

The homepage has one-click sign-in buttons. Demo accounts cannot edit the seeded listings.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · React Three Fiber and Drei · MapLibre GL · Zod · Supabase Postgres · Vitest · Playwright.

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

Apply the migrations in `supabase/migrations` in order, then load the demo data:

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

- `npm run assets`: downloads CC0 models, textures and an HDRI, optimises them and writes `data/asset-manifest.json`.
- `scripts/extract-pois-pbf.py`: extracts nearby places from the Geofabrik Kenya OSM extract into `data/pois.json` (requires `pyosmium`). `scripts/fetch-pois.py` does the same through the Overpass API.
- `scripts/render-previews.mjs`: renders listing preview images from the 3D builder against a running app.

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

- Real (non-demo) listings cannot take payment: no payment provider is configured, and the database refuses them with `payment_provider_not_configured`.
- 3D interiors are illustrative templates, not scans. Doors and windows are not modelled.
- Locations are representative points within each neighbourhood, not exact addresses.
