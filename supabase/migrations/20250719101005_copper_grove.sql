/*
  # Fix All Table Permissions and RLS Policies

  1. Security
    - Drop all existing RLS policies that cause recursion
    - Create simple, non-recursive policies for all tables
    - Grant proper permissions to authenticated users
    - Fix user_profiles, podcast_progress, user_courses access

  2. Tables Fixed
    - users: Simple auth.uid() based policies
    - user_profiles: Direct user_id matching
    - podcast_progress: User can access their own progress
    - user_courses: User can see their assigned courses
    - All other tables: Proper authenticated access

  3. Functions
    - Ensure all functions have proper security definer
    - Grant execute permissions to authenticated users
*/

-- Disable RLS temporarily to clean up
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
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE logos DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anon for contact form
GRANT INSERT ON contact_messages TO anon;

-- Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE POLICIES (Simple, non-recursive)
-- =============================================

-- Users can read their own record
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins can do everything (using auth metadata only)
CREATE POLICY "users_super_admin_all" ON users
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin');

-- Admins can manage users (using auth metadata only)
CREATE POLICY "users_admin_manage" ON users
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- =============================================
-- USER_PROFILES TABLE POLICIES
-- =============================================

-- Users can read their own profile
CREATE POLICY "user_profiles_read_own" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "user_profiles_insert_own" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Super admins can do everything
CREATE POLICY "user_profiles_super_admin_all" ON user_profiles
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin');

-- Admins can manage profiles
CREATE POLICY "user_profiles_admin_manage" ON user_profiles
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- =============================================
-- PODCAST_PROGRESS TABLE POLICIES
-- =============================================

-- Users can access their own progress
CREATE POLICY "podcast_progress_own" ON podcast_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Super admins can see all progress
CREATE POLICY "podcast_progress_super_admin" ON podcast_progress
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin');

-- Admins can see progress
CREATE POLICY "podcast_progress_admin" ON podcast_progress
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- =============================================
-- USER_COURSES TABLE POLICIES
-- =============================================

-- Users can see their own course assignments
CREATE POLICY "user_courses_read_own" ON user_courses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admins can manage all course assignments
CREATE POLICY "user_courses_super_admin_all" ON user_courses
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin');

-- Admins can manage course assignments
CREATE POLICY "user_courses_admin_manage" ON user_courses
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- =============================================
-- OTHER TABLES - SIMPLE POLICIES
-- =============================================

-- Companies: All authenticated users can read, admins+ can manage
CREATE POLICY "companies_read_all" ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "companies_manage_admin" ON companies
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Courses: All authenticated users can read, admins+ can manage
CREATE POLICY "courses_read_all" ON courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "courses_manage_admin" ON courses
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Podcasts: All authenticated users can read, admins+ can manage
CREATE POLICY "podcasts_read_all" ON podcasts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "podcasts_manage_admin" ON podcasts
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- PDFs: All authenticated users can read, admins+ can manage
CREATE POLICY "pdfs_read_all" ON pdfs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pdfs_manage_admin" ON pdfs
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Quizzes: All authenticated users can read, admins+ can manage
CREATE POLICY "quizzes_read_all" ON quizzes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "quizzes_manage_admin" ON quizzes
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Content Categories: All authenticated users can read, admins+ can manage
CREATE POLICY "content_categories_read_all" ON content_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "content_categories_manage_admin" ON content_categories
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Podcast Likes: Users can manage their own likes
CREATE POLICY "podcast_likes_own" ON podcast_likes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "podcast_likes_admin_read" ON podcast_likes
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Podcast Assignments: Admins+ can manage
CREATE POLICY "podcast_assignments_read_own" ON podcast_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "podcast_assignments_admin_manage" ON podcast_assignments
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Activity Logs: Admins+ can read all, users can read their own
CREATE POLICY "activity_logs_read_own" ON activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "activity_logs_admin_read_all" ON activity_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "activity_logs_admin_insert" ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Audit Logs: Super admins only
CREATE POLICY "audit_logs_super_admin_only" ON audit_logs
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin');

