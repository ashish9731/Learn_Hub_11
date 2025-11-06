/*
  # Add order_index column to quiz_questions table

  This migration adds an order_index column to the quiz_questions table to maintain
  the order of questions as they appear in the uploaded document.
*/

-- Add order_index column to quiz_questions table
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for better performance when ordering by order_index
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order_index 
ON quiz_questions (order_index);

-- Refresh statistics
ANALYZE quiz_questions;