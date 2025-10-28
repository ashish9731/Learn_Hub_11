/*
  # Fix Companies RLS Policies

  1. Security Updates
    - Fix super admin policy condition to properly reference auth.users
    - Add policy for admins to create companies
    - Ensure proper access control for company management

  2. Changes
    - Drop existing super_admin_companies policy with incorrect reference
    - Create corrected super_admin_companies policy
    - Add admin_create_companies policy for company creation by admins
*/

-- Drop the existing super admin policy with incorrect reference
DROP POLICY IF EXISTS "super_admin_companies" ON companies;

-- Create corrected super admin policy
CREATE POLICY "super_admin_companies"
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

-- Add policy for admins to create companies
CREATE POLICY "admin_create_companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add policy for admins to update companies they manage
CREATE POLICY "admin_update_companies"
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