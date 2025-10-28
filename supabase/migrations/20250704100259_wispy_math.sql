/*
  # Add Logo Table and Storage Bucket

  1. New Features
    - Create logos table for storing company logos
    - Add storage bucket for logo images
    - Set up proper RLS policies for logo management
    - Create relationships between logos and companies

  2. Security
    - Enable RLS on logos table
    - Add policies for super admin access
    - Allow authenticated users to view logos
    - Restrict modification to super admins
*/

-- Create logos table
CREATE TABLE IF NOT EXISTS logos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    logo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Enable RLS on logos table
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;

-- Create policies for logos table
CREATE POLICY "logos_super_admin_role" ON logos
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

-- Allow all authenticated users to read logos
CREATE POLICY "logos_read_all" ON logos
    FOR SELECT
    TO authenticated
    USING (true);

-- Create logo_pictures storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logo-pictures', 'logo-pictures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies for logo pictures
CREATE POLICY "logo_pictures_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'logo-pictures');

CREATE POLICY "logo_pictures_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'logo-pictures'
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "logo_pictures_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'logo-pictures'
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    )
    WITH CHECK (
        bucket_id = 'logo-pictures'
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "logo_pictures_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'logo-pictures'
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logos_company_id ON logos(company_id);
CREATE INDEX IF NOT EXISTS idx_logos_created_at ON logos(created_at);
CREATE INDEX IF NOT EXISTS idx_logos_created_by ON logos(created_by);

-- Update statistics
ANALYZE logos;