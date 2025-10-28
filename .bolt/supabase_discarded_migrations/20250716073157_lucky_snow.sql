/*
  # Create user metrics table

  1. New Tables
    - `user_metrics` - Stores aggregated metrics for each user
      - `user_id` (uuid, primary key, references users.id)
      - `total_hours` (double precision, default 0)
      - `completed_courses` (integer, default 0)
      - `in_progress_courses` (integer, default 0)
      - `average_completion` (integer, default 0)
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_metrics` table
    - Add policies for users to read their own metrics
    - Add policies for admins to read metrics for users in their company
    - Add policies for super admins to read all metrics
*/

-- Create user_metrics table
CREATE TABLE IF NOT EXISTS user_metrics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_hours DOUBLE PRECISION DEFAULT 0,
  completed_courses INTEGER DEFAULT 0,
  in_progress_courses INTEGER DEFAULT 0,
  average_completion INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- Users can read their own metrics
CREATE POLICY "Users can read their own metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (uid() = user_id);

-- Users can update their own metrics
CREATE POLICY "Users can update their own metrics"
  ON user_metrics
  FOR UPDATE
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

-- Admins can read all metrics for users in their company
CREATE POLICY "Admins can read company metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      JOIN users target_user ON target_user.id = user_metrics.user_id
      WHERE admin_user.id = uid()
        AND admin_user.role = 'admin'
        AND admin_user.company_id = target_user.company_id
    )
  );

-- Super admins can read all metrics
CREATE POLICY "Super admins can read all metrics"
  ON user_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = uid()
        AND users.role = 'super_admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id);

-- Create trigger to update updated_at on update
CREATE OR REPLACE FUNCTION update_user_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_metrics_updated_at
BEFORE UPDATE ON user_metrics
FOR EACH ROW
EXECUTE FUNCTION update_user_metrics_updated_at();