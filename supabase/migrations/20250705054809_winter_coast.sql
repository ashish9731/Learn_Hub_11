/*
  # Remove Duplicate Podcasts

  1. Purpose
    - Remove duplicate podcast entries from the database
    - Specifically target podcasts with titles "Eat That Frog!.mp3" and "How Timeboxing Works and Why It Will Make You More Productive"
    - Clean up the database to ensure a better user experience

  2. Changes
    - Delete specific podcast entries by title
    - Remove any orphaned content categories
    - Update statistics for better query planning
*/

-- Delete specific podcast entries
DELETE FROM podcasts 
WHERE title = 'Eat That Frog!.mp3' 
   OR title = 'How Timeboxing Works and Why It Will Make You More Productive';

-- Delete duplicate "How to Focus on What's Important, Not Just What's Urgent" podcasts
WITH duplicates AS (
  SELECT id, title, ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at DESC) as row_num
  FROM podcasts
  WHERE title = 'How to Focus on What''s Important, Not Just What''s Urgent'
)
DELETE FROM podcasts
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

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