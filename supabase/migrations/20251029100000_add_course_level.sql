/*
  # Add course level field to courses table

  1. Add level column to courses table
  2. Add index for better query performance
  3. Update RLS policies to include the new column
*/

-- Add level column to courses table with default value 'Basics'
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Basics';

-- Add constraint to ensure level is one of the allowed values
ALTER TABLE courses 
ADD CONSTRAINT valid_course_level 
CHECK (level IN ('Basics', 'Intermediate', 'Advanced'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);

-- Update the database types in the supabase.ts file to include the new level field
-- This will be done in the application code

-- Refresh the database statistics
ANALYZE courses;