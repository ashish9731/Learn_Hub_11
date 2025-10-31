-- Ensure content_type column is properly configured and working
-- This migration will verify and fix any issues with the content_type field

-- First, let's verify the column exists and has the correct constraints
DO $$
BEGIN
    -- Check if the content_type column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pdfs' 
        AND column_name = 'content_type'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE pdfs ADD COLUMN content_type TEXT;
    END IF;
    
    -- Check if the constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'pdfs' 
        AND constraint_name = 'valid_content_type'
    ) THEN
        -- Add the constraint if it doesn't exist
        ALTER TABLE pdfs ADD CONSTRAINT valid_content_type CHECK (content_type IN ('docs', 'images', 'templates'));
    END IF;
END $$;

-- Update any records that might have NULL content_type values
-- We'll set them to 'docs' as a safe default for existing records only if they match document extensions
UPDATE pdfs 
SET content_type = CASE 
    WHEN title ILIKE '%.pdf' OR title ILIKE '%.docx' OR title ILIKE '%.pptx' OR title ILIKE '%.xlsx' OR title ILIKE '%.txt' THEN 'docs'
    WHEN title ILIKE '%.jpg' OR title ILIKE '%.jpeg' OR title ILIKE '%.png' OR title ILIKE '%.gif' OR title ILIKE '%.svg' THEN 'images'
    ELSE 'templates'
END
WHERE content_type IS NULL;

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN pdfs.content_type IS 'Content type classification: docs, images, or templates. Must be explicitly set during upload.';