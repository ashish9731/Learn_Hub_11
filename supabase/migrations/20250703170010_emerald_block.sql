/*
  # Fix Companies INSERT Policy

  1. Security Changes
    - Drop the existing faulty INSERT policy for companies
    - Create a new INSERT policy that properly allows authenticated users to create companies
    - Fix the super admin policy reference

  The issue is that the current policy references `auth.users` incorrectly in the super admin policy,
  and the INSERT policy might not be working as expected.
*/

-- Drop the existing policies that might be causing issues
DROP POLICY IF EXISTS "authenticated_users_can_create_companies" ON companies;
DROP POLICY IF EXISTS "super_admin_full_access_companies" ON companies;

-- Create a new INSERT policy that allows any authenticated user to create companies
CREATE POLICY "authenticated_users_can_create_companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix the super admin policy with correct reference
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