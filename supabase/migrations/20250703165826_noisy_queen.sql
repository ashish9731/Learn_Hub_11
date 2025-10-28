/*
  # Fix Companies Table RLS Policies

  1. Security Changes
    - Drop and recreate all companies table policies to fix RLS issues
    - Fix super admin policy to correctly reference auth.users table
    - Ensure authenticated users can create and read companies
    - Allow admins to update their own company

  2. Changes Made
    - Corrected super admin policy with proper auth.users references
    - Added proper INSERT policy for company creation
    - Fixed SELECT policy for reading companies
    - Maintained admin UPDATE policy for company management
*/

-- Drop all existing policies for companies table
DROP POLICY IF EXISTS "super_admin_full_access_companies" ON companies;
DROP POLICY IF EXISTS "authenticated_users_can_create_companies" ON companies;
DROP POLICY IF EXISTS "authenticated_users_can_read_companies" ON companies;
DROP POLICY IF EXISTS "admin_can_update_own_company" ON companies;
DROP POLICY IF EXISTS "admin_companies" ON companies;
DROP POLICY IF EXISTS "super_admin_companies" ON companies;

-- Create corrected super admin policy
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

-- Create policy for authenticated users to create companies
CREATE POLICY "authenticated_users_can_create_companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to read companies
CREATE POLICY "authenticated_users_can_read_companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for admins to update their own company
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