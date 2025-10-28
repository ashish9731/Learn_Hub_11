/*
  # Create List User Metrics Function

  1. New Functions
    - list_all_user_metrics: Lists all user metrics with proper filtering
    - list_company_user_metrics: Lists metrics for users in a specific company
*/

-- Function to list all user metrics (for super admins)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS SETOF user_metrics AS $$
BEGIN
  -- Check if user is super_admin
  IF EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
  ) THEN
    RETURN QUERY
    SELECT * FROM user_metrics
    ORDER BY updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only super admins can list all metrics';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list user metrics for a specific company (for admins)
CREATE OR REPLACE FUNCTION list_company_user_metrics(p_company_id UUID)
RETURNS SETOF user_metrics AS $$
DECLARE
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  -- Get current user's role and company
  SELECT role, company_id INTO v_user_role, v_user_company_id
  FROM users
  WHERE id = auth.uid();
  
  -- Check permissions
  IF v_user_role = 'super_admin' OR 
     (v_user_role = 'admin' AND v_user_company_id = p_company_id) THEN
    
    RETURN QUERY
    SELECT um.*
    FROM user_metrics um
    JOIN users u ON u.id = um.user_id
    WHERE u.company_id = p_company_id
    ORDER BY um.updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Permission denied: You can only view metrics for your company';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get metrics for users managed by an admin
CREATE OR REPLACE FUNCTION get_admin_user_metrics()
RETURNS SETOF user_metrics AS $$
DECLARE
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  -- Get current user's role and company
  SELECT role, company_id INTO v_user_role, v_user_company_id
  FROM users
  WHERE id = auth.uid();
  
  -- Check permissions
  IF v_user_role = 'super_admin' THEN
    RETURN QUERY
    SELECT * FROM user_metrics
    ORDER BY updated_at DESC;
  ELSIF v_user_role = 'admin' AND v_user_company_id IS NOT NULL THEN
    RETURN QUERY
    SELECT um.*
    FROM user_metrics um
    JOIN users u ON u.id = um.user_id
    WHERE u.company_id = v_user_company_id
    ORDER BY um.updated_at DESC;
  ELSE
    -- Return only the user's own metrics
    RETURN QUERY
    SELECT * FROM user_metrics
    WHERE user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;