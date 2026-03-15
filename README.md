# NCPA Inventory Manager

Audio equipment inventory app — Next.js 14 + Supabase + Vercel.

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres database)
- Tailwind CSS
- Deployed to `inventory.aishwin.net` via Vercel

---

## Setup (one time)

### 1. Supabase — Run migration
1. Go to [supabase.com](https://supabase.com) → your project → SQL Editor
2. Paste contents of `supabase/migration.sql` → Run

### 2. Supabase — Get anon key
Project Settings → API → copy `anon public` key (starts with `eyJ...`)

### 3. Environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://kwwltskyhoahbahhokgf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_actual_key
```

### 4. Install & seed
```bash
npm install
npm run seed       # populates all 247 items across 6 venues
npm run dev        # http://localhost:3000
```

---

## Deploy to Vercel

```bash
# Push to GitHub first
git init
git add .
git commit -m "init"
git remote add origin https://github.com/ashwinjyoti-ship-it/ncpa-inventory.git
git push -u origin main
```

Then on [vercel.com](https://vercel.com):
1. Import the repo
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
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
  supabase.js        supabase client
scripts/
  seed.mjs           one-time data seed
supabase/
  migration.sql      run in Supabase SQL editor
```
