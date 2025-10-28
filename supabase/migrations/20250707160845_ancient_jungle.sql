/*
  # Add Description Column to Courses Table

  1. Database Changes
    - Add description column to courses table if it doesn't exist
    - This allows storing course descriptions in the database
    - Fixes errors when creating courses with descriptions

  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Add description column to courses table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'courses' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE courses ADD COLUMN description TEXT;
  END IF;
END $$;

-- Update statistics for better query planning
ANALYZE courses;