/*
  # Implement Permanent RLS Policies for Role-Based Access Control

  This migration implements comprehensive Row Level Security (RLS) policies based on user roles:

  ## Role Permissions:
  - **Super Admin**: Full CRUD on everything (Companies, Admins, Users, Courses, Content, Assignments)
  - **Admin**: View Company Courses, Assign to Users, View Reports  
  - **User**: View Assigned Courses, Track Progress, Take Quizzes

  ## Security Features:
  - Role-based access control for all tables
  - Company-scoped access for admins
  - User-scoped access for regular users
  - Secure helper functions for role checking
  - Comprehensive policies for all CRUD operations

  ## Tables Covered:
  - users, companies, courses, podcasts, pdfs, quizzes
  - user_courses, podcast_progress, podcast_likes
  - user_profiles, content_categories, logos
  - activity_logs, audit_logs, chat_history, contact_messages
*/

-- Helper functions for role checking (using current_user_id instead of auth.uid())
CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    (current_setting('request.jwt.sub', true))::uuid
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS user_role AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val 
  FROM users 
  WHERE id = current_user_id();
  
  RETURN COALESCE(user_role_val, 'user'::user_role);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'user'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_company_id() RETURNS uuid AS $$
DECLARE
  user_company_id uuid;
BEGIN
  SELECT company_id INTO user_company_id 
  FROM users 
  WHERE id = current_user_id();
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean AS $$
BEGIN
  RETURN get_user_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_super() RETURNS boolean AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user() RETURNS boolean AS $$
BEGIN
  RETURN get_user_role() = 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on all users
CREATE POLICY "users_super_admin_all" ON users
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Read users in their company only
CREATE POLICY "users_admin_read_company" ON users
  FOR SELECT TO authenticated
  USING (
    is_admin() AND 
    company_id = get_user_company_id()
  );

-- Users: Read and update their own record
CREATE POLICY "users_self_read" ON users
  FOR SELECT TO authenticated
  USING (id = current_user_id());

CREATE POLICY "users_self_update" ON users
  FOR UPDATE TO authenticated
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

-- Allow user creation during signup
CREATE POLICY "users_insert_self" ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = current_user_id());

-- =====================================================
-- COMPANIES TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on companies
CREATE POLICY "companies_super_admin_all" ON companies
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin and User: Read all companies (for dropdowns, etc.)
CREATE POLICY "companies_read_all" ON companies
  FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- COURSES TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on courses
CREATE POLICY "courses_super_admin_all" ON courses
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Read all courses (to assign to users)
CREATE POLICY "courses_admin_read" ON courses
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- User: Read courses assigned to them
CREATE POLICY "courses_user_read_assigned" ON courses
  FOR SELECT TO authenticated
  USING (
    is_user() AND 
    id IN (
      SELECT course_id FROM user_courses 
      WHERE user_id = current_user_id()
    )
  );

-- =====================================================
-- PODCASTS TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on podcasts
CREATE POLICY "podcasts_super_admin_all" ON podcasts
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Read all podcasts
CREATE POLICY "podcasts_admin_read" ON podcasts
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- User: Read podcasts from assigned courses
CREATE POLICY "podcasts_user_read_assigned" ON podcasts
  FOR SELECT TO authenticated
  USING (
    is_user() AND 
    course_id IN (
      SELECT course_id FROM user_courses 
      WHERE user_id = current_user_id()
    )
  );

-- =====================================================
-- PDFS TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on PDFs
CREATE POLICY "pdfs_super_admin_all" ON pdfs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Read all PDFs
CREATE POLICY "pdfs_admin_read" ON pdfs
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- User: Read PDFs from assigned courses
CREATE POLICY "pdfs_user_read_assigned" ON pdfs
  FOR SELECT TO authenticated
  USING (
    is_user() AND 
    course_id IN (
      SELECT course_id FROM user_courses 
      WHERE user_id = current_user_id()
    )
  );

-- =====================================================
-- QUIZZES TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on quizzes
CREATE POLICY "quizzes_super_admin_all" ON quizzes
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Read all quizzes
CREATE POLICY "quizzes_admin_read" ON quizzes
  FOR SELECT TO authenticated
  USING (is_admin_or_super());

-- User: Read quizzes from assigned courses
CREATE POLICY "quizzes_user_read_assigned" ON quizzes
  FOR SELECT TO authenticated
  USING (
    is_user() AND 
    course_id IN (
      SELECT course_id FROM user_courses 
      WHERE user_id = current_user_id()
    )
  );

-- =====================================================
-- USER_COURSES TABLE POLICIES (Course Assignments)
-- =====================================================

