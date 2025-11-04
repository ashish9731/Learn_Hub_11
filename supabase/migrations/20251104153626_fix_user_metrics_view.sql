-- Drop the incorrect trigger function that was trying to insert into the user_metrics view
DROP TRIGGER IF EXISTS update_user_metrics_trigger ON podcast_progress;
DROP FUNCTION IF EXISTS update_user_metrics_from_progress();

-- Recreate the user_metrics view with updated_at column
CREATE OR REPLACE VIEW user_metrics AS
SELECT
    u.id AS user_id,
    u.email,
    COALESCE(SUM(CASE WHEN pp.duration > 0 THEN (pp.playback_position / pp.duration) * pp.duration ELSE 0 END) / 3600.0, 0) AS total_hours,
    COALESCE(COUNT(DISTINCT pp.podcast_id) FILTER (WHERE pp.progress_percent = 100), 0) AS completed_courses,
    COALESCE(COUNT(DISTINCT pp.podcast_id) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100), 0) AS in_progress_courses,
    COALESCE(AVG(pp.progress_percent), 0) AS average_completion,
    NOW() AS updated_at
FROM
    users u
LEFT JOIN
    podcast_progress pp ON u.id = pp.user_id
GROUP BY
    u.id, u.email;