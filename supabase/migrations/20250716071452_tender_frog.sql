/*
  # Fix User Metrics RLS Policies

  1. Security
    - Enable RLS on user_metrics table
    - Add policy for users to read their own metrics
    - Add policy for admins to read metrics for their company
    - Add policy for super admins to read all metrics
    - Add policy for users to update their own metrics
*/

-- First, ensure RLS is enabled
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own metrics" ON user_metrics;
DROP POLICY IF EXISTS "Admins can read company metrics" ON user_metrics;
DROP POLICY IF EXISTS "Super admins can read all metrics" ON user_metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON user_metrics;

-- Create policy for users to read their own metrics
CREATE POLICY "Users can read their own metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for admins to read metrics for users in their company
CREATE POLICY "Admins can read company metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      JOIN users target_user ON target_user.id = user_metrics.user_id
      WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'admin'
        AND admin_user.company_id = target_user.company_id
    )
  );

-- Create policy for super admins to read all metrics
CREATE POLICY "Super admins can read all metrics"
  ON user_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
    )
  );

-- Create policy for users to update their own metrics
CREATE POLICY "Users can update their own metrics"
  ON user_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);