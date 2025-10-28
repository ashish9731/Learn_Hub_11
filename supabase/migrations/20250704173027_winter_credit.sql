/*
  # Add Podcast Likes Feature

  1. New Tables
    - `podcast_likes` - Stores user podcast likes
    - Enables tracking which podcasts a user has liked

  2. Security
    - Enable RLS on the new table
    - Add policies for proper access control
    - Ensure users can only manage their own likes
*/

-- Create podcast_likes table
CREATE TABLE IF NOT EXISTS podcast_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, podcast_id)
);

-- Enable RLS on podcast_likes
ALTER TABLE podcast_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for podcast_likes
CREATE POLICY "podcast_likes_own" 
  ON podcast_likes 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for activity logging
CREATE TRIGGER log_podcast_likes
    AFTER INSERT OR DELETE ON podcast_likes
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_podcast_likes_user_id ON podcast_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_podcast_id ON podcast_likes(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_user_podcast ON podcast_likes(user_id, podcast_id);

-- Update statistics
ANALYZE podcast_likes;