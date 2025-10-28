/*
  # Fix RLS User Metadata Security Issues

  1. Security Issues Fixed
    - Remove insecure user_metadata references in RLS policies
    - Replace with secure auth.uid() and direct role checks
    - Use service role functions for admin operations
    - Eliminate all user_metadata access in policies

  2. Tables Updated
    - All tables with RLS policies using user_metadata
    - Replace with secure alternatives
    - Maintain proper access control without security risks

  3. Security Improvements
    - No more user_metadata in RLS policies
    - Direct role checks using database fields
    - Secure admin access patterns
    - Proper authenticated user access
*/

-- Disable RLS temporarily to rebuild policies safely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE logos DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that reference user_metadata
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_super_admin_all" ON users;
DROP POLICY IF EXISTS "users_admin_manage" ON users;
DROP POLICY IF EXISTS "user_profiles_read_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_manage" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_super_admin_all" ON user_profiles;
DROP POLICY IF EXISTS "podcast_progress_own" ON podcast_progress;
DROP POLICY IF EXISTS "podcast_progress_admin" ON podcast_progress;
DROP POLICY IF EXISTS "podcast_progress_super_admin" ON podcast_progress;
DROP POLICY IF EXISTS "user_courses_read_own" ON user_courses;
DROP POLICY IF EXISTS "user_courses_admin_manage" ON user_courses;
DROP POLICY IF EXISTS "user_courses_super_admin_all" ON user_courses;
DROP POLICY IF EXISTS "companies_read_all" ON companies;
DROP POLICY IF EXISTS "companies_manage_admin" ON companies;
DROP POLICY IF EXISTS "courses_read_all" ON courses;
DROP POLICY IF EXISTS "courses_manage_admin" ON courses;
DROP POLICY IF EXISTS "podcasts_read_all" ON podcasts;
DROP POLICY IF EXISTS "podcasts_manage_admin" ON podcasts;
DROP POLICY IF EXISTS "pdfs_read_all" ON pdfs;
DROP POLICY IF EXISTS "pdfs_manage_admin" ON pdfs;
DROP POLICY IF EXISTS "quizzes_read_all" ON quizzes;
DROP POLICY IF EXISTS "quizzes_manage_admin" ON quizzes;
DROP POLICY IF EXISTS "content_categories_read_all" ON content_categories;
DROP POLICY IF EXISTS "content_categories_manage_admin" ON content_categories;
DROP POLICY IF EXISTS "podcast_likes_own" ON podcast_likes;
DROP POLICY IF EXISTS "podcast_likes_admin_read" ON podcast_likes;
DROP POLICY IF EXISTS "podcast_assignments_read_own" ON podcast_assignments;
DROP POLICY IF EXISTS "podcast_assignments_admin_manage" ON podcast_assignments;
DROP POLICY IF EXISTS "activity_logs_read_own" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_read_all" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_insert" ON activity_logs;
DROP POLICY IF EXISTS "audit_logs_super_admin_only" ON audit_logs;
DROP POLICY IF EXISTS "contact_messages_insert_all" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_admin_read" ON contact_messages;
DROP POLICY IF EXISTS "logos_read_all" ON logos;
DROP POLICY IF EXISTS "logos_manage_admin" ON logos;
DROP POLICY IF EXISTS "chat_history_own" ON chat_history;

-- Create secure function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- Create secure function to check if user is admin or super admin
CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Create secure function to get user's company
CREATE OR REPLACE FUNCTION get_user_company()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$;

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_super() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company() TO authenticated;

-- Re-enable RLS and create secure policies

-- Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_admin_read" ON users
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

CREATE POLICY "users_admin_manage" ON users
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- User profiles policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_own" ON user_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_admin_read" ON user_profiles
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- Podcast progress policies
ALTER TABLE podcast_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "podcast_progress_own" ON podcast_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "podcast_progress_admin_read" ON podcast_progress
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- User courses policies
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_courses_own" ON user_courses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_courses_admin_manage" ON user_courses
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- Companies policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_read_all" ON companies
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "companies_manage" ON companies
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Courses policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_read_all" ON courses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "courses_manage" ON courses
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- Podcasts policies
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "podcasts_read_all" ON podcasts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "podcasts_manage" ON podcasts
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- PDFs policies
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdfs_read_all" ON pdfs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pdfs_manage" ON pdfs
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- Quizzes policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_read_all" ON quizzes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "quizzes_manage" ON quizzes
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- Content categories policies
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_categories_read_all" ON content_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "content_categories_manage" ON content_categories
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- Podcast likes policies
ALTER TABLE podcast_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "podcast_likes_own" ON podcast_likes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "podcast_likes_admin_read" ON podcast_likes
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- Podcast assignments policies
ALTER TABLE podcast_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "podcast_assignments_own" ON podcast_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "podcast_assignments_manage" ON podcast_assignments
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- Activity logs policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_own" ON activity_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "activity_logs_admin_read" ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Audit logs policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_super_admin" ON audit_logs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Contact messages policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_messages_insert" ON contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "contact_messages_admin_read" ON contact_messages
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- Logos policies
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logos_read_all" ON logos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "logos_manage" ON logos
  FOR ALL TO authenticated
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

-- Chat history policies
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_history_own" ON chat_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update existing functions to be more secure
CREATE OR REPLACE FUNCTION get_current_user_metrics()
RETURNS TABLE(
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(SUM(pp.duration * pp.progress_percent / 100.0 / 3600.0), 0) as total_hours,
    COUNT(DISTINCT CASE WHEN pp.progress_percent >= 100 THEN pp.podcast_id END) as completed_courses,
    COUNT(DISTINCT CASE WHEN pp.progress_percent > 0 AND pp.progress_percent < 100 THEN pp.podcast_id END) as in_progress_courses,
    COALESCE(AVG(pp.progress_percent), 0) as average_completion
  FROM users u
  LEFT JOIN podcast_progress pp ON u.id = pp.user_id
  WHERE u.id = auth.uid()
  GROUP BY u.id, u.email;
$$;

CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS TABLE(
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(SUM(pp.duration * pp.progress_percent / 100.0 / 3600.0), 0) as total_hours,
    COUNT(DISTINCT CASE WHEN pp.progress_percent >= 100 THEN pp.podcast_id END) as completed_courses,
    COUNT(DISTINCT CASE WHEN pp.progress_percent > 0 AND pp.progress_percent < 100 THEN pp.podcast_id END) as in_progress_courses,
    COALESCE(AVG(pp.progress_percent), 0) as average_completion
  FROM users u
  LEFT JOIN podcast_progress pp ON u.id = pp.user_id
  WHERE u.role IN ('user', 'admin')
  AND (
    -- Allow if current user is super admin
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    OR
    -- Allow if current user is admin and target user is in same company
    (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') 
     AND u.company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  )
  GROUP BY u.id, u.email;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION list_all_user_metrics() TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';