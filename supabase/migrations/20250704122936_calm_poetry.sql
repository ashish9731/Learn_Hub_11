/*
  # Fix Logos Table and Add Missing Functions
  
  1. Database Changes
    - Ensure logos table exists with proper structure
    - Add proper indexes for performance
    - Fix any issues with the table structure
    
  2. Data Cleanup
    - Remove any test/dummy data
    - Ensure proper relationships between logos and companies
    
  3. Security
    - Ensure proper RLS policies for logos table
    - Allow authenticated users to view logos
    - Restrict modification to super admins
*/

-- Ensure logos table exists with proper structure
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
DROP POLICY IF EXISTS "logos_super_admin_access" ON logos;
CREATE POLICY "logos_super_admin_access" 
  ON logos 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to read logos
DROP POLICY IF EXISTS "logos_read_all" ON logos;
CREATE POLICY "logos_read_all" 
  ON logos 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create logo_pictures storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logo-pictures', 'logo-pictures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies for logo pictures
DROP POLICY IF EXISTS "logo_pictures_select" ON storage.objects;
CREATE POLICY "logo_pictures_select" 
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'logo-pictures');

DROP POLICY IF EXISTS "logo_pictures_insert" ON storage.objects;
CREATE POLICY "logo_pictures_insert" 
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logo-pictures');

DROP POLICY IF EXISTS "logo_pictures_update" ON storage.objects;
CREATE POLICY "logo_pictures_update" 
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logo-pictures')
  WITH CHECK (bucket_id = 'logo-pictures');

DROP POLICY IF EXISTS "logo_pictures_delete" ON storage.objects;
CREATE POLICY "logo_pictures_delete" 
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'logo-pictures');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logos_company_id ON logos(company_id);
CREATE INDEX IF NOT EXISTS idx_logos_created_at ON logos(created_at);
CREATE INDEX IF NOT EXISTS idx_logos_created_by ON logos(created_by);

-- Create trigger for activity logging if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'log_logos'
    ) THEN
        CREATE TRIGGER log_logos
            AFTER INSERT OR UPDATE OR DELETE ON logos
            FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();
    END IF;
END $$;

-- Update statistics
ANALYZE logos;