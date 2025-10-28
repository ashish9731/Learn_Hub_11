/*
  # Fix Podcast Category Realtime Updates
  
  1. Problem
    - When adding a podcast with a specific content category, it's not updating in Supabase immediately
    - Need to ensure proper relationship between podcasts and content_categories
    
  2. Solution
    - Add trigger to ensure category_id is properly set when a podcast is created or updated
    - Ensure proper indexing for better performance
    - Fix any issues with the relationship between podcasts and categories
*/

-- Create function to update podcast category_id based on category enum
CREATE OR REPLACE FUNCTION sync_podcast_category()
RETURNS TRIGGER AS $$
DECLARE
    category_record UUID;
BEGIN
    -- If category is set but category_id is not, try to find or create the category
    IF NEW.category IS NOT NULL AND NEW.category_id IS NULL THEN
        -- Check if a category with this name exists for this course
        SELECT id INTO category_record
        FROM content_categories
        WHERE course_id = NEW.course_id
        AND name = NEW.category::text
        LIMIT 1;
        
        -- If category doesn't exist, create it
        IF category_record IS NULL THEN
            INSERT INTO content_categories (name, course_id)
            VALUES (NEW.category::text, NEW.course_id)
            RETURNING id INTO category_record;
        END IF;
        
        -- Set the category_id
        NEW.category_id := category_record;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync podcast category
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'sync_podcast_category_trigger'
    ) THEN
        CREATE TRIGGER sync_podcast_category_trigger
            BEFORE INSERT OR UPDATE ON podcasts
            FOR EACH ROW
            EXECUTE FUNCTION sync_podcast_category();
    END IF;
END $$;

-- Ensure proper indexing for better performance
CREATE INDEX IF NOT EXISTS idx_podcasts_category_id ON podcasts(category_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_course_category ON podcasts(course_id, category);

-- Update existing podcasts to ensure category_id is set
DO $$
DECLARE
    r RECORD;
    category_record UUID;
BEGIN
    -- For each podcast with category but no category_id
    FOR r IN (
        SELECT id, course_id, category 
        FROM podcasts 
        WHERE category IS NOT NULL 
        AND category_id IS NULL
    ) LOOP
        -- Check if a category with this name exists for this course
        SELECT id INTO category_record
        FROM content_categories
        WHERE course_id = r.course_id
        AND name = r.category::text
        LIMIT 1;
        
        -- If category doesn't exist, create it
        IF category_record IS NULL THEN
            INSERT INTO content_categories (name, course_id)
            VALUES (r.category::text, r.course_id)
            RETURNING id INTO category_record;
        END IF;
        
        -- Update the podcast with the category_id
        UPDATE podcasts 
        SET category_id = category_record
        WHERE id = r.id;
        
        RAISE NOTICE 'Updated podcast % with category_id %', r.id, category_record;
    END LOOP;
END $$;

-- Update statistics
ANALYZE podcasts;
ANALYZE content_categories;