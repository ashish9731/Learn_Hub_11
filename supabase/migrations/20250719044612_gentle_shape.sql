/*
  # Fix User Courses Assignment Table
  
  This migration ensures the user_courses table has all required columns
  and constraints for proper course assignment functionality.
  
  1. Table Structure
    - Ensures assigned_by and due_date columns exist
    - Adds proper foreign key constraints
    - Creates performance indexes
  
  2. Security
    - Maintains existing RLS policies
    - Ensures proper permissions
*/

-- Ensure user_courses table exists with proper structure
DO $$
BEGIN
  -- Create user_courses table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_courses' AND table_schema = 'public') THEN
    RAISE NOTICE 'Creating user_courses table...';
    
    CREATE TABLE public.user_courses (
      user_id uuid NOT NULL,
      course_id uuid NOT NULL,
      assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      assigned_by uuid,
      due_date timestamptz,
      PRIMARY KEY (user_id, course_id)
    );
    
    -- Enable RLS
    ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'user_courses table created successfully';
  ELSE
    RAISE NOTICE 'user_courses table already exists';
  END IF;
END $$;

-- Add assigned_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_courses' 
    AND column_name = 'assigned_by' 
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Adding assigned_by column to user_courses...';
    ALTER TABLE public.user_courses ADD COLUMN assigned_by uuid;
  ELSE
    RAISE NOTICE 'assigned_by column already exists';
  END IF;
END $$;

-- Add due_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_courses' 
    AND column_name = 'due_date' 
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Adding due_date column to user_courses...';
    ALTER TABLE public.user_courses ADD COLUMN due_date timestamptz;
  ELSE
    RAISE NOTICE 'due_date column already exists';
  END IF;
END $$;

-- Add foreign key constraint for assigned_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_courses_assigned_by_fkey' 
    AND table_name = 'user_courses'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Adding foreign key constraint for assigned_by...';
    ALTER TABLE public.user_courses 
    ADD CONSTRAINT user_courses_assigned_by_fkey 
    FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'assigned_by foreign key constraint already exists';
  END IF;
END $$;

-- Add foreign key constraint for user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_courses_user_id_fkey' 
    AND table_name = 'user_courses'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Adding foreign key constraint for user_id...';
    ALTER TABLE public.user_courses 
    ADD CONSTRAINT user_courses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'user_id foreign key constraint already exists';
  END IF;
END $$;

-- Add foreign key constraint for course_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_courses_course_id_fkey' 
    AND table_name = 'user_courses'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Adding foreign key constraint for course_id...';
    ALTER TABLE public.user_courses 
    ADD CONSTRAINT user_courses_course_id_fkey 
    FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'course_id foreign key constraint already exists';
  END IF;
END $$;

-- Create performance indexes
DO $$
BEGIN
  -- Index for assigned_by queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_courses_assigned_by' 
    AND tablename = 'user_courses'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating index for assigned_by...';
    CREATE INDEX idx_user_courses_assigned_by ON public.user_courses(assigned_by);
  END IF;
  
  -- Index for user_id queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_courses_user_id' 
    AND tablename = 'user_courses'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating index for user_id...';
    CREATE INDEX idx_user_courses_user_id ON public.user_courses(user_id);
  END IF;
  
  -- Index for course_id queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_courses_course_id' 
    AND tablename = 'user_courses'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating index for course_id...';
    CREATE INDEX idx_user_courses_course_id ON public.user_courses(course_id);
  END IF;
  
  -- Composite index for user-course queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_courses_user_course' 
    AND tablename = 'user_courses'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating composite index for user-course queries...';
    CREATE INDEX idx_user_courses_user_course ON public.user_courses(user_id, course_id);
  END IF;
END $$;

-- Ensure RLS policies exist
DO $$
BEGIN
  -- Policy for users to view their own course assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'user_courses_user_select' 
    AND tablename = 'user_courses'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating RLS policy for user course selection...';
    CREATE POLICY "user_courses_user_select" ON public.user_courses
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
  
  -- Policy for admins to manage course assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'user_courses_admin_manage' 
    AND tablename = 'user_courses'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating RLS policy for admin course management...';
    CREATE POLICY "user_courses_admin_manage" ON public.user_courses
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users admin_user
          JOIN public.users target_user ON target_user.id = user_courses.user_id
          WHERE admin_user.id = auth.uid() 
          AND admin_user.role = 'admin'
          AND admin_user.company_id = target_user.company_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users admin_user
          JOIN public.users target_user ON target_user.id = user_courses.user_id
          WHERE admin_user.id = auth.uid() 
          AND admin_user.role = 'admin'
          AND admin_user.company_id = target_user.company_id
        )
      );
  END IF;
  
  -- Policy for super admins to manage all course assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'user_courses_super_admin_all' 
    AND tablename = 'user_courses'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating RLS policy for super admin course management...';
    CREATE POLICY "user_courses_super_admin_all" ON public.user_courses
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END $$;