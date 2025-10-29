/*
  # Add level field to content_categories table

  1. Add level column to content_categories table
  2. Add constraint to ensure level is one of the allowed values
  3. Create index for better query performance
  4. Update RLS policies to include the new column
*/

-- Add level column to content_categories table with default value 'Basics'
ALTER TABLE content_categories 
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Basics';

-- Add constraint to ensure level is one of the allowed values
ALTER TABLE content_categories 
ADD CONSTRAINT valid_category_level 
CHECK (level IN ('Basics', 'Intermediate', 'Advanced'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_content_categories_level ON content_categories(level);

-- Update the database types in the supabase.ts file to include the new level field
-- This will be done in the application code

-- Refresh the database statistics
ANALYZE content_categories;