/*
  # Fix Companies RLS Policy

  1. Security Policy Fix
    - Fix the super_admin_full_access_companies policy to correctly reference auth.users
    - Ensure authenticated users can insert companies properly
    
  2. Changes
    - Drop and recreate the problematic super_admin policy with correct table reference
    - Ensure the policy logic is sound for company creation
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "super_admin_full_access_companies" ON companies;

-- Recreate the super admin policy with correct table reference
CREATE POLICY "super_admin_full_access_companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'ankur@c2x.co.in'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'ankur@c2x.co.in'
    )
  );

-- Also ensure the general authenticated insert policy is working correctly
-- Drop and recreate it to be sure
DROP POLICY IF EXISTS "authenticated_users_can_insert_companies" ON companies;

CREATE POLICY "authenticated_users_can_insert_companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);