/*
  # Create HTTP extension and functions

  1. Extensions
    - Enable http extension for making HTTP requests
    - Enable net schema with required functions
  
  2. Functions
    - Create net.http_post function for HTTP requests
    - Set up proper permissions and security
*/

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create the net schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS net;

-- Grant permissions on the net schema
GRANT USAGE ON SCHEMA net TO anon, authenticated, service_role;

-- Create the http_post function in the net schema
CREATE OR REPLACE FUNCTION net.http_post(
  url text,
  headers jsonb DEFAULT '{}'::jsonb,
  body jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Use the http extension to make the POST request
  SELECT content::jsonb INTO result
  FROM http((
    'POST',
    url,
    ARRAY[
      http_header('Content-Type', 'application/json')
    ] || CASE 
      WHEN headers IS NOT NULL THEN 
        ARRAY(SELECT http_header(key, value) FROM jsonb_each_text(headers))
      ELSE 
        ARRAY[]::http_header[]
    END,
    body::text,
    NULL
  )::http_request);
  
  RETURN COALESCE(result, '{}'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb) TO anon, authenticated, service_role;

-- Create a simpler version without optional parameters for compatibility
CREATE OR REPLACE FUNCTION net.http_post(url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN net.http_post(url, '{}'::jsonb, '{}'::jsonb);
END;
$$;

-- Grant execute permissions on the simpler function
GRANT EXECUTE ON FUNCTION net.http_post(text) TO anon, authenticated, service_role;