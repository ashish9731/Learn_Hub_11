/*
  # Create list user metrics functions

  1. Functions
    - `list_all_user_metrics`: List all user metrics (for super admins)
    - `list_company_user_metrics`: List user metrics for a specific company (for admins)
    - `get_admin_user_metrics`: Get user metrics for an admin's company
*/

-- Function to list all user metrics (for super admins)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS SETOF user_metrics
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check if user is a super admin
  SELECT role INTO v_role FROM users WHERE id = auth.uid();
  
  IF v_role = 'super_admin' THEN
    RETURN QUERY
    SELECT * FROM user_metrics
    ORDER BY updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only super admins can list all user metrics';
  END IF;
END;
$$;

-- Function to list user metrics for a specific company (for admins)
CREATE OR REPLACE FUNCTION list_company_user_metrics(p_company_id UUID)
RETURNS SETOF user_metrics
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_role TEXT;
  v_user_company_id UUID;
BEGIN
  -- Check if user is an admin or super admin
  SELECT role, company_id INTO v_role, v_user_company_id FROM users WHERE id = auth.uid();
  
  IF v_role = 'super_admin' OR (v_role = 'admin' AND v_user_company_id = p_company_id) THEN
    RETURN QUERY
    SELECT m.*
    FROM user_metrics m
    JOIN users u ON m.user_id = u.id
    WHERE u.company_id = p_company_id
    ORDER BY m.updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only admins of this company or super admins can list company user metrics';
  END IF;
END;
$$;

-- Function to get user metrics for an admin's company
CREATE OR REPLACE FUNCTION get_admin_user_metrics()
RETURNS SETOF user_metrics
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_role TEXT;
  v_company_id UUID;
BEGIN
  -- Get the current user's role and company
  SELECT role, company_id INTO v_role, v_company_id FROM users WHERE id = auth.uid();
  
  IF v_role = 'super_admin' THEN
    -- Super admins can see all metrics
    RETURN QUERY
    SELECT * FROM user_metrics
    ORDER BY updated_at DESC;
  ELSIF v_role = 'admin' AND v_company_id IS NOT NULL THEN
    -- Admins can see metrics for users in their company
    RETURN QUERY
    SELECT m.*
    FROM user_metrics m
    JOIN users u ON m.user_id = u.id
    WHERE u.company_id = v_company_id
    ORDER BY m.updated_at DESC;
  ELSE
    -- Regular users can only see their own metrics
    RETURN QUERY
    SELECT * FROM user_metrics
    WHERE user_id = auth.uid();
  END IF;
END;
$$;