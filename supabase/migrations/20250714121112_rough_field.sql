/*
  # Create podcast_progress table

  1. New Tables
    - `podcast_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `podcast_id` (uuid, foreign key to podcasts)
      - `playback_position` (float, seconds played)
      - `duration` (float, total seconds)
      - `progress_percent` (integer, 0-100)
      - `last_played_at` (timestamp)
  2. Security
    - Enable RLS on `podcast_progress` table
    - Add policy for users to manage their own progress
  3. Indexes
    - Add index on user_id for faster queries
    - Add index on podcast_id for faster queries
    - Add unique constraint on user_id and podcast_id
*/

-- Create podcast_progress table
CREATE TABLE IF NOT EXISTS podcast_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  podcast_id uuid REFERENCES podcasts(id) ON DELETE CASCADE NOT NULL,
  playback_position float NOT NULL DEFAULT 0,
  duration float NOT NULL DEFAULT 0,
  progress_percent integer NOT NULL DEFAULT 0,
  last_played_at timestamptz DEFAULT now(),
  
  -- Add unique constraint to prevent duplicate entries
  CONSTRAINT podcast_progress_user_podcast_unique UNIQUE (user_id, podcast_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_podcast_progress_user_id ON podcast_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_progress_podcast_id ON podcast_progress(podcast_id);

-- Enable Row Level Security
ALTER TABLE podcast_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own progress
CREATE POLICY "Users can manage their own progress"
  ON podcast_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to view all progress data
CREATE POLICY "Admins can view all progress data"
  ON podcast_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'super_admin')
    )
  );