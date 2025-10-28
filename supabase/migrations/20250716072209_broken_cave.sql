/*
  # Create list user metrics functions

  1. Functions
    - `list_all_user_metrics` - List all user metrics (for super admins)
    - `list_company_user_metrics` - List user metrics for a specific company (for admins)
    - `get_admin_user_metrics` - Get user metrics for an admin's company

  These functions bypass RLS for authorized users to avoid permission errors.
*/

-- Function to list all user metrics (for super admins)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS SETOF user_metrics
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Check if user is a super admin
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  ) THEN
    RETURN QUERY
    SELECT * FROM user_metrics
    ORDER BY updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only super admins can access this function';
  END IF;
END;
$$;

-- Function to list user metrics for a specific company (for admins)
CREATE OR REPLACE FUNCTION list_company_user_metrics(p_company_id UUID)
RETURNS SETOF user_metrics
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Check if user is an admin for this company
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'super_admin')
    AND (company_id = p_company_id OR role = 'super_admin')
  ) THEN
    RETURN QUERY
    SELECT um.*
    FROM user_metrics um
    JOIN users u ON u.id = um.user_id
    WHERE u.company_id = p_company_id
    ORDER BY um.updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only admins for this company can access this function';
  END IF;
END;
$$;

-- Function to get user metrics for an admin's company
CREATE OR REPLACE FUNCTION get_admin_user_metrics()
RETURNS SETOF user_metrics
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get the admin's company ID
  SELECT company_id INTO v_company_id
  FROM users
  WHERE id = auth.uid()
  AND role = 'admin';
  
  IF v_company_id IS NULL THEN
    -- Check if super admin
    IF EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    ) THEN
      -- Super admin can see all metrics
      RETURN QUERY
      SELECT * FROM user_metrics
      ORDER BY updated_at DESC;
    ELSE
      -- Not an admin or super admin
      RAISE EXCEPTION 'Permission denied: Only admins can access this function';
    END IF;
  ELSE
    -- Return metrics for users in the admin's company
    RETURN QUERY
    SELECT um.*
    FROM user_metrics um
    JOIN users u ON u.id = um.user_id
    WHERE u.company_id = v_company_id
    ORDER BY um.updated_at DESC;
  END IF;
END;
$$;