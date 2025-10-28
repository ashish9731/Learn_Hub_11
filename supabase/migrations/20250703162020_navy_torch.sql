-- Fix all RLS policies to prevent infinite recursion
-- This migration will drop and recreate all problematic policies

-- First, drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
    
    -- Drop all policies on companies table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON companies';
    END LOOP;
    
    -- Drop all policies on courses table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'courses' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON courses';
    END LOOP;
    
    -- Drop all policies on user_courses table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_courses' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_courses';
    END LOOP;
    
    -- Drop all policies on podcasts table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'podcasts' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON podcasts';
    END LOOP;
    
    -- Drop all policies on pdfs table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'pdfs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON pdfs';
    END LOOP;
    
    -- Drop all policies on quizzes table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'quizzes' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON quizzes';
    END LOOP;
    
    -- Drop all policies on chat_history table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_history' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_history';
    END LOOP;
    
    -- Drop all policies on activity_logs table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'activity_logs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON activity_logs';
    END LOOP;
END $$;

-- Users table policies (simplified to avoid recursion)
CREATE POLICY "super_admin_full_access" ON users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_company_users" ON users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = auth.uid()
            AND admin_user.role = 'admin'::user_role
            AND admin_user.company_id = users.company_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = auth.uid()
            AND admin_user.role = 'admin'::user_role
            AND admin_user.company_id = users.company_id
        )
    );

CREATE POLICY "users_can_read_own_data" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_data" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Companies table policies (simplified)
CREATE POLICY "super_admin_companies" ON companies
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_companies" ON companies
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = companies.id
        )
    );

-- Courses table policies (simplified)
CREATE POLICY "super_admin_courses" ON courses
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_courses" ON courses
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = courses.company_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = courses.company_id
        )
    );

CREATE POLICY "user_courses" ON courses
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = courses.id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- User-Course assignments policies
CREATE POLICY "super_admin_user_courses" ON user_courses
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_user_courses" ON user_courses
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            JOIN courses ON courses.id = user_courses.course_id
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = courses.company_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            JOIN courses ON courses.id = user_courses.course_id
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = courses.company_id
        )
    );

CREATE POLICY "user_user_courses" ON user_courses
    FOR SELECT
    TO public
    USING (user_id = auth.uid());

-- Podcasts table policies
CREATE POLICY "super_admin_podcasts" ON podcasts
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_podcasts" ON podcasts
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            JOIN courses ON courses.id = podcasts.course_id
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = courses.company_id
        )
    );

CREATE POLICY "user_podcasts" ON podcasts
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = podcasts.course_id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- PDFs table policies
CREATE POLICY "super_admin_pdfs" ON pdfs
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_pdfs" ON pdfs
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            JOIN courses ON courses.id = pdfs.course_id
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = courses.company_id
        )
    );

CREATE POLICY "user_pdfs" ON pdfs
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = pdfs.course_id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- Quizzes table policies
CREATE POLICY "super_admin_quizzes" ON quizzes
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_quizzes" ON quizzes
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            JOIN courses ON courses.id = quizzes.course_id
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = courses.company_id
        )
    );

CREATE POLICY "user_quizzes" ON quizzes
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- Chat history policies
CREATE POLICY "super_admin_chat_history" ON chat_history
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_chat_history" ON chat_history
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users admin_user
            JOIN users chat_user ON chat_user.id = chat_history.user_id
            WHERE admin_user.id = auth.uid()
            AND admin_user.role = 'admin'::user_role
            AND admin_user.company_id = chat_user.company_id
        )
    );

CREATE POLICY "user_chat_history" ON chat_history
    FOR ALL
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Activity logs policies
CREATE POLICY "super_admin_activity_logs" ON activity_logs
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email::text = 'ankur@c2x.co.in'::text
        )
    );

CREATE POLICY "admin_activity_logs" ON activity_logs
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users admin_user
            JOIN users log_user ON log_user.id = activity_logs.user_id
            WHERE admin_user.id = auth.uid()
            AND admin_user.role = 'admin'::user_role
            AND admin_user.company_id = log_user.company_id
        )
    );