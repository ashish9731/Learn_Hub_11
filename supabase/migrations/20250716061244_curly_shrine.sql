/*
  # Create user_metrics table

  1. New Tables
    - `user_metrics`
      - `user_id` (uuid, primary key)
      - `total_hours` (double precision)
      - `completed_courses` (integer)
      - `in_progress_courses` (integer)
      - `average_completion` (integer)
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `user_metrics` table
    - Add policies for authenticated users
*/

-- Create user_metrics table
CREATE TABLE IF NOT EXISTS user_metrics (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_hours double precision DEFAULT 0,
  completed_courses integer DEFAULT 0,
  in_progress_courses integer DEFAULT 0,
  average_completion integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'super_admin')
    )
  );

CREATE POLICY "Users can update their own metrics"
  ON user_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update user metrics when podcast progress changes
CREATE OR REPLACE FUNCTION update_user_metrics_from_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate metrics and update user_metrics table
  INSERT INTO user_metrics (user_id, updated_at)
  VALUES (NEW.user_id, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user metrics when podcast progress changes
CREATE TRIGGER update_user_metrics_trigger
AFTER INSERT OR UPDATE ON podcast_progress
FOR EACH ROW
EXECUTE FUNCTION update_user_metrics_from_progress();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id);