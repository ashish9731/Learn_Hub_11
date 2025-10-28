/*
  # Fix RLS policies for user_courses table

  1. Security Updates
    - Drop existing restrictive policies on user_courses table
    - Add new policies that allow admins and super_admins to assign courses
    - Allow users to view their own course assignments
    - Ensure proper authorization for course assignment functionality

  2. Policy Changes
    - Allow INSERT for admins and super_admins
    - Allow SELECT for users to view their own assignments
    - Allow DELETE for admins and super_admins to remove assignments
    - Allow UPDATE for admins and super_admins to modify assignments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "user_courses_admin_manage" ON user_courses;
DROP POLICY IF EXISTS "user_courses_select_own" ON user_courses;
DROP POLICY IF EXISTS "user_courses_super_admin_manage" ON user_courses;

-- Create new comprehensive policies

-- Allow super_admins to do everything
CREATE POLICY "user_courses_super_admin_all"
  ON user_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Allow admins to manage courses for users in their company
CREATE POLICY "user_courses_admin_manage"
  ON user_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      JOIN users target_user ON target_user.id = user_courses.user_id
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.company_id = target_user.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      JOIN users target_user ON target_user.id = user_courses.user_id
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.company_id = target_user.company_id
    )
  );

-- Allow users to view their own course assignments
CREATE POLICY "user_courses_user_select"
  ON user_courses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());