/*
  # Create podcast_progress table

  1. New Tables
    - `podcast_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `podcast_id` (uuid, foreign key to podcasts)
      - `progress_percent` (integer)
      - `current_time` (float)
      - `duration` (float)
      - `last_played_at` (timestamp)
  2. Security
    - Enable RLS on `podcast_progress` table
    - Add policy for users to manage their own progress
*/

-- Create podcast progress table
CREATE TABLE IF NOT EXISTS podcast_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  podcast_id uuid NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  progress_percent integer NOT NULL DEFAULT 0,
  current_time float NOT NULL DEFAULT 0,
  duration float NOT NULL DEFAULT 0,
  last_played_at timestamptz DEFAULT now(),
  
  -- Add a unique constraint to ensure one progress record per user per podcast
  UNIQUE(user_id, podcast_id)
);

-- Enable Row Level Security
ALTER TABLE podcast_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own progress
CREATE POLICY "Users can manage their own podcast progress"
  ON podcast_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_podcast_progress_user_id ON podcast_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_progress_podcast_id ON podcast_progress(podcast_id);