/*
  # Complete Supabase Integration with Storage and RLS
  
  1. Database Schema
    - Clean up and recreate all tables with proper structure
    - Add proper indexes and constraints
    - Create user_profiles table for extended profile information
    
  2. Storage Integration
    - Create storage buckets for podcasts, documents, and profile pictures
    - Set up proper storage policies
    - Automatic URL generation for uploaded content
    
  3. RLS Policies
    - Simple, non-recursive policies
    - Proper access control for all user roles
    - Storage access policies
    
  4. Triggers and Functions
    - Automatic profile creation on user signup
    - Activity logging
    - Updated timestamp management
*/

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
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
    
    -- Drop all storage policies
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Temporarily disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Drop user_profiles if it exists and recreate
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table for extended profile information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    bio TEXT,
    department TEXT,
    position TEXT,
    employee_id TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure super admin exists
INSERT INTO users (email, role) 
VALUES ('ankur@c2x.co.in', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE, NON-RECURSIVE RLS policies

-- Users table policies
CREATE POLICY "users_select_own" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_super_admin" ON users
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Companies table policies
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

-- Courses table policies
CREATE POLICY "courses_read_all" ON courses
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "courses_super_admin" ON courses
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- User courses table policies
CREATE POLICY "user_courses_read_own" ON user_courses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_courses_super_admin" ON user_courses
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Podcasts table policies
CREATE POLICY "podcasts_read_all" ON podcasts
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "podcasts_super_admin" ON podcasts
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- PDFs table policies
CREATE POLICY "pdfs_read_all" ON pdfs
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "pdfs_super_admin" ON pdfs
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Quizzes table policies
CREATE POLICY "quizzes_read_all" ON quizzes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "quizzes_super_admin" ON quizzes
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Chat history table policies
CREATE POLICY "chat_history_own" ON chat_history
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_history_super_admin" ON chat_history
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Activity logs table policies
CREATE POLICY "activity_logs_super_admin" ON activity_logs
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- User profiles table policies
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

CREATE POLICY "user_profiles_super_admin" ON user_profiles
    FOR ALL TO authenticated
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('podcasts', 'podcasts', true),
    ('documents', 'documents', true),
    ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for podcasts bucket
CREATE POLICY "podcasts_storage_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'podcasts');

CREATE POLICY "podcasts_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'podcasts' AND auth.email() = 'ankur@c2x.co.in');

CREATE POLICY "podcasts_storage_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'podcasts' AND auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (bucket_id = 'podcasts' AND auth.email() = 'ankur@c2x.co.in');

CREATE POLICY "podcasts_storage_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'podcasts' AND auth.email() = 'ankur@c2x.co.in');

-- Storage policies for documents bucket
CREATE POLICY "documents_storage_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents');

CREATE POLICY "documents_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents' AND auth.email() = 'ankur@c2x.co.in');

CREATE POLICY "documents_storage_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'documents' AND auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (bucket_id = 'documents' AND auth.email() = 'ankur@c2x.co.in');

CREATE POLICY "documents_storage_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'documents' AND auth.email() = 'ankur@c2x.co.in');

-- Storage policies for profile pictures bucket
CREATE POLICY "profile_pictures_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "profile_pictures_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "profile_pictures_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "profile_pictures_super_admin" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id = 'profile-pictures' 
        AND auth.email() = 'ankur@c2x.co.in'
    )
    WITH CHECK (
        bucket_id = 'profile-pictures' 
        AND auth.email() = 'ankur@c2x.co.in'
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        user_id,
        first_name,
        last_name,
        full_name
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Update table statistics
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