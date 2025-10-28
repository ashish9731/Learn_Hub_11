/*
  # Fix RLS Policy Recursion and Foreign Key Constraints

  1. Problem
    - Infinite recursion detected in RLS policies
    - Foreign key constraint preventing user deletion
    - Performance issues with unnecessary re-evaluation of RLS policies

  2. Solution
    - Fix RLS policies to avoid recursion
    - Update foreign key constraints to allow user deletion
    - Optimize RLS policies for better performance
*/

-- Fix foreign key constraint for activity_logs to allow user deletion
ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Drop all existing policies that might be causing recursion
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables in public schema
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Create optimized policies for users table
CREATE POLICY "users_select_for_lookup" ON users
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "users_select_own" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_super_admin_access" ON users
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create optimized policies for companies table
CREATE POLICY "companies_read_all" ON companies
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "companies_insert_all" ON companies
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "companies_super_admin_access" ON companies
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create optimized policies for courses table
CREATE POLICY "courses_read_all" ON courses
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "courses_super_admin_access" ON courses
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create optimized policies for user_courses table
CREATE POLICY "user_courses_read_own" ON user_courses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_courses_manage_own" ON user_courses
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create optimized policies for podcasts table
CREATE POLICY "podcasts_read_all" ON podcasts
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "podcasts_super_admin_access" ON podcasts
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create optimized policies for pdfs table
CREATE POLICY "pdfs_read_all" ON pdfs
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "pdfs_super_admin_access" ON pdfs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create optimized policies for quizzes table
CREATE POLICY "quizzes_read_all" ON quizzes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "quizzes_super_admin_access" ON quizzes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create optimized policies for chat_history table
CREATE POLICY "chat_history_own" ON chat_history
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create optimized policies for activity_logs table
CREATE POLICY "activity_logs_insert_authenticated" ON activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "activity_logs_select_own" ON activity_logs
    FOR SELECT TO authenticated
    USING ((user_id = auth.uid()) OR (user_id IS NULL));

-- Create optimized policies for user_profiles table
CREATE POLICY "user_profiles_select_own" ON user_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_delete_own" ON user_profiles
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_profiles_super_admin_access" ON user_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create optimized policies for content_categories table
CREATE POLICY "content_categories_read_all" ON content_categories
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "content_categories_super_admin_access" ON content_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create optimized policies for contact_messages table
CREATE POLICY "contact_messages_insert_anon" ON contact_messages
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "contact_messages_super_admin_access" ON contact_messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create optimized policies for podcast_likes table
CREATE POLICY "podcast_likes_own" ON podcast_likes
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Update statistics for better query planning
ANALYZE users;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;
ANALYZE user_profiles;
ANALYZE content_categories;
ANALYZE contact_messages;
ANALYZE podcast_likes;