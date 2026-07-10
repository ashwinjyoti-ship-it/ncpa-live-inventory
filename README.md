# NCPA Inventory Manager

Audio equipment inventory app — Next.js 15 + Cloudflare D1 + Cloudflare Workers.

## Stack
- Next.js 15 (App Router)
- Cloudflare D1 (SQLite, serverless)
- Cloudflare Workers (via the `@opennextjs/cloudflare` adapter)
- Tailwind CSS

---

## Setup (one time)

### 1. Install dependencies
```bash
npm install
```

### 2. Log in to Cloudflare & create the D1 database
```bash
npx wrangler login
npx wrangler d1 create ncpa-inventory-db
```
Copy the `database_id` it prints into `wrangler.toml` (replace
`REPLACE_WITH_YOUR_D1_DATABASE_ID`).

### 3. Apply the schema
```bash
npm run db:migrate:local     # local dev database (used by `next dev` / preview)
npm run db:migrate:remote    # production database on Cloudflare
```

### 4. Import your inventory spreadsheet
Drop your Excel export at `./inventory.xlsx` (columns: `Venue`, `Category`,
`Item`, `Qty` — header names are matched case-insensitively; see
`scripts/import-inventory.mjs` if your columns are named differently), then:
```bash
npm run db:import:local     # generates d1/seed.sql and loads it locally
npm run db:import:remote    # loads the same data into production
```
Re-run these any time the source spreadsheet changes — they fully replace
the `venues`/`categories`/`items` tables.

### 5. Run locally
```bash
npm run dev        # http://localhost:3000
```
D1 access during `npm run dev` is wired up via `initOpenNextCloudflareForDev()`
in `next.config.mjs`, so API routes read/write the **local** D1 database
created in step 3.

To test in an environment closer to production (actual `workerd` runtime):
```bash
npm run preview    # builds + serves via wrangler at http://localhost:8787
```

---

## Deploy to Cloudflare Workers

```bash
npm run deploy
```
This runs the OpenNext Cloudflare build (`opennextjs-cloudflare build`) and
deploys the resulting Worker (`opennextjs-cloudflare deploy`). Verify in the
Cloudflare dashboard (Workers & Pages → your Worker → Settings → Bindings)
that the D1 binding `DB` is attached — it's normally picked up automatically
from `wrangler.toml`.

### Custom domain — inventory.aishwin.net

**In Cloudflare dashboard:** Workers & Pages → your Worker → Settings →
Domains & Routes → Add Custom Domain → `inventory.aishwin.net` (this
replaces the old Vercel CNAME setup; Cloudflare manages the DNS record
automatically since the zone is already on Cloudflare).

---

## Usage

- **Edit item** — click Edit → change name/qty → ✓
- **Add item** — click + on category header → fill row → Add
- **Delete item** — Del (confirms first)
- **Add category** — bottom input bar
- **Delete category** — × on header (deletes all items inside)
- **Search** — top right, filters within active venue
- **Switch venue** — tabs across top

---

## File structure
```
app/
  layout.js          root layout + fonts
  page.js            server component, fetches venues (D1)
  manage/page.js     management view, fetches venues (D1)
  globals.css        design tokens
  api/
    items/route.js         GET/POST/PATCH/DELETE items
    categories/route.js    GET/POST/DELETE categories
    venue-stats/route.js   aggregate stats
    category-names/route.js
    cross-venue/route.js
components/
  InventoryApp.js    main client component
  DashboardApp.js
lib/
  db.js              D1 binding accessor (getCloudflareContext)
scripts/
  import-inventory.mjs   Excel -> d1/seed.sql converter
d1/
  migrations/0001_init.sql   D1 schema
  seed.sql (generated, gitignored)
wrangler.toml          Cloudflare Worker + D1 config
open-next.config.ts     OpenNext adapter config
next.config.mjs         wires up local D1 bindings for `next dev`
```
