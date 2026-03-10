-- Migration 002: Add email verification columns + remove Supabase RLS

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128),
  ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Remove Supabase-specific RLS policies (not needed with direct pg connection)
DO $$
BEGIN
  -- Drop known RLS policies if they exist
  DROP POLICY IF EXISTS "Users can view their own profile" ON users;
  DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
  DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;
  DROP POLICY IF EXISTS "Authenticated users can manage appointments" ON appointments;
  DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
  DROP POLICY IF EXISTS "Authenticated users can manage payments" ON payments;
  DROP POLICY IF EXISTS "Authenticated users can view expenses" ON expenses;
  DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON expenses;
  DROP POLICY IF EXISTS "Authenticated users can view inventory" ON inventory;
  DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON inventory;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Disable RLS on all tables (handled at app level via JWT auth middleware)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE treatments DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;

-- Index for verification token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
