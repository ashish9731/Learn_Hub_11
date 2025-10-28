/*
  # Fix user metrics function

  1. Changes
     - Properly drops the existing function before creating a new one
     - Ensures the function returns a consistent JSON structure
     - Handles empty results gracefully
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_user_metrics(uuid);

-- Then create the new function with the same signature
CREATE FUNCTION public.get_user_metrics(p_user_id uuid)
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'user_id', p_user_id,
    'data', COALESCE((
      SELECT json_build_object(
        'metrics', COALESCE((
          SELECT json_agg(some_metric)
          FROM user_metrics
          WHERE user_id = p_user_id
        ), '[]'::json)
      )
    ), json_build_object('metrics', '[]'::json))
  );
END;
$$ LANGUAGE plpgsql;