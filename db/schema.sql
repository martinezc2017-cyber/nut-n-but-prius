-- Nut N But Prius — the shop's bookings and counters (D1 "nutnbutprius", 25 nov 2026).
-- Every booking from the site (by text or by email) and the ones the owner adds by hand land here with their number,
-- so none gets lost. Apply with: npx wrangler d1 execute nutnbutprius --remote --file=db/schema.sql

CREATE TABLE IF NOT EXISTS bookings (
  ref        TEXT PRIMARY KEY,            -- NNB-MMDD-XXXX, the same number the customer and the owner see
  created    TEXT NOT NULL,               -- ISO time it came in
  via        TEXT NOT NULL,               -- 'text' (customer's Messages), 'email' (sent from the page), 'manual' (owner)
  service    TEXT NOT NULL,
  car        TEXT,
  day        TEXT,                        -- what the customer picked, as shown ("Thursday, Nov 26")
  day_iso    TEXT,                        -- the same day as YYYY-MM-DD, for the calendar
  slot       TEXT,                        -- morning / afternoon / any time
  name       TEXT,
  phone      TEXT,                        -- only by email or added by the owner (a text already carries it)
  location   TEXT,
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'new', -- new · confirmed · done · no-show · canceled
  exact_time TEXT,                        -- HH:MM the owner confirmed
  owner_note TEXT,
  updated    TEXT
);
CREATE INDEX IF NOT EXISTS bookings_day ON bookings (day_iso);
CREATE INDEX IF NOT EXISTS bookings_status ON bookings (status);

-- daily counters: visits, taps on Book / Call / Text / Directions, bookings by text and by email
CREATE TABLE IF NOT EXISTS stats (
  day TEXT NOT NULL,                      -- YYYY-MM-DD, Arizona time
  key TEXT NOT NULL,
  n   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key)
);
