/*
  # Remove Email Functionality and pg_net Dependencies

  1. Changes Made
    - Remove all email-related functions and triggers
    - Remove pg_net extension dependencies
    - Clean up net schema conflicts
    - Simplify course assignment without email notifications
    - Keep audit logging for tracking

  2. Security
    - Maintain existing RLS policies
    - Keep audit trail functionality
    - Remove only email-specific components
*/

-- Drop all email-related triggers first
DROP TRIGGER IF EXISTS course_assignment_notification_trigger ON user_courses;
DROP TRIGGER IF EXISTS podcast_assignment_notification_trigger ON podcast_assignments;
DROP TRIGGER IF EXISTS user_update_trigger ON users;

-- Drop all email-related functions
DROP FUNCTION IF EXISTS send_course_assignment_notification() CASCADE;
DROP FUNCTION IF EXISTS send_podcast_assignment_notification() CASCADE;
DROP FUNCTION IF EXISTS notify_course_assignment() CASCADE;
DROP FUNCTION IF EXISTS notify_podcast_assignment() CASCADE;
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;

-- Drop pg_net extension completely to resolve schema conflicts
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Drop the conflicting net schema
DROP SCHEMA IF EXISTS net CASCADE;

-- Create simplified course assignment function without email
CREATE OR REPLACE FUNCTION assign_course_to_user(
  p_user_id UUID,
  p_course_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  user_exists BOOLEAN;
  course_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_course_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID and Course ID are required'
    );
  END IF;

  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if course exists
  SELECT EXISTS(SELECT 1 FROM courses WHERE id = p_course_id) INTO course_exists;
  IF NOT course_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Course not found'
    );
  END IF;

  -- Insert course assignment
  INSERT INTO user_courses (user_id, course_id, assigned_by, assigned_at)
  VALUES (p_user_id, p_course_id, p_assigned_by, CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = CURRENT_TIMESTAMP;

  -- Log the assignment in audit logs
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_assigned_by,
    'course_assigned',
    'user_courses',
    p_course_id,
    json_build_object(
      'assigned_to', p_user_id,
      'course_id', p_course_id,
      'assigned_by', p_assigned_by
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Course assigned successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION assign_course_to_user(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_course_to_user(UUID, UUID, UUID) TO service_role;

-- Create simplified podcast assignment function without email
CREATE OR REPLACE FUNCTION assign_podcast_to_user(
  p_user_id UUID,
  p_podcast_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  user_exists BOOLEAN;
  podcast_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_podcast_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID and Podcast ID are required'
    );
  END IF;

  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if podcast exists
  SELECT EXISTS(SELECT 1 FROM podcasts WHERE id = p_podcast_id) INTO podcast_exists;
  IF NOT podcast_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Podcast not found'
    );
  END IF;

  -- Insert podcast assignment
  INSERT INTO podcast_assignments (user_id, podcast_id, assigned_by, assigned_at)
  VALUES (p_user_id, p_podcast_id, p_assigned_by, CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, podcast_id) DO UPDATE SET
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = CURRENT_TIMESTAMP;

  -- Log the assignment in audit logs
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_assigned_by,
    'podcast_assigned',
    'podcast_assignments',
    p_podcast_id,
    json_build_object(
      'assigned_to', p_user_id,
      'podcast_id', p_podcast_id,
      'assigned_by', p_assigned_by
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Podcast assigned successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION assign_podcast_to_user(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_podcast_to_user(UUID, UUID, UUID) TO service_role;

-- Update existing triggers to use simple logging instead of email
CREATE OR REPLACE FUNCTION simple_course_assignment_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple logging without email
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    NEW.assigned_by,
    'course_assigned',
    'user_courses',
    NEW.course_id,
    json_build_object(
      'assigned_to', NEW.user_id,
      'course_id', NEW.course_id,
      'assigned_by', NEW.assigned_by
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for simple logging
CREATE TRIGGER simple_course_assignment_log_trigger
  AFTER INSERT ON user_courses
  FOR EACH ROW
  EXECUTE FUNCTION simple_course_assignment_log();

-- Create simple podcast assignment logging
CREATE OR REPLACE FUNCTION simple_podcast_assignment_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple logging without email
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    NEW.assigned_by,
    'podcast_assigned',
    'podcast_assignments',
    NEW.podcast_id,
    json_build_object(
      'assigned_to', NEW.user_id,
      'podcast_id', NEW.podcast_id,
      'assigned_by', NEW.assigned_by
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for simple podcast logging
CREATE TRIGGER simple_podcast_assignment_log_trigger
  AFTER INSERT ON podcast_assignments
  FOR EACH ROW
  EXECUTE FUNCTION simple_podcast_assignment_log();