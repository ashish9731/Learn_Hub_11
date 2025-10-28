/*
  # Email Notification System

  1. New Functions
    - `send_course_assignment_notification` - Sends email when a course is assigned
    - `send_podcast_assignment_notification` - Sends email when a podcast is assigned
    - `process_assignment_notification` - Helper function to process notifications

  2. Triggers
    - `course_assignment_notification_trigger` - Fires when a new user_course is created
    - `podcast_assignment_notification_trigger` - Fires when a podcast is assigned

  3. Security
    - Functions are set to SECURITY DEFINER to ensure they can access necessary data
*/

-- Create function to send course assignment notification
CREATE OR REPLACE FUNCTION public.send_course_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_assigner_email TEXT;
  v_course_title TEXT;
  v_course_description TEXT;
  v_user_role TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM public.users
  WHERE id = NEW.user_id;
  
  -- Get assigner email
  SELECT email INTO v_assigner_email
  FROM public.users
  WHERE id = NEW.assigned_by;
  
  -- Get course details
  SELECT title, description INTO v_course_title, v_course_description
  FROM public.courses
  WHERE id = NEW.course_id;
  
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = NEW.user_id;
  
  -- Insert into audit_logs
  INSERT INTO public.audit_logs (action, new_value)
  VALUES (
    'course_assignment_notification',
    json_build_object(
      'user_id', NEW.user_id,
      'user_email', v_user_email,
      'course_id', NEW.course_id,
      'course_title', v_course_title,
      'assigned_by', NEW.assigned_by,
      'assigned_at', NEW.assigned_at
    )
  );
  
  -- In production, this would call an edge function to send the email
  -- For now, we'll just log it
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send podcast assignment notification
CREATE OR REPLACE FUNCTION public.send_podcast_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_assigner_email TEXT;
  v_podcast_title TEXT;
  v_course_title TEXT;
  v_user_role TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM public.users
  WHERE id = NEW.user_id;
  
  -- Get podcast details
  SELECT p.title, c.title INTO v_podcast_title, v_course_title
  FROM public.podcasts p
  JOIN public.courses c ON p.course_id = c.id
  WHERE p.id = NEW.podcast_id;
  
  -- Insert into audit_logs
  INSERT INTO public.audit_logs (action, new_value)
  VALUES (
    'podcast_assignment_notification',
    json_build_object(
      'user_id', NEW.user_id,
      'user_email', v_user_email,
      'podcast_id', NEW.podcast_id,
      'podcast_title', v_podcast_title,
      'course_title', v_course_title
    )
  );
  
  -- In production, this would call an edge function to send the email
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for course assignments
DROP TRIGGER IF EXISTS course_assignment_notification_trigger ON public.user_courses;
CREATE TRIGGER course_assignment_notification_trigger
AFTER INSERT ON public.user_courses
FOR EACH ROW
EXECUTE FUNCTION public.send_course_assignment_notification();

-- Create table for podcast assignments if it doesn't exist
CREATE TABLE IF NOT EXISTS public.podcast_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  podcast_id uuid NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  due_date timestamptz,
  UNIQUE(user_id, podcast_id)
);

-- Enable RLS on podcast_assignments
ALTER TABLE public.podcast_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy for podcast_assignments
CREATE POLICY "Users can view their own podcast assignments"
  ON public.podcast_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage podcast assignments"
  ON public.podcast_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'super_admin')
    )
  );

-- Create trigger for podcast assignments
DROP TRIGGER IF EXISTS podcast_assignment_notification_trigger ON public.podcast_assignments;
CREATE TRIGGER podcast_assignment_notification_trigger
AFTER INSERT ON public.podcast_assignments
FOR EACH ROW
EXECUTE FUNCTION public.send_podcast_assignment_notification();

-- Create function to handle user_course assignments via RPC
CREATE OR REPLACE FUNCTION public.assign_course_to_user(
  p_user_id uuid,
  p_course_id uuid,
  p_assigned_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Check if assignment already exists
  IF EXISTS (
    SELECT 1 FROM public.user_courses
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Course already assigned to user'
    );
  END IF;

  -- Insert new assignment
  INSERT INTO public.user_courses (user_id, course_id, assigned_by, assigned_at)
  VALUES (p_user_id, p_course_id, p_assigned_by, CURRENT_TIMESTAMP)
  RETURNING json_build_object(
    'user_id', user_id,
    'course_id', course_id,
    'assigned_at', assigned_at
  ) INTO v_result;

  RETURN json_build_object(
    'success', true,
    'data', v_result
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Create function to handle podcast assignments via RPC
CREATE OR REPLACE FUNCTION public.assign_podcast_to_user(
  p_user_id uuid,
  p_podcast_id uuid,
  p_assigned_by uuid DEFAULT NULL,
  p_due_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_course_id uuid;
BEGIN
  -- Get course_id for the podcast
  SELECT course_id INTO v_course_id
  FROM public.podcasts
  WHERE id = p_podcast_id;
  
  -- Ensure the user is assigned to the course
  IF NOT EXISTS (
    SELECT 1 FROM public.user_courses
    WHERE user_id = p_user_id AND course_id = v_course_id
  ) THEN
    -- Assign the course first
    INSERT INTO public.user_courses (user_id, course_id, assigned_by, assigned_at)
    VALUES (p_user_id, v_course_id, p_assigned_by, CURRENT_TIMESTAMP);
  END IF;

  -- Check if podcast assignment already exists
  IF EXISTS (
    SELECT 1 FROM public.podcast_assignments
    WHERE user_id = p_user_id AND podcast_id = p_podcast_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Podcast already assigned to user'
    );
  END IF;

  -- Insert new podcast assignment
  INSERT INTO public.podcast_assignments (user_id, podcast_id, assigned_by, assigned_at, due_date)
  VALUES (p_user_id, p_podcast_id, p_assigned_by, CURRENT_TIMESTAMP, p_due_date)
  RETURNING json_build_object(
    'user_id', user_id,
    'podcast_id', podcast_id,
    'assigned_at', assigned_at,
    'due_date', due_date
  ) INTO v_result;

  RETURN json_build_object(
    'success', true,
    'data', v_result
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;