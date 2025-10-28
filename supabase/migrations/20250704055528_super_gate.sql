/*
  # Fix RLS policies for users and activity_logs tables

  1. Users table policies
    - Allow authenticated users to insert their own user record
    - Allow authenticated users to select their own user record
    - Keep existing super admin policy

  2. Activity logs policies
    - Allow authenticated users to insert activity logs
    - Keep existing super admin policy

  3. User profiles policies
    - Ensure proper policies exist for authenticated users
*/

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;

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
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Ensure user_profiles has proper policies (these should already exist but let's make sure)
DROP POLICY IF EXISTS "user_profiles_all_own" ON user_profiles;

CREATE POLICY "user_profiles_all_own" 
  ON user_profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);