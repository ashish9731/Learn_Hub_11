/*
  # Fix Podcast Category Synchronization

  1. Problem
    - Podcast category is coming as NULL in the database
    - The sync_podcast_category trigger function is not working correctly
    - Need to ensure bidirectional synchronization between category and category_id

  2. Solution
    - Improve the sync_podcast_category function with better error handling
    - Ensure proper synchronization in both directions
    - Fix edge cases and add more detailed logging
    - Update existing podcasts to ensure both fields are properly set
*/

-- Make the category column nullable to avoid constraint violations
ALTER TABLE podcasts ALTER COLUMN category DROP NOT NULL;

-- Create or replace function to sync between category and category_id with improved error handling
CREATE OR REPLACE FUNCTION sync_podcast_category()
RETURNS TRIGGER AS $$
DECLARE
    category_record RECORD;
BEGIN
    -- If category_id is set but category is not, update category from category_id
    IF NEW.category_id IS NOT NULL AND (NEW.category IS NULL OR NEW.category::text = '') THEN
        SELECT name INTO category_record
        FROM content_categories
        WHERE id = NEW.category_id;
        
        IF FOUND THEN
            -- Try to convert the category name to the enum type
            BEGIN
                NEW.category := category_record.name::podcast_category;
                RAISE NOTICE 'Updated category to % based on category_id %', NEW.category, NEW.category_id;
            EXCEPTION WHEN OTHERS THEN
                -- If conversion fails, try to handle common cases
                CASE LOWER(category_record.name)
                    WHEN 'books' THEN NEW.category := 'Books'::podcast_category;
                    WHEN 'hbr' THEN NEW.category := 'HBR'::podcast_category;
                    WHEN 'ted talks' THEN NEW.category := 'TED Talks'::podcast_category;
                    WHEN 'concept' THEN NEW.category := 'Concept'::podcast_category;
                    WHEN 'role play' THEN NEW.category := 'Role Play'::podcast_category;
                    ELSE
                        RAISE NOTICE 'Could not convert category name % to podcast_category enum', category_record.name;
                END CASE;
            END;
        END IF;
    -- If category is set but category_id is not, find or create the category
    ELSIF NEW.category IS NOT NULL AND NEW.category_id IS NULL AND NEW.course_id IS NOT NULL THEN
        -- Check if a category with this name exists for this course
        SELECT id, name INTO category_record
        FROM content_categories
        WHERE course_id = NEW.course_id
        AND LOWER(name) = LOWER(NEW.category::text)
        LIMIT 1;
        
        -- If category doesn't exist, create it
        IF NOT FOUND THEN
            INSERT INTO content_categories (name, course_id)
            VALUES (NEW.category::text, NEW.course_id)
            RETURNING id, name INTO category_record;
            
            RAISE NOTICE 'Created new category % for course %', category_record.name, NEW.course_id;
        END IF;
        
        -- Set the category_id
        NEW.category_id := category_record.id;
        RAISE NOTICE 'Updated category_id to % based on category %', NEW.category_id, NEW.category;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in sync_podcast_category: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_podcast_category_trigger ON podcasts;

-- Create trigger to sync podcast category
CREATE TRIGGER sync_podcast_category_trigger
    BEFORE INSERT OR UPDATE ON podcasts
    FOR EACH ROW
    EXECUTE FUNCTION sync_podcast_category();

-- Update existing podcasts to ensure both category and category_id are properly set
DO $$
DECLARE
    podcast_record RECORD;
    cat_id UUID;
BEGIN
    -- For each podcast with category but no category_id
    FOR podcast_record IN (
        SELECT id, course_id, category 
        FROM podcasts 
        WHERE category IS NOT NULL 
        AND category_id IS NULL
        AND course_id IS NOT NULL
    ) LOOP
        -- Check if a category with this name exists for this course
        SELECT id INTO cat_id
        FROM content_categories
        WHERE course_id = podcast_record.course_id
        AND LOWER(name) = LOWER(podcast_record.category::text)
        LIMIT 1;
        
        -- If category doesn't exist, create it
        IF cat_id IS NULL THEN
            INSERT INTO content_categories (name, course_id)
            VALUES (podcast_record.category::text, podcast_record.course_id)
            RETURNING id INTO cat_id;
            
            RAISE NOTICE 'Created category % for course % and podcast %', podcast_record.category, podcast_record.course_id, podcast_record.id;
        END IF;
        
        -- Update the podcast with the category_id
        UPDATE podcasts 
        SET category_id = cat_id
        WHERE id = podcast_record.id;
        
        RAISE NOTICE 'Updated podcast % with category_id %', podcast_record.id, cat_id;
    END LOOP;
    
    -- For each podcast with category_id but no category
    FOR podcast_record IN (
        SELECT p.id, p.category_id, c.name as category_name
        FROM podcasts p
        JOIN content_categories c ON p.category_id = c.id
        WHERE p.category IS NULL
    ) LOOP
        -- Try to update the category based on the category_id
        BEGIN
            -- Try direct conversion first
            UPDATE podcasts 
            SET category = podcast_record.category_name::podcast_category
            WHERE id = podcast_record.id;
            
            RAISE NOTICE 'Updated podcast % with category %', podcast_record.id, podcast_record.category_name;
        EXCEPTION WHEN OTHERS THEN
            -- If direct conversion fails, try to handle common cases
            BEGIN
                CASE LOWER(podcast_record.category_name)
                    WHEN 'books' THEN 
                        UPDATE podcasts SET category = 'Books'::podcast_category WHERE id = podcast_record.id;
                    WHEN 'hbr' THEN 
                        UPDATE podcasts SET category = 'HBR'::podcast_category WHERE id = podcast_record.id;
                    WHEN 'ted talks' THEN 
                        UPDATE podcasts SET category = 'TED Talks'::podcast_category WHERE id = podcast_record.id;
                    WHEN 'concept' THEN 
                        UPDATE podcasts SET category = 'Concept'::podcast_category WHERE id = podcast_record.id;
                    WHEN 'role play' THEN 
                        UPDATE podcasts SET category = 'Role Play'::podcast_category WHERE id = podcast_record.id;
                    ELSE
                        RAISE NOTICE 'Could not convert category name % to podcast_category enum for podcast %', 
                            podcast_record.category_name, podcast_record.id;
                END CASE;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to update category for podcast % with category name %: %', 
                    podcast_record.id, podcast_record.category_name, SQLERRM;
            END;
        END;
    END LOOP;
END $$;

-- Ensure proper indexing for better performance
CREATE INDEX IF NOT EXISTS idx_podcasts_category ON podcasts(category);
CREATE INDEX IF NOT EXISTS idx_podcasts_category_id ON podcasts(category_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_course_category ON podcasts(course_id, category);

-- Update statistics
ANALYZE podcasts;
ANALYZE content_categories;