-- Chat History: Users can manage their own
CREATE POLICY "chat_history_own" ON chat_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Contact Messages: Anyone can insert, admins+ can read
CREATE POLICY "contact_messages_insert_all" ON contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "contact_messages_admin_read" ON contact_messages
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- Logos: All can read, admins+ can manage
CREATE POLICY "logos_read_all" ON logos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "logos_manage_admin" ON logos
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'super_admin'));

-- =============================================
-- FIX DATABASE FUNCTIONS
-- =============================================

-- Drop existing functions that might have wrong signatures
DROP FUNCTION IF EXISTS get_user_metrics(uuid);
DROP FUNCTION IF EXISTS get_user_metrics(target_user_id uuid);
DROP FUNCTION IF EXISTS get_current_user_metrics();
DROP FUNCTION IF EXISTS list_all_user_metrics();
DROP FUNCTION IF EXISTS get_all_podcast_progress();

-- Create get_current_user_metrics function (no parameters)
CREATE OR REPLACE FUNCTION get_current_user_metrics()
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    COALESCE(u.email, '') as email,
    COALESCE(
      ROUND(
        (SELECT SUM(
          CASE 
            WHEN pp.duration > 0 THEN (pp.duration * (pp.progress_percent / 100.0)) / 3600.0
            ELSE 0
          END
        ) FROM podcast_progress pp WHERE pp.user_id = auth.uid())::numeric, 2
      ), 0::numeric
    ) as total_hours,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id) 
       FROM user_courses uc 
       WHERE uc.user_id = auth.uid()), 0
    ) as completed_courses,
    COALESCE(
      (SELECT COUNT(DISTINCT pp.podcast_id) 
       FROM podcast_progress pp 
       WHERE pp.user_id = auth.uid() AND pp.progress_percent > 0), 0
    ) as in_progress_courses,
    COALESCE(
      (SELECT AVG(pp.progress_percent) 
       FROM podcast_progress pp 
       WHERE pp.user_id = auth.uid() AND pp.progress_percent > 0), 0::numeric
    ) as average_completion
  FROM users u
  WHERE u.id = auth.uid();
END;
$$;

-- Create list_all_user_metrics function (super admin only)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is super admin
  IF (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(
      ROUND(
        (SELECT SUM(
          CASE 
            WHEN pp.duration > 0 THEN (pp.duration * (pp.progress_percent / 100.0)) / 3600.0
            ELSE 0
          END
        ) FROM podcast_progress pp WHERE pp.user_id = u.id)::numeric, 2
      ), 0::numeric
    ) as total_hours,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id) 
       FROM user_courses uc 
       WHERE uc.user_id = u.id), 0
    ) as completed_courses,
    COALESCE(
      (SELECT COUNT(DISTINCT pp.podcast_id) 
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id AND pp.progress_percent > 0), 0
    ) as in_progress_courses,
    COALESCE(
      (SELECT AVG(pp.progress_percent) 
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id AND pp.progress_percent > 0), 0::numeric
    ) as average_completion
  FROM users u
  WHERE u.role IN ('user', 'admin');
END;
$$;

-- Create get_all_podcast_progress function (admin+ only)
CREATE OR REPLACE FUNCTION get_all_podcast_progress()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  podcast_id uuid,
  playback_position double precision,
  duration double precision,
  progress_percent integer,
  last_played_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin or super admin
  IF (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    pp.id,
    pp.user_id,
    pp.podcast_id,
    pp.playback_position,
    pp.duration,
    pp.progress_percent,
    pp.last_played_at
  FROM podcast_progress pp;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION list_all_user_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_podcast_progress() TO authenticated;

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logo-pictures', 'logo-pictures', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('podcast-files', 'podcast-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdf-files', 'pdf-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('quiz-files', 'quiz-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE TO authenticated USING (auth.uid()::text = (storage.foldername(name))[1]);