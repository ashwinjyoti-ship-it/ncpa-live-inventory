# NCPA Inventory Manager

Audio equipment inventory app — Next.js 14 + Neon Postgres + Vercel.

## Stack
- Next.js 14 (App Router)
- Neon (Postgres database)
- Tailwind CSS
- Deployed to `inventory.aishwin.net` / `ncpa-inventory-v2.vercel.app` via Vercel

---

## Setup (one time)

### 1. Neon — Create database
1. Create a Neon project (or claim a temporary DB from [neon.new](https://neon.new))
2. Copy the connection string (`DATABASE_URL`)

### 2. Environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```
DATABASE_URL=postgresql://...
```

### 3. Install, migrate & seed
```bash
npm install
psql "$DATABASE_URL" -f supabase/migration.sql
npm run seed       # populates all items across 6 venues
npm run dev        # http://localhost:3000
```

---

## Deploy to Vercel

```bash
# Push to GitHub first
git push -u origin main
```

Then on [vercel.com](https://vercel.com):
1. Import the repo `ashwinjyoti-ship-it/ncpa-live-inventory`
2. Add env var: `DATABASE_URL`
3. Deploy

### Custom domain — inventory.aishwin.net

**In Vercel:** Project Settings → Domains → Add `inventory.aishwin.net`

**In Cloudflare (aishwin.net):**
- Add CNAME record: `inventory` → `cname.vercel-dns.com`
- Proxy: DNS only (grey cloud, not orange)

Done. Live at `https://inventory.aishwin.net`

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
  page.js            server component, fetches venues
  globals.css        design tokens
  api/
    items/route.js   GET/POST/PATCH/DELETE items
    categories/route.js  GET/POST/DELETE categories
components/
  InventoryApp.js    main client component
lib/
  db.js              Neon SQL client
scripts/
  seed.mjs           one-time data seed
supabase/
  migration.sql      Postgres schema (Neon)
```
