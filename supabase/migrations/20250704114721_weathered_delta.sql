-- Create content_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Enable RLS on content_categories if not already enabled
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

-- Add category_id to podcasts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'podcasts' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE podcasts ADD COLUMN category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_categories_course_id ON content_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_created_at ON content_categories(created_at);
CREATE INDEX IF NOT EXISTS idx_content_categories_created_by ON content_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_podcasts_category_id ON podcasts(category_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_course_category ON podcasts(course_id, category_id);

-- Create RLS policies for content_categories
DROP POLICY IF EXISTS "content_categories_read_all" ON content_categories;
CREATE POLICY "content_categories_read_all" 
  ON content_categories 
  FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "content_categories_super_admin_access" ON content_categories;
CREATE POLICY "content_categories_super_admin_access" 
  ON content_categories 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Create trigger for activity logging if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'log_content_categories'
    ) THEN
        CREATE TRIGGER log_content_categories
            AFTER INSERT OR UPDATE OR DELETE ON content_categories
            FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();
    END IF;
END $$;

-- Migrate existing podcasts to use category_id
-- First, create default categories for each course based on existing podcast categories
DO $$
DECLARE
    r RECORD;
    new_category_id UUID;
    course_record RECORD;
BEGIN
    -- For each course
    FOR course_record IN (SELECT id FROM courses) LOOP
        -- For each distinct category used in podcasts for this course
        FOR r IN (
            SELECT DISTINCT category 
            FROM podcasts 
            WHERE course_id = course_record.id 
            AND category IS NOT NULL
        ) LOOP
            -- Create a category if it doesn't exist
            INSERT INTO content_categories (name, course_id)
            VALUES (r.category::text, course_record.id)
            RETURNING id INTO new_category_id;
            
            -- Update podcasts to use this category_id - FIXED: use the variable name to avoid ambiguity
            UPDATE podcasts 
            SET category_id = new_category_id
            WHERE course_id = course_record.id 
            AND category = r.category
            AND category_id IS NULL;
            
            RAISE NOTICE 'Created category % for course % and updated podcasts', r.category, course_record.id;
        END LOOP;
    END LOOP;
    
    -- Create an "Uncategorized" category for each course that has podcasts without a category
    FOR course_record IN (
        SELECT DISTINCT p.course_id 
        FROM podcasts p
        WHERE p.category IS NULL OR p.category_id IS NULL
    ) LOOP
        -- Create Uncategorized category
        INSERT INTO content_categories (name, course_id)
        VALUES ('Uncategorized', course_record.course_id)
        RETURNING id INTO new_category_id;
        
        -- Update podcasts to use this category_id - FIXED: use the variable name to avoid ambiguity
        UPDATE podcasts 
        SET category_id = new_category_id
        WHERE course_id = course_record.course_id 
        AND (category IS NULL OR category_id IS NULL);
        
        RAISE NOTICE 'Created Uncategorized category for course % and updated podcasts', course_record.course_id;
    END LOOP;
END $$;

-- Remove any dummy data
DELETE FROM podcasts WHERE title LIKE '%dummy%' OR title LIKE '%test%' OR title LIKE '%fake%';
DELETE FROM courses WHERE title LIKE '%dummy%' OR title LIKE '%test%' OR title LIKE '%fake%';
DELETE FROM user_courses WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%' OR email LIKE '%dummy%' OR email LIKE '%fake%');
DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%dummy%' OR email LIKE '%fake%';
DELETE FROM companies WHERE name LIKE '%test%' OR name LIKE '%dummy%' OR name LIKE '%fake%';

-- Update statistics
ANALYZE content_categories;
ANALYZE podcasts;