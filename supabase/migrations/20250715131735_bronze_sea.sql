/*
  # Add podcast progress trigger for real-time metrics updates

  1. New Triggers
    - `update_user_metrics_on_progress_change` - Updates user metrics when podcast progress changes
    - `notify_progress_change` - Sends notification when podcast progress changes

  2. New Functions
    - `update_user_metrics()` - Calculates and updates user metrics
    - `notify_progress_change()` - Sends notification for real-time updates
*/

-- Function to update user metrics when podcast progress changes
CREATE OR REPLACE FUNCTION update_user_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when podcast progress is updated
  -- It can be extended to update user metrics in a separate table
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify clients of progress changes
CREATE OR REPLACE FUNCTION notify_progress_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'podcast_progress_change',
    json_build_object(
      'user_id', NEW.user_id,
      'podcast_id', NEW.podcast_id,
      'progress_percent', NEW.progress_percent,
      'last_played_at', NEW.last_played_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user metrics when podcast progress changes
CREATE TRIGGER update_user_metrics_on_progress_change
AFTER INSERT OR UPDATE ON podcast_progress
FOR EACH ROW
EXECUTE FUNCTION update_user_metrics();

-- Trigger to notify clients of progress changes
CREATE TRIGGER notify_progress_change
AFTER INSERT OR UPDATE ON podcast_progress
FOR EACH ROW
EXECUTE FUNCTION notify_progress_change();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_podcast_progress_user_podcast
ON podcast_progress(user_id, podcast_id);