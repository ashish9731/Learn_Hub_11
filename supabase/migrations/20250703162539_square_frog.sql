/*
# Database Performance Optimization

1. Indexes
   - Add indexes for all foreign key constraints to improve query performance
   - Add composite indexes for commonly queried combinations

2. RLS Policy Optimization
   - Optimize RLS policies to reduce unnecessary re-evaluations
   - Use more efficient policy structures

3. Performance Improvements
   - Add indexes on frequently queried columns
   - Optimize join operations
*/

-- Add indexes for foreign key constraints to improve performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Courses table indexes
CREATE INDEX IF NOT EXISTS idx_courses_company_id ON courses(company_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);

-- User courses table indexes
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_assigned_at ON user_courses(assigned_at);

-- Podcasts table indexes
CREATE INDEX IF NOT EXISTS idx_podcasts_course_id ON podcasts(course_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_by ON podcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_podcasts_category ON podcasts(category);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at);

-- PDFs table indexes
CREATE INDEX IF NOT EXISTS idx_pdfs_course_id ON pdfs(course_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_by ON pdfs(created_by);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_at ON pdfs(created_at);

-- Quizzes table indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);

-- Chat history table indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

-- Activity logs table indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_role_company ON users(role, company_id);
CREATE INDEX IF NOT EXISTS idx_courses_company_created ON courses(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_podcasts_course_category ON podcasts(course_id, category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_entity ON activity_logs(user_id, entity_type);

-- Drop and recreate RLS policies with better performance
-- First drop all existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'companies', 'courses', 'user_courses', 'podcasts', 'pdfs', 'quizzes', 'chat_history', 'activity_logs')
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Create optimized RLS policies

-- Users table policies (optimized)
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

-- Companies table policies (optimized)
CREATE POLICY "super_admin_companies" ON companies
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

CREATE POLICY "admin_companies" ON companies
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()
            AND users.role = 'admin'::user_role
            AND users.company_id = companies.id
        )
    );

-- Courses table policies (optimized)
CREATE POLICY "super_admin_courses" ON courses
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

CREATE POLICY "admin_courses" ON courses
    FOR ALL
    TO authenticated
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
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = courses.id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- User-Course assignments policies (optimized)
CREATE POLICY "super_admin_user_courses" ON user_courses
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

CREATE POLICY "admin_user_courses" ON user_courses
    FOR ALL
    TO authenticated
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
    TO authenticated
    USING (user_id = auth.uid());

-- Podcasts table policies (optimized)
CREATE POLICY "super_admin_podcasts" ON podcasts
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

CREATE POLICY "admin_podcasts" ON podcasts
    FOR SELECT
    TO authenticated
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
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = podcasts.course_id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- PDFs table policies (optimized)
CREATE POLICY "super_admin_pdfs" ON pdfs
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

CREATE POLICY "admin_pdfs" ON pdfs
    FOR SELECT
    TO authenticated
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
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = pdfs.course_id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- Quizzes table policies (optimized)
CREATE POLICY "super_admin_quizzes" ON quizzes
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

CREATE POLICY "admin_quizzes" ON quizzes
    FOR SELECT
    TO authenticated
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
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_courses
            WHERE user_courses.course_id = quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    );

-- Chat history policies (optimized)
CREATE POLICY "super_admin_chat_history" ON chat_history
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

CREATE POLICY "admin_chat_history" ON chat_history
    FOR SELECT
    TO authenticated
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
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Activity logs policies (optimized)
CREATE POLICY "super_admin_activity_logs" ON activity_logs
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

CREATE POLICY "admin_activity_logs" ON activity_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users admin_user
            JOIN users log_user ON log_user.id = activity_logs.user_id
            WHERE admin_user.id = auth.uid()
            AND admin_user.role = 'admin'::user_role
            AND admin_user.company_id = log_user.company_id
        )
    );

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;