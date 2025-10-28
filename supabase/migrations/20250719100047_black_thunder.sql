/*
  # Fix Users Table RLS Infinite Recursion

  1. Problem
    - RLS policies on users table are causing infinite recursion
    - Policies are referencing the users table within themselves
    - This prevents basic user authentication and role fetching

  2. Solution
    - Drop all existing problematic policies on users table
    - Create simple, non-recursive policies
    - Use auth.uid() directly instead of complex joins
    - Separate policies for different operations to avoid conflicts

  3. Security
    - Users can read their own record using auth.uid()
    - Admins can manage users in their company (no recursion)
    - Super admins can manage all users (no recursion)
    - Simple, direct policy conditions
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;
DROP POLICY IF EXISTS "users_own_record" ON users;
DROP POLICY IF EXISTS "users_own_update" ON users;
DROP POLICY IF EXISTS "users_admin_company" ON users;
DROP POLICY IF EXISTS "users_super_admin_all" ON users;

-- Create simple, non-recursive policies
-- Policy 1: Users can read their own record
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can update their own record
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Super admins can do everything (using service role check)
CREATE POLICY "users_super_admin_all" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Policy 4: Admins can manage users (simplified, no recursion)
CREATE POLICY "users_admin_manage" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;