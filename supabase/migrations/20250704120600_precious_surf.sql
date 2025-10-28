-- Delete specific podcast entries
DELETE FROM podcasts 
WHERE title LIKE '%How Timeboxing%' 
   OR title LIKE '%Eat That Frog%';

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