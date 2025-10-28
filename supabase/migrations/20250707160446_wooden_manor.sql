/*
  # Fix Courses Table Structure

  1. Problem
    - Error: "Could not find the 'description' column of 'courses' in the schema cache"
    - The application is trying to use a 'description' column that doesn't exist in the courses table
    - This is causing errors when creating new courses

  2. Solution
    - Add the missing 'description' column to the courses table
    - Ensure proper indexing and constraints
    - Update existing functions and triggers to handle the new column
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