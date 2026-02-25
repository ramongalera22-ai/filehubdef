-- ═══════════════════════════════════════════════
-- FILEHUB v3.0 — Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────
-- 1. EXPENSES
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendor TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT DEFAULT 'otros',
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'media',
  is_recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 2. TASKS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'media',
  due_date DATE DEFAULT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 3. CALENDAR EVENTS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 4. GOALS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'activo',
  category TEXT DEFAULT 'general',
  target_date DATE DEFAULT NULL,
  current_value NUMERIC(12,2) DEFAULT 0,
  target_value NUMERIC(12,2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 5. PROJECTS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'activo',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 6. IDEAS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'nueva',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 7. SHOPPING ITEMS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  completed BOOLEAN DEFAULT FALSE,
  estimated_price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 8. SHOPPING ORDERS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS shopping_orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pendiente',
  tracking_number TEXT DEFAULT '',
  platform TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 9. DEBTS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  total_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE DEFAULT NULL,
  category TEXT DEFAULT 'general',
  interest_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 10. INVESTMENTS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'activo',
  category TEXT DEFAULT 'general',
  expected_return NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 11. TRIPS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  budget NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'planificado',
  notebook_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 12. SHARED EXPENSES
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_expenses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  paid_by TEXT NOT NULL,
  split_between TEXT[] DEFAULT '{}',
  date DATE DEFAULT CURRENT_DATE,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 13. SHARED DEBTS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_debts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_person TEXT NOT NULL,
  to_person TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 14. WEIGHT ENTRIES
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS weight_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 15. NUTRITION PLANS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  upload_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 16. FILES
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT '',
  size INTEGER DEFAULT 0,
  content TEXT DEFAULT '',
  ai_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 17. PRESENTATIONS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS presentations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT DEFAULT '',
  status TEXT DEFAULT 'pendiente',
  due_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 18. TRAINING SESSIONS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  type TEXT DEFAULT 'general',
  duration INTEGER DEFAULT 0,
  intensity TEXT DEFAULT 'media',
  status TEXT DEFAULT 'completada',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 19. TRAINING PLANS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS training_plans (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_weeks INTEGER DEFAULT 4,
  source TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────
-- 20. PARTNERSHIPS
-- ────────────────────────────────
CREATE TABLE IF NOT EXISTS partnerships (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  partner_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Each user can only see/edit their own data
-- ═══════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'expenses', 'tasks', 'calendar_events', 'goals', 'projects',
      'ideas', 'shopping_items', 'shopping_orders', 'debts', 'investments',
      'trips', 'shared_expenses', 'shared_debts', 'weight_entries',
      'nutrition_plans', 'files', 'presentations', 'training_sessions',
      'training_plans'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT: users can only read their own rows
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "Users can view own %1$s" ON %1$I
       FOR SELECT USING (auth.uid() = user_id)', tbl
    );

    -- INSERT: users can only insert with their own user_id
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "Users can insert own %1$s" ON %1$I
       FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl
    );

    -- UPDATE: users can only update their own rows
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "Users can update own %1$s" ON %1$I
       FOR UPDATE USING (auth.uid() = user_id)', tbl
    );

    -- DELETE: users can only delete their own rows
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "Users can delete own %1$s" ON %1$I
       FOR DELETE USING (auth.uid() = user_id)', tbl
    );
  END LOOP;
END $$;

-- Partnerships: special RLS (both partners can see)
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Partners can view partnership" ON partnerships
  FOR SELECT USING (
    auth.jwt()->>'email' = user_email OR
    auth.jwt()->>'email' = partner_email
  );

CREATE POLICY IF NOT EXISTS "Users can create partnership" ON partnerships
  FOR INSERT WITH CHECK (auth.jwt()->>'email' = user_email);

CREATE POLICY IF NOT EXISTS "Partners can update partnership" ON partnerships
  FOR UPDATE USING (
    auth.jwt()->>'email' = user_email OR
    auth.jwt()->>'email' = partner_email
  );


-- ═══════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user ON training_sessions(user_id);

-- ═══════════════════════════════════════════════
-- ✅ DONE — Your database is ready!
-- ═══════════════════════════════════════════════
