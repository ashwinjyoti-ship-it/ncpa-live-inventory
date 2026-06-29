# NCPA Live Inventory

Audio equipment inventory app for NCPA venues. The app has a read-only dashboard
for quick lookup and a separate management surface for editing equipment data.

## Stack

- Next.js 14 App Router
- Supabase Postgres via `@supabase/supabase-js`
- Tailwind CSS plus CSS variables in `app/globals.css`
- Vercel deployment at `https://inventory.aishwin.net`

## Application Surfaces

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `components/DashboardApp.js` | Read-only inventory dashboard. Browse by venue or compare one category across venues. |
| `/manage` | `components/InventoryApp.js` | CRUD editor for categories and equipment items. |

`app/page.js` and `app/manage/page.js` are server components that fetch venues
from Supabase, then pass them into client components. The shared top navigation in
`components/NavBar.js` labels `/` as **INVENTORY** and `/manage` as **MANAGE**.

## Data Model

The schema in `supabase/migration.sql` has three tables:

```text
venues (id, name, created_at)
  -> categories (id, venue_id, name, position, created_at)
       -> items (id, category_id, name, qty, updated_at)
```

Indexes exist on `categories.venue_id` and `items.category_id`. Row-level security
is enabled, but the current migration creates an `Allow all` policy for the anon
key on every table. There is no app-level auth guard on `/manage`, so anyone who
can reach the deployed app can mutate inventory data unless deployment access is
restricted elsewhere.

## Local Setup

### 1. Create Supabase schema

1. Open Supabase SQL Editor for the target project.
2. Run the full contents of `supabase/migration.sql`.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
```

The Supabase URL and anon key are read by both server components and route
handlers through `lib/supabase.js`.

### 3. Install, seed, and run

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:3000` for the dashboard and `http://localhost:3000/manage`
for editing.

Seed caveat: `scripts/seed.mjs` upserts venues by name, but inserts categories and
items each time it runs. Re-running it against a populated database duplicates
categories and items.

## Workflows

### Dashboard (`/`)

- **By Venue**: venue cards show category count, item count, and total quantity
  from `/api/venue-stats`. Selecting a venue loads its categories and items via
  `/api/categories?venue_id=...`.
- **By Category**: category names come from `/api/category-names`. Selecting a
  category calls `/api/cross-venue?category=...` and builds a venue-by-item
  comparison.

The dashboard does not write data.

### Manage (`/manage`)

- Switch venue with the venue tabs.
- Search filters item names within the active venue on the client.
- Add a category with the bottom input bar.
- Add an item with the `+` button on a category header.
- Edit item name/quantity inline, then save with the check button.
- Delete actions prompt for confirmation. Deleting a category also deletes its
  child items.

Names are normalized to uppercase in the API on item/category create and item
update. Category `position` is assigned by looking up the current highest position
in the selected venue.

## API Reference

All routes return JSON. Error responses use `{ "error": "message" }`.

| Route | Method | Parameters / Body | Behavior |
|-------|--------|-------------------|----------|
| `/api/venue-stats` | GET | none | Returns one object per venue: `id`, `name`, `categoryCount`, `itemCount`, `totalQty`. |
| `/api/category-names` | GET | none | Returns distinct category names with `venueCount`, sorted by name. |
| `/api/cross-venue` | GET | `category` query param | Returns `{ venueItems, allItems, venueTotals }` for categories matching that name. Missing `category` returns 400. |
| `/api/categories` | GET | optional `venue_id` query param | Returns categories, ordered by `position`, with nested `items(id, name, qty)`. |
| `/api/categories` | POST | `{ name, venue_id }` | Creates an uppercase category at the next position. Missing fields return 400. |
| `/api/categories` | DELETE | `id` query param | Deletes child items and then the category. Missing `id` returns 400. |
| `/api/items` | GET | optional `venue_id`, optional `q` | Returns items with category metadata; `q` performs an `ilike` name search. |
| `/api/items` | POST | `{ name, qty, category_id }` | Creates an uppercase item. `qty` defaults to 0. Missing `name` or `category_id` returns 400. |
| `/api/items` | PATCH | `{ id, name?, qty? }` | Updates item fields; `name` is trimmed and uppercased. Missing `id` returns 400. |
| `/api/items` | DELETE | `id` query param | Deletes an item. Missing `id` returns 400. |

There is no venues API. Venues are created by the seed script and read directly
from Supabase in the page server components.

## Deploy to Vercel

1. Import the GitHub repository in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.

For the custom domain `inventory.aishwin.net`, add it in Vercel Project Settings
and point Cloudflare DNS to Vercel with a DNS-only CNAME:

```text
inventory -> cname.vercel-dns.com
```

## Validation

```bash
npm run build
```

There are currently no automated tests or lint scripts in `package.json`.

## File Map

```text
app/
  layout.js                  root layout, navigation, theme bootstrap
  page.js                    dashboard route, fetches venues
  manage/page.js             manage route, fetches venues
  api/
    categories/route.js      category list/create/delete
    category-names/route.js  category aggregation for dashboard
    cross-venue/route.js     cross-venue category comparison
    items/route.js           item list/create/update/delete
    venue-stats/route.js     venue-level counts and quantities
components/
  DashboardApp.js            read-only inventory dashboard
  InventoryApp.js            CRUD management UI
  NavBar.js                  top navigation and theme toggle
lib/
  supabase.js                Supabase client and env validation
scripts/
  seed.mjs                   venue upsert plus category/item seed
supabase/
  migration.sql              schema, indexes, and open RLS policies
```
