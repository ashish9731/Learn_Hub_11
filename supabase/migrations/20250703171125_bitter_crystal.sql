/*
  # Fix Companies Table RLS Policy for INSERT Operations

  1. Security Changes
    - Drop existing problematic INSERT policy
    - Create new INSERT policy that properly allows authenticated users to create companies
    - Ensure the policy works with the current authentication setup

  2. Changes Made
    - Remove the existing `authenticated_users_can_create_companies` policy
    - Add a new policy that allows any authenticated user to insert companies
    - The policy uses `auth.uid() IS NOT NULL` to verify authentication
*/

-- Drop the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "authenticated_users_can_create_companies" ON companies;

-- Create a new INSERT policy that allows authenticated users to create companies
CREATE POLICY "authenticated_users_can_insert_companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);