/*
  # Fix user metrics function

  1. Changes
    - Drop existing function if it exists
    - Create new function with correct parameter name (p_user_id)
    - Ensure function always returns valid JSON structure
*/

DROP FUNCTION IF EXISTS public.get_user_metrics(uuid);
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