/*
  # Fix RLS Policies for User Registration and Profile Creation

  1. Security Changes
    - Fix RLS policies to allow proper user registration flow
    - Allow authenticated users to create entries in users table
    - Fix activity_logs policies to prevent blocking user creation
    - Ensure user_profiles can be properly created with foreign key constraints

  2. Changes
    - Drop problematic policies that block user registration
    - Create simplified policies that allow proper user flow
    - Fix activity_logs policies to allow authenticated users to insert logs
    - Ensure proper foreign key relationships between tables
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_own" ON activity_logs;
DROP POLICY IF EXISTS "user_profiles_all_own" ON user_profiles;

-- Create proper policies for users table
CREATE POLICY "users_insert_own" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_select_own" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Allow authenticated users to insert activity logs
CREATE POLICY "activity_logs_insert_authenticated" 
  ON activity_logs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to select their own activity logs
CREATE POLICY "activity_logs_select_own" 
  ON activity_logs 
  FOR SELECT 
  TO authenticated 
  USING ((user_id = auth.uid()) OR (user_id IS NULL));

-- Ensure user_profiles has proper policies
CREATE POLICY "user_profiles_all_own" 
  ON user_profiles 
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Create a function to sync existing auth users with users table
CREATE OR REPLACE FUNCTION sync_auth_users_to_db()
RETURNS void AS $$
DECLARE
    auth_user RECORD;
BEGIN
    FOR auth_user IN (SELECT * FROM auth.users) LOOP
        -- Ensure user exists in users table
        INSERT INTO users (id, email, role)
        VALUES (
            auth_user.id,
            auth_user.email,
            'user'
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to fix existing users
SELECT sync_auth_users_to_db();

-- Drop the sync function after use
DROP FUNCTION sync_auth_users_to_db();