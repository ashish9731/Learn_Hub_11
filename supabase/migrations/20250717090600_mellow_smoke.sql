/*
  # Email Notification Triggers

  1. New Tables
    - None (uses existing tables)
  
  2. Triggers
    - Creates triggers for course and podcast assignments
    - Sends email notifications when assignments are made
  
  3. Functions
    - Creates functions to handle notification events
*/

-- Function to notify when a course is assigned to a user
CREATE OR REPLACE FUNCTION notify_course_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_by UUID;
BEGIN
  -- Get the user who made the assignment (current user)
  v_assigned_by := auth.uid();
  
  -- If no user is found, use a default system user
  IF v_assigned_by IS NULL THEN
    -- Try to find a super_admin user
    SELECT id INTO v_assigned_by FROM users WHERE role = 'super_admin' LIMIT 1;
    
    -- If still no user, use the first admin
    IF v_assigned_by IS NULL THEN
      SELECT id INTO v_assigned_by FROM users WHERE role = 'admin' LIMIT 1;
    END IF;
  END IF;
  
  -- Call the edge function to send email notification
  PERFORM
    net.http_post(
      url := CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/notification-emails/course-assignment'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', CONCAT('Bearer ', current_setting('app.settings.supabase_anon_key'))
      ),
      body := jsonb_build_object(
        'assignment_data', jsonb_build_object(
          'user_id', NEW.user_id,
          'course_id', NEW.course_id,
          'assigned_by', v_assigned_by,
          'assigned_at', NEW.assigned_at
        )
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for course assignments
DROP TRIGGER IF EXISTS notify_course_assignment_trigger ON user_courses;
CREATE TRIGGER notify_course_assignment_trigger
AFTER INSERT ON user_courses
FOR EACH ROW
EXECUTE FUNCTION notify_course_assignment();

-- Function to notify when a podcast is assigned to a user
CREATE OR REPLACE FUNCTION notify_podcast_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_by UUID;
  v_podcast_id UUID;
  v_user_id UUID;
BEGIN
  -- This function will be triggered when a podcast is assigned
  -- For now, we'll use the user_courses table as a proxy
  -- In a real implementation, you might have a separate podcast_assignments table
  
  -- Get the user who made the assignment (current user)
  v_assigned_by := auth.uid();
  
  -- If no user is found, use a default system user
  IF v_assigned_by IS NULL THEN
    -- Try to find a super_admin user
    SELECT id INTO v_assigned_by FROM users WHERE role = 'super_admin' LIMIT 1;
    
    -- If still no user, use the first admin
    IF v_assigned_by IS NULL THEN
      SELECT id INTO v_assigned_by FROM users WHERE role = 'admin' LIMIT 1;
    END IF;
  END IF;
  
  -- For podcast assignments, we'll need to determine which podcasts are in the course
  -- and notify for each one
  FOR v_podcast_id IN 
    SELECT id FROM podcasts WHERE course_id = NEW.course_id
  LOOP
    -- Call the edge function to send email notification
    PERFORM
      net.http_post(
        url := CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/notification-emails/podcast-assignment'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', CONCAT('Bearer ', current_setting('app.settings.supabase_anon_key'))
        ),
        body := jsonb_build_object(
          'assignment_data', jsonb_build_object(
            'user_id', NEW.user_id,
            'podcast_id', v_podcast_id,
            'assigned_by', v_assigned_by,
            'assigned_at', NEW.assigned_at
          )
        )
      );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for podcast assignments (via course assignments)
DROP TRIGGER IF EXISTS notify_podcast_assignment_trigger ON user_courses;
CREATE TRIGGER notify_podcast_assignment_trigger
AFTER INSERT ON user_courses
FOR EACH ROW
EXECUTE FUNCTION notify_podcast_assignment();

-- Add app settings for Supabase URL and anon key if they don't exist
DO $$
BEGIN
  -- Check if the settings exist
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.settings.supabase_url') THEN
    -- Create the settings
    PERFORM set_config('app.settings.supabase_url', current_setting('SUPABASE_URL'), false);
    PERFORM set_config('app.settings.supabase_anon_key', current_setting('SUPABASE_ANON_KEY'), false);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, we'll create default placeholders
    -- These will need to be updated with real values
    PERFORM set_config('app.settings.supabase_url', 'https://your-project.supabase.co', false);
    PERFORM set_config('app.settings.supabase_anon_key', 'your-anon-key', false);
END $$;