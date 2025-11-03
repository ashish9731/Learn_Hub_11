/*
  # Verify Quizzes Functionality

  Ensure all necessary tables and relationships exist for quizzes to work properly
*/

-- Check if the pdfs table has the correct content_type values
SELECT DISTINCT content_type FROM pdfs;

-- Check if there are any quizzes in the pdfs table
SELECT COUNT(*) as quiz_count FROM pdfs WHERE content_type = 'quizzes';

-- Check if the necessary quiz tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'module_quizzes'
) as module_quizzes_exists;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'final_quizzes'
) as final_quizzes_exists;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'quiz_questions'
) as quiz_questions_exists;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'quiz_answers'
) as quiz_answers_exists;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'quiz_attempts'
) as quiz_attempts_exists;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'quiz_answers_selected'
) as quiz_answers_selected_exists;