#!/bin/bash
# NCPA Inventory — Cloudflare Workers + D1 setup & deploy
# Run from your terminal: bash setup.sh

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NCPA INVENTORY — SETUP & DEPLOY (Cloudflare)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Install dependencies ────────────────────────────────────────
echo "▶ Step 1/5  Installing dependencies..."
npm install --silent
echo "  ✓ Done"
echo ""

# ── Step 2: Log in to Cloudflare ────────────────────────────────────────
echo "▶ Step 2/5  Cloudflare login..."
npx wrangler login
echo ""

# ── Step 3: Create the D1 database (skip if it already exists) ─────────
echo "▶ Step 3/5  Create D1 database..."
echo "  If this is your first run:"
echo "    npx wrangler d1 create ncpa-inventory-db"
echo "  Then copy the printed database_id into wrangler.toml"
echo "  (replace REPLACE_WITH_YOUR_D1_DATABASE_ID)."
echo ""
read -p "  Press ENTER once wrangler.toml has a real database_id... "
echo ""

# ── Step 4: Run migrations + import inventory ───────────────────────────
echo "▶ Step 4/5  Applying schema + importing inventory..."
npx wrangler d1 migrations apply DB --local
npx wrangler d1 migrations apply DB --remote

if [ -f "./inventory.xlsx" ]; then
  node scripts/import-inventory.mjs
  npx wrangler d1 execute DB --local --file=./d1/seed.sql
  npx wrangler d1 execute DB --remote --file=./d1/seed.sql
  echo "  ✓ Inventory imported from inventory.xlsx"
else
  echo "  ⚠ No inventory.xlsx found in project root — skipping data import."
  echo "    Drop your spreadsheet at ./inventory.xlsx and re-run:"
  echo "    npm run db:import:remote"
fi
echo ""

# ── Step 5: Deploy to Cloudflare Workers ─────────────────────────────────
echo "▶ Step 5/5  Deploying to Cloudflare Workers..."
npm run deploy
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  DONE"
echo "  Your app is live at the URL above."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
