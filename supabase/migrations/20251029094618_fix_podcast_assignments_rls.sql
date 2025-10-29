/*
  # Fix RLS policies for podcast_assignments table

  This migration adds proper RLS policies for the podcast_assignments table
  to allow Admin users to create assignments for users in their company.
*/

-- PODCAST_ASSIGNMENTS TABLE POLICIES
ALTER TABLE podcast_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "podcast_assignments_policy_super_admin" ON podcast_assignments;
DROP POLICY IF EXISTS "podcast_assignments_policy_admin" ON podcast_assignments;
DROP POLICY IF EXISTS "podcast_assignments_policy_user" ON podcast_assignments;

-- Super admin can do everything
CREATE POLICY "podcast_assignments_policy_super_admin" ON podcast_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );

-- Admins can manage podcast assignments for users in their company
CREATE POLICY "podcast_assignments_policy_admin" ON podcast_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = podcast_assignments.user_id
      AND u.company_id = (
        SELECT u2.company_id 
        FROM users u2
        WHERE u2.id = auth.uid()
        AND u2.role = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = podcast_assignments.user_id
      AND u.company_id = (
        SELECT u2.company_id 
        FROM users u2
        WHERE u2.id = auth.uid()
        AND u2.role = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );

-- Users can read their own podcast assignments
CREATE POLICY "podcast_assignments_policy_user" ON podcast_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON podcast_assignments TO authenticated;

-- Refresh the database statistics
ANALYZE podcast_assignments;