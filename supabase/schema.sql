-- ============================================================
-- S8 Pro CopyCat — Supabase Schema
-- Run this in the Supabase SQL editor for project S8ProCopyCat
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────
-- 1. User financial assumptions (master panel)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_assumptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assumptions JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ──────────────────────────────────────────
-- 2. Property notes
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id BIGINT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_property_notes_user_property
  ON property_notes (user_id, property_id);

-- ──────────────────────────────────────────
-- 3. Suppressed properties
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppressed_properties (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id      BIGINT NOT NULL,
  suppressed_until TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_suppressed_user
  ON suppressed_properties (user_id, suppressed_until);

-- ──────────────────────────────────────────
-- 4. Favorite properties
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorite_properties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user
  ON favorite_properties (user_id);

-- ──────────────────────────────────────────
-- 5. Property cache (Zillow data, daily refresh)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_cache (
  id             BIGINT PRIMARY KEY,   -- Zillow zpid or internal id
  data           JSONB NOT NULL,
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_state   TEXT,
  search_county  TEXT,
  search_city    TEXT
);

CREATE INDEX IF NOT EXISTS idx_property_cache_location
  ON property_cache (search_state, search_county, search_city);

CREATE INDEX IF NOT EXISTS idx_property_cache_fetched
  ON property_cache (fetched_at);

-- ──────────────────────────────────────────
-- 6. FMR data (HUD, refreshed annually)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fmr_data (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  county_fips   TEXT NOT NULL,
  county_name   TEXT NOT NULL,
  state         TEXT NOT NULL,
  year          INT NOT NULL,
  efficiency    NUMERIC,
  one_br        NUMERIC,
  two_br        NUMERIC,
  three_br      NUMERIC,
  four_br       NUMERIC,
  population    BIGINT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (county_fips, year)
);

CREATE INDEX IF NOT EXISTS idx_fmr_state
  ON fmr_data (state);

-- ──────────────────────────────────────────
-- 7. Market rent cache (RentCast)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_rent_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id BIGINT NOT NULL,
  address     TEXT NOT NULL,
  rent_low    NUMERIC,
  rent_avg    NUMERIC,
  rent_high   NUMERIC,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id)
);

-- ──────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────

ALTER TABLE user_assumptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressed_properties  ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_properties    ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_cache         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fmr_data               ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_rent_cache      ENABLE ROW LEVEL SECURITY;

-- user_assumptions: only own row
CREATE POLICY "Users manage own assumptions"
  ON user_assumptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- property_notes: only own rows
CREATE POLICY "Users manage own notes"
  ON property_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- suppressed_properties: only own rows
CREATE POLICY "Users manage own suppressions"
  ON suppressed_properties FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- favorite_properties: only own rows
CREATE POLICY "Users manage own favorites"
  ON favorite_properties FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- property_cache: all authenticated users can read; only service role writes
CREATE POLICY "Authenticated users read property cache"
  ON property_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- fmr_data: all authenticated users can read
CREATE POLICY "Authenticated users read FMR data"
  ON fmr_data FOR SELECT
  USING (auth.role() = 'authenticated');

-- market_rent_cache: all authenticated users can read; service role writes
CREATE POLICY "Authenticated users read market rent cache"
  ON market_rent_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to upsert property_cache (for on-demand caching)
CREATE POLICY "Authenticated users upsert property cache"
  ON property_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users update property cache"
  ON property_cache FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to upsert market_rent_cache
CREATE POLICY "Authenticated users upsert market rent"
  ON market_rent_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users update market rent"
  ON market_rent_cache FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to upsert fmr_data
CREATE POLICY "Authenticated users upsert fmr"
  ON fmr_data FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users update fmr"
  ON fmr_data FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────
-- Helper: auto-update updated_at
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_assumptions_updated
  BEFORE UPDATE ON user_assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_property_notes_updated
  BEFORE UPDATE ON property_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
