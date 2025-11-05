-- Add content_text column to pdfs table for storing extracted text from documents
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS content_text TEXT;

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN pdfs.content_text IS 'Extracted text content from PDF or DOCX files for quiz generation';