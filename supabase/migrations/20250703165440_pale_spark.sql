/*
  # Fix Admin Company Access

  1. Security Changes
    - Drop all existing problematic policies
    - Create simplified, working policies for admin access
    - Ensure super admin has full access
    - Allow admins to read companies for their interface

  2. Changes
    - Fix company policies for admin interface
    - Add proper admin access to companies
    - Ensure no circular dependencies in policies
*/

-- Drop all existing policies on companies table to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON companies';
    END LOOP;
END $$;

-- Create super admin policy for companies (full access)
CREATE POLICY "super_admin_full_access_companies"
  ON companies
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

-- Allow any authenticated user to read companies (needed for dropdowns and admin interface)
CREATE POLICY "authenticated_users_can_read_companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow any authenticated user to create companies (can be restricted later)
CREATE POLICY "authenticated_users_can_create_companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow admins to update companies they manage
CREATE POLICY "admin_can_update_own_company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = companies.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = companies.id
    )
  );

-- Ensure the super admin user exists with correct role
INSERT INTO users (email, role) 
VALUES ('ankur@c2x.co.in', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- Update table statistics for better performance
ANALYZE companies;
ANALYZE users;