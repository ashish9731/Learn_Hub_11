/*
  # Implement Course Hierarchy Structure
  
  1. Database Changes
    - Add content_category table to organize content within courses
    - Update podcasts table to reference content categories
    - Add proper relationships between courses, categories, and content
    - Ensure proper indexing for performance
    
  2. Security
    - Enable RLS on new tables
    - Add appropriate policies for content categories
    - Maintain existing security model
*/

-- Create content_category table
CREATE TABLE IF NOT EXISTS content_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Enable RLS on content_categories
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

-- Add category_id to podcasts table
ALTER TABLE podcasts 
ADD COLUMN category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_categories_course_id ON content_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_created_at ON content_categories(created_at);
CREATE INDEX IF NOT EXISTS idx_content_categories_created_by ON content_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_podcasts_category_id ON podcasts(category_id);

-- Create RLS policies for content_categories
CREATE POLICY "content_categories_read_all" 
  ON content_categories 
  FOR SELECT 
  TO authenticated 
  USING (true);

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

-- Create trigger for activity logging
CREATE TRIGGER log_content_categories
    AFTER INSERT OR UPDATE OR DELETE ON content_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

-- Update statistics
ANALYZE content_categories;
ANALYZE podcasts;