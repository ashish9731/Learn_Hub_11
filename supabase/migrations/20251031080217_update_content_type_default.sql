-- Update existing records to ensure all have a content_type value
UPDATE pdfs 
SET content_type = CASE 
    WHEN title ILIKE '%.jpg' OR title ILIKE '%.jpeg' OR title ILIKE '%.png' OR title ILIKE '%.gif' OR title ILIKE '%.svg' THEN 'images'
    WHEN title ILIKE '%.pdf' OR title ILIKE '%.docx' OR title ILIKE '%.pptx' OR title ILIKE '%.xlsx' OR title ILIKE '%.txt' THEN 'docs'
    ELSE 'templates'
END
WHERE content_type IS NULL;

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN pdfs.content_type IS 'Content type classification: docs, images, or templates';