-- Super Admin: Full CRUD on assignments
CREATE POLICY "user_courses_super_admin_all" ON user_courses
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Manage assignments for users in their company
CREATE POLICY "user_courses_admin_manage_company" ON user_courses
  FOR ALL TO authenticated
  USING (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  );

-- User: Read their own assignments
CREATE POLICY "user_courses_user_read_own" ON user_courses
  FOR SELECT TO authenticated
  USING (user_id = current_user_id());

-- =====================================================
-- PODCAST_PROGRESS TABLE POLICIES (Progress Tracking)
-- =====================================================

-- Super Admin: Read all progress data
CREATE POLICY "podcast_progress_super_admin_read" ON podcast_progress
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- Admin: Read progress for users in their company
CREATE POLICY "podcast_progress_admin_read_company" ON podcast_progress
  FOR SELECT TO authenticated
  USING (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  );

-- User: Full CRUD on their own progress
CREATE POLICY "podcast_progress_user_own" ON podcast_progress
  FOR ALL TO authenticated
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- =====================================================
-- PODCAST_LIKES TABLE POLICIES
-- =====================================================

-- Super Admin: Read all likes
CREATE POLICY "podcast_likes_super_admin_read" ON podcast_likes
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- Admin: Read likes for users in their company
CREATE POLICY "podcast_likes_admin_read_company" ON podcast_likes
  FOR SELECT TO authenticated
  USING (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  );

-- User: Full CRUD on their own likes
CREATE POLICY "podcast_likes_user_own" ON podcast_likes
  FOR ALL TO authenticated
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- =====================================================
-- USER_PROFILES TABLE POLICIES
-- =====================================================

-- Super Admin: Read all profiles
CREATE POLICY "user_profiles_super_admin_read" ON user_profiles
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- Admin: Read profiles for users in their company
CREATE POLICY "user_profiles_admin_read_company" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  );

-- User: Full CRUD on their own profile
CREATE POLICY "user_profiles_user_own" ON user_profiles
  FOR ALL TO authenticated
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- =====================================================
-- CONTENT_CATEGORIES TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on categories
CREATE POLICY "content_categories_super_admin_all" ON content_categories
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin and User: Read all categories
CREATE POLICY "content_categories_read_all" ON content_categories
  FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- LOGOS TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on logos
CREATE POLICY "logos_super_admin_all" ON logos
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin and User: Read all logos
CREATE POLICY "logos_read_all" ON logos
  FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- ACTIVITY_LOGS TABLE POLICIES
-- =====================================================

-- Super Admin: Read all activity logs
CREATE POLICY "activity_logs_super_admin_read" ON activity_logs
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- Admin: Read logs for their company users
CREATE POLICY "activity_logs_admin_read_company" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  );

-- User: Read their own activity logs
CREATE POLICY "activity_logs_user_read_own" ON activity_logs
  FOR SELECT TO authenticated
  USING (user_id = current_user_id());

-- Allow all authenticated users to insert activity logs
CREATE POLICY "activity_logs_insert_all" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- AUDIT_LOGS TABLE POLICIES (Super Admin Only)
-- =====================================================

-- Super Admin: Full CRUD on audit logs
CREATE POLICY "audit_logs_super_admin_all" ON audit_logs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =====================================================
-- CHAT_HISTORY TABLE POLICIES
-- =====================================================

-- Super Admin: Read all chat history
CREATE POLICY "chat_history_super_admin_read" ON chat_history
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- User: Full CRUD on their own chat history
CREATE POLICY "chat_history_user_own" ON chat_history
  FOR ALL TO authenticated
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- =====================================================
-- CONTACT_MESSAGES TABLE POLICIES
-- =====================================================

-- Super Admin: Read all contact messages
CREATE POLICY "contact_messages_super_admin_read" ON contact_messages
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- Allow anonymous users to insert contact messages
CREATE POLICY "contact_messages_insert_public" ON contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- PODCAST_ASSIGNMENTS TABLE POLICIES
-- =====================================================

-- Super Admin: Full CRUD on podcast assignments
CREATE POLICY "podcast_assignments_super_admin_all" ON podcast_assignments
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Manage assignments for users in their company
CREATE POLICY "podcast_assignments_admin_manage_company" ON podcast_assignments
  FOR ALL TO authenticated
  USING (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    is_admin() AND 
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id()
    )
  );

-- User: Read their own podcast assignments
CREATE POLICY "podcast_assignments_user_read_own" ON podcast_assignments
  FOR SELECT TO authenticated
  USING (user_id = current_user_id());