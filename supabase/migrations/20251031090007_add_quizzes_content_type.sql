-- Add quizzes to the valid content_type values
ALTER TABLE pdfs DROP CONSTRAINT IF EXISTS valid_content_type;
ALTER TABLE pdfs ADD CONSTRAINT valid_content_type CHECK (content_type IN ('docs', 'images', 'templates', 'quizzes'));

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN pdfs.content_type IS 'Content type classification: docs, images, templates, or quizzes';