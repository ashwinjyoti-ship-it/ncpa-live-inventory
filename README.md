# NCPA Crew Inventory

Crew-facing stocktake app for NCPA Sound. Built for phones on stage: pick a venue, count gear, see **shortfall** live.

**Stack:** Cloudflare Pages + Pages Functions + D1  
**Live:** https://ncpa-crew-inventory.pages.dev

## What crew does
1. Enter name
2. Open a venue
3. Count each item (**Expected / Counted / Shortfall**)
4. Submit stocktake (full or partial)
5. Review shortfall reports anytime

## Import updated Excel
Use the **Import** tab in the app, or regenerate seed SQL:

```bash
npm install
npm run seed:from-excel -- ./NCPA_Inventory_All.xlsx
npm run db:seed:remote
```

Expected columns: `EQUIPMENT NAME`, `CATEGORY`, `JBT`, `TATA`, `TET`, `LT`, `GDT`, `OFFICE`.

## Develop
```bash
npm install
npm run db:migrate:local
# optional local seed:
npx wrangler d1 execute ncpa-crew-stocktake-db --local --file=./database/seed.sql
npm run dev
```

## Deploy
```bash
npm run deploy
```

D1 database: `ncpa-crew-stocktake-db`  
Pages project: `ncpa-crew-inventory`
