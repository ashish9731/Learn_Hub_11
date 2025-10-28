-- Drop all policies that reference the specific email
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Find and drop all policies that might reference the email
    -- Using policy name patterns instead of definition column
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' OR schemaname = 'storage'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Create new role-based policies for users table
CREATE POLICY "users_super_admin_role" ON users
    FOR ALL
    TO authenticated
    USING (role = 'super_admin')
    WITH CHECK (role = 'super_admin');

-- Allow users to read and update their own data
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Create new role-based policies for companies table
CREATE POLICY "companies_super_admin_role" ON companies
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

-- Allow all authenticated users to read companies
CREATE POLICY "companies_read_all" ON companies
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow all authenticated users to create companies
CREATE POLICY "companies_insert_all" ON companies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create new role-based policies for courses table
CREATE POLICY "courses_super_admin_role" ON courses
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

-- Allow all authenticated users to read courses
CREATE POLICY "courses_read_all" ON courses
    FOR SELECT
    TO authenticated
    USING (true);

-- Create new role-based policies for user_courses table
CREATE POLICY "user_courses_super_admin_role" ON user_courses
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

-- Allow users to read their own courses
CREATE POLICY "user_courses_read_own" ON user_courses
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Create new role-based policies for podcasts table
CREATE POLICY "podcasts_super_admin_role" ON podcasts
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

-- Allow all authenticated users to read podcasts
CREATE POLICY "podcasts_read_all" ON podcasts
    FOR SELECT
    TO authenticated
    USING (true);

-- Create new role-based policies for pdfs table
CREATE POLICY "pdfs_super_admin_role" ON pdfs
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

-- Allow all authenticated users to read pdfs
CREATE POLICY "pdfs_read_all" ON pdfs
    FOR SELECT
    TO authenticated
    USING (true);

-- Create new role-based policies for quizzes table
CREATE POLICY "quizzes_super_admin_role" ON quizzes
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

-- Allow all authenticated users to read quizzes
CREATE POLICY "quizzes_read_all" ON quizzes
    FOR SELECT
    TO authenticated
    USING (true);

-- Create new role-based policies for chat_history table
CREATE POLICY "chat_history_super_admin_role" ON chat_history
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

-- Allow users to manage their own chat history
CREATE POLICY "chat_history_own" ON chat_history
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create new role-based policies for activity_logs table
CREATE POLICY "activity_logs_super_admin_role" ON activity_logs
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

-- Allow authenticated users to insert activity logs
CREATE POLICY "activity_logs_insert_authenticated" ON activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow users to read their own activity logs
CREATE POLICY "activity_logs_select_own" ON activity_logs
    FOR SELECT
    TO authenticated
    USING ((user_id = auth.uid()) OR (user_id IS NULL));

-- Create new role-based policies for user_profiles table
CREATE POLICY "user_profiles_super_admin_role" ON user_profiles
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

-- Allow users to manage their own profiles
CREATE POLICY "user_profiles_all_own" ON user_profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Fix storage policies for profile pictures
CREATE POLICY "profile_pictures_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_insert_own" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "profile_pictures_update_own" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "profile_pictures_delete_own" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "profile_pictures_super_admin_role" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'profile-pictures' 
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    )
    WITH CHECK (
        bucket_id = 'profile-pictures' 
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Fix storage policies for podcasts
CREATE POLICY "podcasts_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'podcasts');

CREATE POLICY "podcasts_storage_insert_auth" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'podcasts'
    );

CREATE POLICY "podcasts_storage_update_auth" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'podcasts'
    )
    WITH CHECK (
        bucket_id = 'podcasts'
    );

CREATE POLICY "podcasts_storage_delete_auth" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'podcasts'
    );

-- Fix storage policies for documents
CREATE POLICY "documents_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');

CREATE POLICY "documents_storage_insert_auth" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
    );

CREATE POLICY "documents_storage_update_auth" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'documents'
    )
    WITH CHECK (
        bucket_id = 'documents'
    );

CREATE POLICY "documents_storage_delete_auth" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documents'
    );

-- Make sure storage buckets exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('podcasts', 'podcasts', true),
    ('documents', 'documents', true),
    ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;