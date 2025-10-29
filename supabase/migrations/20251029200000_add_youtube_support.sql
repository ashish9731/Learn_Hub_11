/*
  # Add YouTube video support to podcasts table

  1. Add video_url column to store YouTube video URLs
  2. Add is_youtube_video column to distinguish between uploaded podcasts and YouTube videos
  3. Update constraints to allow either mp3_url or video_url to be populated
  4. Update RLS policies to include the new columns
*/

-- Add video_url column to podcasts table
ALTER TABLE podcasts 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add is_youtube_video column to distinguish between uploaded podcasts and YouTube videos
ALTER TABLE podcasts 
ADD COLUMN IF NOT EXISTS is_youtube_video BOOLEAN DEFAULT FALSE;

-- Add constraint to ensure either mp3_url or video_url is populated, but not both
ALTER TABLE podcasts 
ADD CONSTRAINT podcast_content_check 
CHECK (
  (mp3_url IS NOT NULL AND video_url IS NULL AND is_youtube_video = FALSE) OR
  (mp3_url IS NULL AND video_url IS NOT NULL AND is_youtube_video = TRUE)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_podcasts_is_youtube ON podcasts(is_youtube_video);

-- Update the database types in the supabase.ts file to include the new fields
-- This will be done in the application code

-- Refresh the database statistics
ANALYZE podcasts;