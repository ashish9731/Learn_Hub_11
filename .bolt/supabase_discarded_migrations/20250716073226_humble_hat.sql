/*
  # Create list user metrics functions

  1. Functions
    - `list_all_user_metrics()` - Lists all user metrics (for super admins)
    - `list_company_user_metrics(p_company_id UUID)` - Lists user metrics for a company (for admins)
    - `get_admin_user_metrics()` - Gets user metrics for the current admin's company
*/

-- Function to list all user metrics (for super admins)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS SETOF user_metrics AS $$
BEGIN
  -- Check if the user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only super admins can list all user metrics';
  END IF;

  -- Return all user metrics
  RETURN QUERY
  SELECT * FROM user_metrics
  ORDER BY updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list user metrics for a company (for admins)
CREATE OR REPLACE FUNCTION list_company_user_metrics(p_company_id UUID)
RETURNS SETOF user_metrics AS $$
DECLARE
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  -- Get the current user's role and company
  SELECT role, company_id
  INTO v_user_role, v_user_company_id
  FROM users
  WHERE id = auth.uid();

  -- Check permissions
  IF v_user_role = 'super_admin' THEN
    -- Super admins can see any company's metrics
    NULL;
  ELSIF v_user_role = 'admin' AND v_user_company_id = p_company_id THEN
    -- Admins can only see their own company's metrics
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied: You can only view metrics for your own company';
  END IF;

  -- Return user metrics for the specified company
  RETURN QUERY
  SELECT um.*
  FROM user_metrics um
  JOIN users u ON u.id = um.user_id
  WHERE u.company_id = p_company_id
  ORDER BY um.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user metrics for the current admin's company
CREATE OR REPLACE FUNCTION get_admin_user_metrics()
RETURNS SETOF user_metrics AS $$
DECLARE
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  -- Get the current user's role and company
  SELECT role, company_id
  INTO v_user_role, v_user_company_id
  FROM users
  WHERE id = auth.uid();

  -- Check permissions
  IF v_user_role = 'super_admin' THEN
    -- Super admins can see all metrics
    RETURN QUERY
    SELECT * FROM user_metrics
    ORDER BY updated_at DESC;
  ELSIF v_user_role = 'admin' AND v_user_company_id IS NOT NULL THEN
    -- Admins can only see their own company's metrics
    RETURN QUERY
    SELECT um.*
    FROM user_metrics um
    JOIN users u ON u.id = um.user_id
    WHERE u.company_id = v_user_company_id
    ORDER BY um.updated_at DESC;
  ELSE
    -- Regular users can only see their own metrics
    RETURN QUERY
    SELECT * FROM user_metrics
    WHERE user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;