/*
  # Profile Management System

  1. New Tables
    - `user_profiles` - Extended user profile information
    - Storage buckets for profile pictures

  2. Security
    - Enable RLS on user_profiles table
    - Add policies for profile management
    - Storage policies for profile pictures

  3. Functions
    - Trigger to create profile on user signup
    - Function to handle profile updates
*/

-- Create user_profiles table for extended profile information
CREATE TABLE IF NOT EXISTS user_profiles (
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

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
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
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
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

-- Super admin can manage all profile pictures
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