-- Add updated_at column to user_metrics table if it doesn't exist
ALTER TABLE user_metrics 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update the function to properly handle the updated_at column
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