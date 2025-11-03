/*
  # Fix Storage Policies for Images Bucket

  Ensure Super Admin users can upload course images to the 'images' bucket
*/

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "super_admin_images_storage" ON storage.objects;
DROP POLICY IF EXISTS "images_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "images_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "images_storage_delete" ON storage.objects;

-- Create comprehensive policies for images bucket
-- Super Admin can do everything with images
CREATE POLICY "super_admin_images_all" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Admins can insert images for courses in their company
CREATE POLICY "admin_images_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id IS NOT NULL
    )
  );

-- Admins can update images for courses in their company
CREATE POLICY "admin_images_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id IS NOT NULL
    )
  )
  WITH CHECK (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id IS NOT NULL
    )
  );

-- Admins can delete images for courses in their company
CREATE POLICY "admin_images_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id IS NOT NULL
    )
  );

-- Users can select images for courses they're assigned to
CREATE POLICY "user_images_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM courses c
      JOIN user_courses uc ON c.id = uc.course_id
      WHERE c.image_url = ('images/' || storage.objects.name)
      AND uc.user_id = auth.uid()
    )
  );

-- Ensure the images bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;