-- Supabase Comprehensive Schema for Volunteer & Checkin App
-- Execute this SQL in Supabase Dashboard SQL Editor to establish a unified Single Source of Truth (SSOT).

-- 1. Create or Upgrade `users` table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'tnv' CHECK (role IN ('admin', 'tnv')),
  full_name text NOT NULL,
  email text,
  phone text DEFAULT '',
  facebook_link text DEFAULT '',
  department text DEFAULT 'Hậu cần',
  event_id text,
  event_name text,
  salary_rate numeric DEFAULT 50000,
  notes text DEFAULT '',
  created_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Add missing columns if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes text;

-- 2. Create or Upgrade `checkins` table
CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  department text DEFAULT 'Hậu cần',
  event_id text,
  event_name text,
  work_date text,
  shift_name text DEFAULT 'Ca làm việc',
  ot_hours numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  type text DEFAULT 'checkin',
  notes text DEFAULT '',
  admin_note text DEFAULT '',
  checkin_time bigint,
  checkout_time bigint,
  email_notify_sent boolean DEFAULT false,
  created_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Add missing columns if table already exists
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS event_id text;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS event_name text;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS work_date text;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS shift_name text;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS ot_hours numeric DEFAULT 0;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS type text DEFAULT 'checkin';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS admin_note text DEFAULT '';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS checkin_time bigint;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS checkout_time bigint;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS email_notify_sent boolean DEFAULT false;

-- 3. Dedicated `departments` table (id, name, allowance)
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  allowance numeric DEFAULT 50000,
  created_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 4. Dedicated System Settings Table (Events, Admin Mail Config, Fallback)
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 5. Enable Row Level Security (RLS) & Permissive Policies for Web App Access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for web client (Anon API key support)
DROP POLICY IF EXISTS "Public access for users" ON users;
CREATE POLICY "Public access for users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for checkins" ON checkins;
CREATE POLICY "Public access for checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for departments" ON departments;
CREATE POLICY "Public access for departments" ON departments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for system_settings" ON system_settings;
CREATE POLICY "Public access for system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- 6. Enable Realtime Publications safely by checking pg_publication_tables catalog
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'checkins') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE checkins;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'departments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE departments;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
  END IF;
END $$;
