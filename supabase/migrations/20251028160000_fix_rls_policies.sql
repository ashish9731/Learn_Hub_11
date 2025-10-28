/*
  # Fix RLS policies to enforce proper role-based access control

  1. Drop all existing permissive policies
  2. Create proper RLS policies based on user roles
    - Super Admin: Can access all data
    - Admin: Can access data for their company only
    - User: Can access only their own data and assigned courses
*/

-- First, disable RLS temporarily to avoid conflicts
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "users_access" ON users;
DROP POLICY IF EXISTS "companies_access" ON companies;
DROP POLICY IF EXISTS "courses_access" ON courses;
DROP POLICY IF EXISTS "user_courses_access" ON user_courses;
DROP POLICY IF EXISTS "podcasts_access" ON podcasts;
DROP POLICY IF EXISTS "pdfs_access" ON pdfs;
DROP POLICY IF EXISTS "user_profiles_access" ON user_profiles;
DROP POLICY IF EXISTS "activity_logs_access" ON activity_logs;

-- USERS TABLE POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "users_policy_super_admin" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Users can read their own record
CREATE POLICY "users_policy_select_own" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own record
CREATE POLICY "users_policy_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can read users in their company
CREATE POLICY "users_policy_admin_select" ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid()
      AND current_user.role = 'admin'
      AND current_user.company_id = users.company_id
    )
  );

-- COMPANIES TABLE POLICIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "companies_policy_super_admin" ON companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Admins can read companies
CREATE POLICY "companies_policy_admin_select" ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid()
      AND current_user.role = 'admin'
      AND current_user.company_id = companies.id
    )
  );

-- USERS can read companies (for display purposes)
CREATE POLICY "companies_policy_user_select" ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- COURSES TABLE POLICIES
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "courses_policy_super_admin" ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Admins can read courses for their company
CREATE POLICY "courses_policy_admin" ON courses
  FOR ALL
  TO authenticated
  USING (
    company_id IS NULL 
    OR company_id = (
      SELECT u.company_id 
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    company_id IS NULL 
    OR company_id = (
      SELECT u.company_id 
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Users can read courses they're assigned to
CREATE POLICY "courses_policy_user" ON courses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_courses uc
      WHERE uc.user_id = auth.uid()
      AND uc.course_id = courses.id
    )
  );

-- USER_COURSES TABLE POLICIES
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "user_courses_policy_super_admin" ON user_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Admins can manage user courses for their company
CREATE POLICY "user_courses_policy_admin" ON user_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = user_courses.user_id
      AND u.company_id = (
        SELECT u2.company_id 
        FROM users u2
        WHERE u2.id = auth.uid()
        AND u2.role = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = user_courses.user_id
      AND u.company_id = (
        SELECT u2.company_id 
        FROM users u2
        WHERE u2.id = auth.uid()
        AND u2.role = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Users can read their own course assignments
CREATE POLICY "user_courses_policy_user" ON user_courses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- PODCASTS TABLE POLICIES
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "podcasts_policy_super_admin" ON podcasts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Admins can read podcasts for courses in their company
CREATE POLICY "podcasts_policy_admin" ON podcasts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = podcasts.course_id
      AND (c.company_id IS NULL OR c.company_id = (
        SELECT u.company_id 
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      ))
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = podcasts.course_id
      AND (c.company_id IS NULL OR c.company_id = (
        SELECT u.company_id 
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      ))
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Users can read podcasts for courses they're assigned to
CREATE POLICY "podcasts_policy_user" ON podcasts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_courses uc
      JOIN courses c ON c.id = podcasts.course_id
      WHERE uc.user_id = auth.uid()
      AND uc.course_id = podcasts.course_id
    )
  );

-- PDFs TABLE POLICIES
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "pdfs_policy_super_admin" ON pdfs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Admins can read PDFs for courses in their company
CREATE POLICY "pdfs_policy_admin" ON pdfs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = pdfs.course_id
      AND (c.company_id IS NULL OR c.company_id = (
        SELECT u.company_id 
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      ))
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = pdfs.course_id
      AND (c.company_id IS NULL OR c.company_id = (
        SELECT u.company_id 
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      ))
    )
    OR EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Users can read PDFs for courses they're assigned to
CREATE POLICY "pdfs_policy_user" ON pdfs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_courses uc
      JOIN courses c ON c.id = pdfs.course_id
      WHERE uc.user_id = auth.uid()
      AND uc.course_id = pdfs.course_id
    )
  );

-- USER_PROFILES TABLE POLICIES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "user_profiles_policy_super_admin" ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Users can read their own profile
CREATE POLICY "user_profiles_policy_select_own" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "user_profiles_policy_update_own" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read profiles of users in their company
CREATE POLICY "user_profiles_policy_admin_select" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users u1, users u2
      WHERE u1.id = auth.uid()
      AND u1.role = 'admin'
      AND u1.company_id = u2.company_id
      AND u2.id = user_profiles.user_id
    )
  );

-- ACTIVITY_LOGS TABLE POLICIES
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "activity_logs_policy_super_admin" ON activity_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users current_user
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'super_admin'
    )
  );

-- Users can read their own activity logs
CREATE POLICY "activity_logs_policy_user" ON activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON courses TO authenticated;
GRANT ALL ON user_courses TO authenticated;
GRANT ALL ON podcasts TO authenticated;
GRANT ALL ON pdfs TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON activity_logs TO authenticated;

-- Refresh the database statistics
ANALYZE users;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE user_profiles;
ANALYZE activity_logs;