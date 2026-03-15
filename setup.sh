#!/bin/bash
# NCPA Inventory — full setup & deploy
# Run from your Mac Terminal: bash setup.sh

set -e

SUPABASE_URL="https://kwwltskyhoahbahhokgf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3d2x0c2t5aG9haGJhaGhva2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzMzMDAsImV4cCI6MjA4OTE0OTMwMH0.ER_7LHxhiBHgLsIkk2OHgbrcodBhjTQY8HkC73n9SIQ"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NCPA INVENTORY — SETUP & DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Supabase migration via Management API ──────────────────────────
echo "▶ Step 1/4  Running Supabase migration..."
echo ""
echo "  ⚠️  MANUAL STEP REQUIRED (30 seconds):"
echo ""
echo "  1. Open: https://supabase.com/dashboard/project/kwwltskyhoahbahhokgf/sql/new"
echo "  2. Paste the contents of:  supabase/migration.sql"
echo "  3. Click Run"
echo "  4. Come back here and press ENTER"
echo ""
read -p "  Press ENTER when migration is done... "
echo ""

# ── Step 2: Install dependencies ──────────────────────────────────────────
echo "▶ Step 2/4  Installing dependencies..."
npm install --silent
echo "  ✓ Done"
echo ""

# ── Step 3: Seed database ─────────────────────────────────────────────────
echo "▶ Step 3/4  Seeding 247 items into Supabase..."
npm run seed
echo ""

# ── Step 4: Deploy to Vercel ──────────────────────────────────────────────
echo "▶ Step 4/4  Deploying to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "  Installing Vercel CLI..."
  npm install -g vercel --silent
fi

# Check if git repo exists
if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "NCPA Inventory initial deploy" --quiet
fi

# Deploy
vercel --yes \
  --env NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --build-env NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --build-env NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  DONE"
echo "  Your app is live at the URL above."
echo "  Works on any device, anywhere."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
