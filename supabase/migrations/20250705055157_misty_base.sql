/*
  # Remove Duplicate Podcasts

  1. Purpose
    - Remove specific duplicate podcasts that are causing UI issues
    - Clean up the database to ensure a better user experience
    - Target specific podcast titles that are known duplicates

  2. Changes
    - Delete podcasts with titles "Eat That Frog!.mp3" and "How Timeboxing Works..."
    - Remove any orphaned content categories
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