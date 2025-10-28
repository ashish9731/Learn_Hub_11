/*
  # Create List User Metrics Function

  1. Functions
    - Create RPC function to list all user metrics for super admins
    - This function bypasses RLS for authorized super admin operations
*/

-- Function to list all user metrics (for super admins only)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS SETOF user_metrics AS $$
BEGIN
  -- Check if the user is a super admin
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN QUERY
    SELECT * FROM user_metrics;
  ELSE
    -- For admins, return metrics for users in their company
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN QUERY
      SELECT um.* 
      FROM user_metrics um
      JOIN users u ON um.user_id = u.id
      JOIN users admin ON admin.id = auth.uid()
      WHERE u.company_id = admin.company_id;
    ELSE
      -- For regular users, return only their own metrics
      RETURN QUERY
      SELECT * FROM user_metrics
      WHERE user_id = auth.uid();
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;