-- Supabase Schema for Xanthic Mix Checkin App

-- 1. Create users table
CREATE TABLE users (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('admin', 'tnv')),
  full_name text NOT NULL,
  phone text NOT NULL,
  facebook_link text,
  department text NOT NULL,
  salary_rate numeric DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- 2. Create checkins table
CREATE TABLE checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL,
  full_name text NOT NULL,
  department text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved')),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- 3. Set up Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- 4. Policies for users table
-- Admins can read all users
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can update users (e.g. salary_rate)
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 5. Policies for checkins table
-- Admins can read all checkins
CREATE POLICY "Admins can read all checkins" ON checkins
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Users can read their own checkins
CREATE POLICY "Users can read own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own checkins
CREATE POLICY "Users can insert own checkins" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update checkins (e.g. approve status)
CREATE POLICY "Admins can update checkins" ON checkins
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
