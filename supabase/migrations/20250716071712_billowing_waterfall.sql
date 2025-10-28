/*
  # Create Get Podcast Progress Functions

  1. New Functions
    - get_user_podcast_progress: Gets podcast progress for a specific user
    - get_all_podcast_progress: Gets all podcast progress (for super admins)
*/

-- Function to get podcast progress for a specific user
CREATE OR REPLACE FUNCTION get_user_podcast_progress(p_user_id UUID)
RETURNS SETOF podcast_progress AS $$
BEGIN
  -- Check if the user is requesting their own progress or has admin rights
  IF auth.uid() = p_user_id OR 
     EXISTS (
       SELECT 1 FROM users
       WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
     ) THEN
    
    RETURN QUERY
    SELECT * FROM podcast_progress
    WHERE user_id = p_user_id
    ORDER BY last_played_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: You can only view your own progress';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all podcast progress (for super admins)
CREATE OR REPLACE FUNCTION get_all_podcast_progress()
RETURNS SETOF podcast_progress AS $$
BEGIN
  -- Check if user is super_admin
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN QUERY
    SELECT * FROM podcast_progress
    ORDER BY last_played_at DESC;
  ELSE
    -- For admins, return progress for users in their company
    IF EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN QUERY
      SELECT pp.*
      FROM podcast_progress pp
      JOIN users u ON u.id = pp.user_id
      JOIN users admin ON admin.id = auth.uid()
      WHERE admin.company_id = u.company_id
      ORDER BY pp.last_played_at DESC;
    ELSE
      -- For regular users, return only their own progress
      RETURN QUERY
      SELECT * FROM podcast_progress
      WHERE user_id = auth.uid()
      ORDER BY last_played_at DESC;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;