/*
# Update user_courses table

## New Columns
- assigned_by (uuid, foreign key to users table)
- due_date (timestamp with time zone)

## Constraints
- Foreign key constraint for assigned_by
- Index for better query performance

## Security
- Maintains existing RLS policies
*/

-- Add assigned_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_courses' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE user_courses ADD COLUMN assigned_by uuid;
  END IF;
END $$;

-- Add due_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_courses' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE user_courses ADD COLUMN due_date timestamptz;
  END IF;
END $$;

-- Add foreign key constraint for assigned_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_courses_assigned_by_fkey'
  ) THEN
    ALTER TABLE user_courses 
    ADD CONSTRAINT user_courses_assigned_by_fkey 
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for assigned_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_courses_assigned_by'
  ) THEN
    CREATE INDEX idx_user_courses_assigned_by ON user_courses(assigned_by);
  END IF;
END $$;