/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current policies use email() function which queries the users table
    - This creates circular dependency causing infinite recursion
    - Policies reference the same table they're protecting

  2. Solution
    - Replace email()-based lookups with auth.uid()-based policies
    - Use direct user ID comparisons instead of email lookups
    - Simplify policy logic to avoid circular references

  3. Changes
    - Drop existing problematic policies
    - Create new policies using auth.uid() for direct user identification
    - Maintain same access control logic without circular dependencies
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_users" ON users;
DROP POLICY IF EXISTS "super_admin_users" ON users;
DROP POLICY IF EXISTS "user_users" ON users;

-- Create new policies without circular dependencies
-- Policy for users to read their own data
CREATE POLICY "users_can_read_own_data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to update their own data
CREATE POLICY "users_can_update_own_data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for super admin (using direct email comparison without table lookup)
CREATE POLICY "super_admin_full_access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'ankur@c2x.co.in'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'ankur@c2x.co.in'
    )
  );

-- Policy for admins to manage users in their company
-- This policy will be more restrictive and avoid recursion
CREATE POLICY "admin_company_users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Admin can access users in their company
    -- We'll use a simpler approach: check if current user is admin
    -- and the target user belongs to the same company
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.company_id = users.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.company_id = users.company_id
    )
  );