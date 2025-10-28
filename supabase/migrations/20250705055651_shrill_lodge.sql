/*
  # Remove Duplicate Podcasts and Fix Content Count

  1. Purpose
    - Remove specific duplicate podcasts from the database
    - Ensure accurate podcast counts in the UI
    - Clean up any orphaned categories

  2. Changes
    - Delete podcasts with specific titles
    - Remove orphaned content categories
    - Update statistics for better query planning
*/

-- Delete specific podcast entries
DELETE FROM podcasts 
WHERE title = 'Eat That Frog!.mp3' 
   OR title = 'How Timeboxing Works and Why It Will Make You More Productive';

-- Clean up any orphaned content categories (categories with no podcasts)
DELETE FROM content_categories
WHERE id NOT IN (
    SELECT DISTINCT category_id 
    FROM podcasts 
    WHERE category_id IS NOT NULL
);

-- Update statistics for better query planning
ANALYZE podcasts;
ANALYZE content_categories;