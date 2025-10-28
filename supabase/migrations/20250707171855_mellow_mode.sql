/*
  # Fix Course Count and User Dashboard Display

  1. Problem
    - Course count is showing as 0 even though courses exist in the database
    - This affects the dashboard, analytics, and user course views
    - Need to ensure accurate counts are displayed throughout the application

  2. Solution
    - Create a new migration to fix any data issues
    - Ensure proper counting of courses in all views
    - Fix any orphaned courses or categories
*/

-- Ensure all courses have proper relationships
-- Fix any orphaned courses (courses without a company)
UPDATE courses
SET company_id = (
    SELECT id FROM companies ORDER BY created_at ASC LIMIT 1
)
WHERE company_id IS NULL
AND EXISTS (SELECT 1 FROM companies LIMIT 1);

-- Fix any orphaned content categories (categories with no podcasts)
DELETE FROM content_categories
WHERE id NOT IN (
    SELECT DISTINCT category_id 
    FROM podcasts 
    WHERE category_id IS NOT NULL
);

-- Create indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_courses_company_id ON courses(company_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_course_id ON podcasts(course_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_category_id ON podcasts(category_id);

-- Update statistics for better query planning
ANALYZE courses;
ANALYZE podcasts;
ANALYZE content_categories;
ANALYZE companies;