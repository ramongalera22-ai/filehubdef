-- LifeBot Tables (no auth required - personal dashboard)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ztigttazrdzkpxrzyast/sql/new

-- PISOS
CREATE TABLE IF NOT EXISTS lifebot_pisos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  detail TEXT DEFAULT '',
  status TEXT DEFAULT 'nuevo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRABAJOS (ofertas de empleo)
CREATE TABLE IF NOT EXISTS lifebot_trabajos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  detail TEXT DEFAULT '',
  status TEXT DEFAULT 'nuevo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTES (cuadernos digitales - all sections)
CREATE TABLE IF NOT EXISTS lifebot_notes (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'fin',
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for personal use (no auth needed)
ALTER TABLE lifebot_pisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifebot_trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifebot_notes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (personal dashboard)
CREATE POLICY "anon_all_pisos" ON lifebot_pisos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_trabajos" ON lifebot_trabajos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_notes" ON lifebot_notes FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lifebot_pisos_date ON lifebot_pisos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifebot_trabajos_date ON lifebot_trabajos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifebot_notes_cat ON lifebot_notes(category, created_at DESC);
