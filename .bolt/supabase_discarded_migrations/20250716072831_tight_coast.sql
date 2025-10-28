/*
  # Create get podcast progress functions

  1. Functions
    - `get_user_podcast_progress`: Get podcast progress for a specific user
    - `get_all_podcast_progress`: Get all podcast progress (for super admins)
*/

-- Function to get podcast progress for a specific user
CREATE OR REPLACE FUNCTION get_user_podcast_progress(p_user_id UUID)
RETURNS SETOF podcast_progress
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Check if the user is requesting their own progress or is an admin
  IF auth.uid() = p_user_id OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RETURN QUERY
    SELECT * FROM podcast_progress
    WHERE user_id = p_user_id
    ORDER BY last_played_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: You can only access your own podcast progress';
  END IF;
END;
$$;

-- Function to get all podcast progress (for super admins)
CREATE OR REPLACE FUNCTION get_all_podcast_progress()
RETURNS SETOF podcast_progress
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check if user is a super admin
  SELECT role INTO v_role FROM users WHERE id = auth.uid();
  
  IF v_role = 'super_admin' THEN
    RETURN QUERY
    SELECT * FROM podcast_progress
    ORDER BY last_played_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only super admins can access all podcast progress';
  END IF;
END;
$$;