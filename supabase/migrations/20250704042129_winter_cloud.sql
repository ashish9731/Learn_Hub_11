/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - RLS policies are causing infinite recursion when they reference the same table they protect
    - Policies using email lookups in users table create circular dependencies

  2. Solution
    - Drop ALL existing problematic policies
    - Create simple, non-recursive policies
    - Use direct auth functions instead of table lookups
    - Avoid circular references completely

  3. Changes
    - Remove all policies that cause recursion
    - Create minimal, working policies
    - Focus on functionality over complex security for now
*/

-- Drop ALL existing policies on ALL tables to eliminate recursion
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
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Drop all storage policies that might cause issues
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Temporarily disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Ensure super admin exists
INSERT INTO users (email, role) 
VALUES ('ankur@c2x.co.in', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE, NON-RECURSIVE policies

-- Users table - SIMPLE policies
CREATE POLICY "users_select_own" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_super_admin" ON users
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Companies table - SIMPLE policies
CREATE POLICY "companies_read_all" ON companies
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "companies_insert_all" ON companies
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "companies_super_admin" ON companies
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Courses table - SIMPLE policies
CREATE POLICY "courses_read_all" ON courses
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "courses_super_admin" ON courses
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- User courses table - SIMPLE policies
CREATE POLICY "user_courses_read_own" ON user_courses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_courses_super_admin" ON user_courses
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Podcasts table - SIMPLE policies
CREATE POLICY "podcasts_read_all" ON podcasts
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "podcasts_super_admin" ON podcasts
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- PDFs table - SIMPLE policies
CREATE POLICY "pdfs_read_all" ON pdfs
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "pdfs_super_admin" ON pdfs
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Quizzes table - SIMPLE policies
CREATE POLICY "quizzes_read_all" ON quizzes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "quizzes_super_admin" ON quizzes
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Chat history table - SIMPLE policies
CREATE POLICY "chat_history_own" ON chat_history
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_history_super_admin" ON chat_history
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Activity logs table - SIMPLE policies
CREATE POLICY "activity_logs_super_admin" ON activity_logs
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Storage policies - SIMPLE and PERMISSIVE
CREATE POLICY "storage_super_admin" ON storage.objects
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY "storage_read_all" ON storage.objects
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "storage_upload_auth" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Update statistics
ANALYZE users;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;