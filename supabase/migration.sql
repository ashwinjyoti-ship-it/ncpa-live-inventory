-- Run this in Supabase SQL Editor

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  name text not null,
  position integer default 0,
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade not null,
  name text not null,
  qty integer default 0,
  updated_at timestamptz default now()
);

-- Indexes
create index on categories(venue_id);
create index on items(category_id);

-- Enable RLS but allow all for anon key (adjust if you add auth later)
alter table venues enable row level security;
alter table categories enable row level security;
alter table items enable row level security;

create policy "Allow all" on venues for all using (true) with check (true);
create policy "Allow all" on categories for all using (true) with check (true);
create policy "Allow all" on items for all using (true) with check (true);
