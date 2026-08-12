-- Crew stocktake schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(name, category_id)
);

CREATE TABLE IF NOT EXISTS venue_stock (
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  expected_qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (venue_id, item_id)
);

CREATE TABLE IF NOT EXISTS stocktakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL REFERENCES venues(id),
  crew_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | submitted
  notes TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS stocktake_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stocktake_id INTEGER NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  expected_qty INTEGER NOT NULL DEFAULT 0,
  counted_qty INTEGER,
  shortfall INTEGER,
  note TEXT,
  UNIQUE(stocktake_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_venue ON venue_stock(venue_id);
CREATE INDEX IF NOT EXISTS idx_stocktakes_venue ON stocktakes(venue_id);
CREATE INDEX IF NOT EXISTS idx_lines_stocktake ON stocktake_lines(stocktake_id);
