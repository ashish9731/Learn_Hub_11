/*
  # Create get podcast progress functions

  1. Functions
    - `get_user_podcast_progress(p_user_id UUID)` - Gets podcast progress for a user
    - `get_all_podcast_progress()` - Gets all podcast progress (for super admins)

  2. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Validate permissions based on user role
    - Handle errors gracefully
*/

-- Function to get podcast progress for a user
CREATE OR REPLACE FUNCTION get_user_podcast_progress(p_user_id UUID)
RETURNS SETOF podcast_progress AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  -- Get the current user's role and company
  SELECT role, company_id
  INTO v_user_role, v_user_company_id
  FROM users
  WHERE id = v_current_user_id;

  -- Check permissions
  IF v_current_user_id = p_user_id THEN
    -- Users can see their own progress
    NULL;
  ELSIF v_user_role = 'super_admin' THEN
    -- Super admins can see any user's progress
    NULL;
  ELSIF v_user_role = 'admin' THEN
    -- Admins can only see progress for users in their company
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = p_user_id
        AND company_id = v_user_company_id
    ) THEN
      RAISE EXCEPTION 'Permission denied: You can only view progress for users in your company';
    END IF;
  ELSE
    RAISE EXCEPTION 'Permission denied: You can only view your own progress';
  END IF;

  -- Return podcast progress for the specified user
  RETURN QUERY
  SELECT *
  FROM podcast_progress
  WHERE user_id = p_user_id
  ORDER BY last_played_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all podcast progress (for super admins)
CREATE OR REPLACE FUNCTION get_all_podcast_progress()
RETURNS SETOF podcast_progress AS $$
BEGIN
  -- Check if the user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only super admins can view all podcast progress';
  END IF;

  -- Return all podcast progress
  RETURN QUERY
  SELECT *
  FROM podcast_progress
  ORDER BY last_played_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;