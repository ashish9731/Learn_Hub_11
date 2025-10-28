/*
  # Fix Companies Table RLS Policies

  1. Security Updates
    - Drop existing problematic policies
    - Create new, more robust RLS policies for companies table
    - Ensure authenticated users can insert companies
    - Maintain super admin access
    - Add proper admin access controls

  2. Changes
    - Fix INSERT policy for authenticated users
    - Improve policy conditions for better reliability
    - Add debugging-friendly policy structure
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "authenticated_users_can_insert_companies" ON companies;
DROP POLICY IF EXISTS "authenticated_users_can_read_companies" ON companies;
DROP POLICY IF EXISTS "admin_can_update_own_company" ON companies;
DROP POLICY IF EXISTS "super_admin_full_access_companies" ON companies;

-- Create new, more robust policies

-- Allow authenticated users to read all companies
CREATE POLICY "authenticated_users_can_read_companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert companies
CREATE POLICY "authenticated_users_can_insert_companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admins to update their own company
CREATE POLICY "admin_can_update_own_company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'::user_role
        AND users.company_id = companies.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'::user_role
        AND users.company_id = companies.id
    )
  );

-- Allow super admin full access
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

-- Allow admins to delete companies (optional, based on business requirements)
CREATE POLICY "admin_can_delete_own_company"
  ON companies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'::user_role
        AND users.company_id = companies.id
    )
  );