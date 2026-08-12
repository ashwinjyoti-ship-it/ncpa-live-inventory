-- Run against Neon (or any Postgres) via:
--   psql "$DATABASE_URL" -f supabase/migration.sql

create extension if not exists pgcrypto;

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  name text not null,
  position integer default 0,
  created_at timestamptz default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade not null,
  name text not null,
  qty integer default 0,
  updated_at timestamptz default now()
);

create index if not exists categories_venue_id_idx on categories(venue_id);
create index if not exists items_category_id_idx on items(category_id);
