/*
  # Create Storage Buckets and Policies

  1. Storage Buckets
    - `podcast-files` - For storing podcast audio files (50MB limit)
    - `pdf-files` - For storing PDF documents (50MB limit) 
    - `quiz-files` - For storing quiz files (50MB limit)
    - `profile-pictures` - For storing user profile pictures (10MB limit)
    - `logo-pictures` - For storing company logos (10MB limit)

  2. Security
    - Create policies for authenticated users to INSERT, UPDATE, SELECT, DELETE objects
    - Make buckets publicly accessible for reading
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('podcast-files', 'podcast-files', true, 52428800, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/quicktime']),
  ('pdf-files', 'pdf-files', true, 52428800, NULL),
  ('quiz-files', 'quiz-files', true, 52428800, NULL),
  ('profile-pictures', 'profile-pictures', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('logo-pictures', 'logo-pictures', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create policies for podcast-files bucket
CREATE POLICY "Authenticated users can upload podcast files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'podcast-files');

CREATE POLICY "Authenticated users can update podcast files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'podcast-files');

CREATE POLICY "Authenticated users can view podcast files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'podcast-files');

CREATE POLICY "Authenticated users can delete podcast files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'podcast-files');

-- Create policies for pdf-files bucket
CREATE POLICY "Authenticated users can upload PDF files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdf-files');

CREATE POLICY "Authenticated users can update PDF files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pdf-files');

CREATE POLICY "Authenticated users can view PDF files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdf-files');

CREATE POLICY "Authenticated users can delete PDF files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdf-files');

-- Create policies for quiz-files bucket
CREATE POLICY "Authenticated users can upload quiz files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-files');

CREATE POLICY "Authenticated users can update quiz files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'quiz-files');

CREATE POLICY "Authenticated users can view quiz files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quiz-files');

CREATE POLICY "Authenticated users can delete quiz files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quiz-files');

-- Create policies for profile-pictures bucket
CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Authenticated users can update profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Authenticated users can view profile pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Authenticated users can delete profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Create policies for logo-pictures bucket
CREATE POLICY "Authenticated users can upload logo pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logo-pictures');

CREATE POLICY "Authenticated users can update logo pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logo-pictures');

CREATE POLICY "Authenticated users can view logo pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logo-pictures');

CREATE POLICY "Authenticated users can delete logo pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logo-pictures');

-- Allow public read access to all buckets
CREATE POLICY "Public can view podcast files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'podcast-files');

CREATE POLICY "Public can view PDF files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pdf-files');

CREATE POLICY "Public can view quiz files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quiz-files');

CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Public can view logo pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logo-pictures');