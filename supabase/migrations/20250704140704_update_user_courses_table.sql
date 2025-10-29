-- Add missing columns to user_courses table
ALTER TABLE user_courses 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;