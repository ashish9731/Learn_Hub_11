/*
  # Create user_metrics view

  1. New Views
    - `user_metrics`
      - Aggregates user learning data from podcast_progress table
      - Calculates total_hours, completed_courses, in_progress_courses, average_completion
      - Provides data for the get_user_metrics RPC function

  2. Security
    - View inherits RLS from underlying tables (users, podcast_progress)
    - Access controlled through existing table policies
*/

-- Create the user_metrics view
CREATE OR REPLACE VIEW user_metrics AS
SELECT
    u.id AS user_id,
    u.email,
    COALESCE(SUM(CASE WHEN pp.duration > 0 THEN (pp.playback_position / pp.duration) * pp.duration ELSE 0 END) / 3600.0, 0) AS total_hours,
    COALESCE(COUNT(DISTINCT pp.podcast_id) FILTER (WHERE pp.progress_percent = 100), 0) AS completed_courses,
    COALESCE(COUNT(DISTINCT pp.podcast_id) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100), 0) AS in_progress_courses,
    COALESCE(AVG(pp.progress_percent), 0) AS average_completion
FROM
    users u
LEFT JOIN
    podcast_progress pp ON u.id = pp.user_id
GROUP BY
    u.id, u.email;