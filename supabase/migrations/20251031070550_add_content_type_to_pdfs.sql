-- Add content_type column to pdfs table to differentiate between docs, images, and templates
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS content_type TEXT;

-- Add a check constraint to ensure content_type is one of the allowed values
ALTER TABLE pdfs ADD CONSTRAINT valid_content_type CHECK (content_type IN ('docs', 'images', 'templates'));

-- Update existing records based on file extension in title
UPDATE pdfs 
SET content_type = CASE 
    WHEN title ILIKE '%.jpg' OR title ILIKE '%.jpeg' OR title ILIKE '%.png' OR title ILIKE '%.gif' OR title ILIKE '%.svg' THEN 'images'
    WHEN title ILIKE '%.pdf' OR title ILIKE '%.docx' OR title ILIKE '%.pptx' OR title ILIKE '%.xlsx' OR title ILIKE '%.txt' THEN 'docs'
    ELSE 'templates'
END;

-- Set any remaining NULL values to 'docs' as a fallback
UPDATE pdfs SET content_type = 'docs' WHERE content_type IS NULL;

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN pdfs.content_type IS 'Content type classification: docs, images, or templates';