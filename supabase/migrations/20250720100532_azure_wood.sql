/*
  # Fix user_profiles RLS policy for Super Admin user creation

  1. Security Updates
    - Update user_profiles RLS policies to allow Super Admins to create profiles for any user
    - Ensure Admins can create profiles for users in their company
    - Maintain security for regular users (own profiles only)

  2. Changes
    - Add policy for Super Admins to insert user profiles for any user
    - Add policy for Admins to insert user profiles for users in their company
    - Keep existing policies for user self-management
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "user_profiles_user_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_read_company" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_super_admin_read" ON user_profiles;

-- Create comprehensive policies for user_profiles

-- Super Admins can do everything
CREATE POLICY "user_profiles_super_admin_all"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admins can read and manage profiles for users in their company
CREATE POLICY "user_profiles_admin_company_all"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    is_admin() AND 
    user_id IN (
      SELECT users.id 
      FROM users 
      WHERE users.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    is_admin() AND 
    user_id IN (
      SELECT users.id 
      FROM users 
      WHERE users.company_id = get_user_company_id()
    )
  );

-- Users can manage their own profiles
CREATE POLICY "user_profiles_user_own"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Allow authenticated users to insert profiles (needed for user creation flow)
CREATE POLICY "user_profiles_insert_authenticated"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create any profile
    is_super_admin() OR
    -- Admins can create profiles for users in their company
    (is_admin() AND user_id IN (
      SELECT users.id 
      FROM users 
      WHERE users.company_id = get_user_company_id()
    )) OR
    -- Users can create their own profile
    user_id = current_user_id()
  );