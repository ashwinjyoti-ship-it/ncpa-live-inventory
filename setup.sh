#!/bin/bash
# NCPA Inventory — full setup & deploy
# Run from your Mac Terminal: bash setup.sh

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Set DATABASE_URL to your Neon connection string first."
  echo "Example: export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NCPA INVENTORY — SETUP & DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "▶ Step 1/4  Running Postgres migration..."
psql "$DATABASE_URL" -f supabase/migration.sql
echo "  ✓ Done"
echo ""

echo "▶ Step 2/4  Installing dependencies..."
npm install --silent
echo "  ✓ Done"
echo ""

echo "▶ Step 3/4  Seeding inventory into Neon..."
echo "DATABASE_URL=$DATABASE_URL" > .env.local
npm run seed
echo ""

echo "▶ Step 4/4  Deploying to Vercel..."
echo ""

if ! command -v vercel &> /dev/null; then
  echo "  Installing Vercel CLI..."
  npm install -g vercel --silent
fi

if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "NCPA Inventory initial deploy" --quiet
fi

vercel --yes \
  --env DATABASE_URL="$DATABASE_URL" \
  --build-env DATABASE_URL="$DATABASE_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  DONE"
echo "  Your app is live at the URL above."
echo "  Works on any device, anywhere."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
