/*
  # Fix Storage URLs and Bucket Configuration

  1. Storage Buckets
    - Ensure all required storage buckets exist with proper settings
    - Set public access for all buckets to allow URL access
    - Create proper storage policies for each bucket

  2. URL Fixes
    - Fix any broken URLs in the database
    - Ensure proper URL format for all stored media
    - Clean up any invalid references

  3. Security
    - Ensure proper access controls for all buckets
    - Allow authenticated users to access media files
    - Maintain super admin privileges
*/

-- Make sure storage buckets exist with proper settings
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('podcasts', 'podcasts', true),
    ('documents', 'documents', true),
    ('profile-pictures', 'profile-pictures', true),
    ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop all existing storage policies to start fresh
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

-- Create policies for profile pictures bucket
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

-- Create policies for podcasts bucket
CREATE POLICY "podcasts_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'podcasts');

CREATE POLICY "podcasts_storage_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'podcasts'
    );

CREATE POLICY "podcasts_storage_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'podcasts'
    )
    WITH CHECK (
        bucket_id = 'podcasts'
    );

CREATE POLICY "podcasts_storage_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'podcasts'
    );

-- Create policies for documents bucket
CREATE POLICY "documents_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');

CREATE POLICY "documents_storage_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
    );

CREATE POLICY "documents_storage_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'documents'
    )
    WITH CHECK (
        bucket_id = 'documents'
    );

CREATE POLICY "documents_storage_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documents'
    );

-- Create policies for images bucket
CREATE POLICY "images_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'images');

CREATE POLICY "images_storage_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'images'
    );

CREATE POLICY "images_storage_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'images'
    )
    WITH CHECK (
        bucket_id = 'images'
    );

CREATE POLICY "images_storage_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'images'
    );

-- Super admin policies for all buckets
CREATE POLICY "super_admin_storage_all" ON storage.objects
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

-- Fix any broken URLs in the database
UPDATE user_profiles
SET profile_picture_url = NULL
WHERE profile_picture_url IS NOT NULL 
AND profile_picture_url NOT LIKE 'https://%';

-- Fix any broken podcast URLs
UPDATE podcasts
SET mp3_url = NULL
WHERE mp3_url IS NOT NULL 
AND mp3_url NOT LIKE 'https://%';

-- Fix any broken PDF URLs
UPDATE pdfs
SET pdf_url = NULL
WHERE pdf_url IS NOT NULL 
AND pdf_url NOT LIKE 'https://%';

-- Fix any broken course image URLs
UPDATE courses
SET image_url = NULL
WHERE image_url IS NOT NULL 
AND image_url NOT LIKE 'https://%';