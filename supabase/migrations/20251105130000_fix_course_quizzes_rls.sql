-- Fix RLS policies for course_quizzes table to allow authenticated users to insert quizzes
-- when they have access to the course

-- Drop existing user policy if it exists
DROP POLICY IF EXISTS user_course_quizzes ON course_quizzes;

-- Create new policy for SELECT (existing)
CREATE POLICY user_course_quizzes_select ON course_quizzes
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = course_quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Create new policy for INSERT (this was missing)
CREATE POLICY user_course_quizzes_insert ON course_quizzes
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = course_quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Create new policy for UPDATE (for updating existing quizzes if needed)
CREATE POLICY user_course_quizzes_update ON course_quizzes
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = course_quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = course_quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Create new policy for DELETE (for deleting quizzes if needed)
CREATE POLICY user_course_quizzes_delete ON course_quizzes
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = course_quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Also fix policies for quiz_questions and quiz_answers to allow inserts by users with course access
-- Drop existing user policies if they exist
DROP POLICY IF EXISTS user_quiz_questions ON quiz_questions;
DROP POLICY IF EXISTS user_quiz_answers ON quiz_answers;

-- Create new policies for quiz_questions
CREATE POLICY user_quiz_questions_select ON quiz_questions
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM course_quizzes 
        WHERE course_quizzes.id = quiz_questions.course_quiz_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = course_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ) OR EXISTS (
        SELECT 1 FROM module_quizzes 
        WHERE module_quizzes.id = quiz_questions.module_quiz_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = module_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ));

-- Create new policies for quiz_answers
CREATE POLICY user_quiz_answers_select ON quiz_answers
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quiz_questions 
        JOIN course_quizzes ON course_quizzes.id = quiz_questions.course_quiz_id
        WHERE quiz_questions.id = quiz_answers.question_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = course_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ) OR EXISTS (
        SELECT 1 FROM quiz_questions 
        JOIN module_quizzes ON module_quizzes.id = quiz_questions.module_quiz_id
        WHERE quiz_questions.id = quiz_answers.question_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = module_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ));

-- Also fix policies for user_quiz_attempts and user_quiz_answers
-- Drop existing user policies if they exist
DROP POLICY IF EXISTS user_user_quiz_attempts ON user_quiz_attempts;
DROP POLICY IF EXISTS user_user_quiz_answers ON user_quiz_answers;

-- Create new policies for user_quiz_attempts
CREATE POLICY user_user_quiz_attempts_all ON user_quiz_attempts
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create new policies for user_quiz_answers
CREATE POLICY user_user_quiz_answers_all ON user_quiz_answers
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_quiz_attempts 
        WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id 
        AND user_quiz_attempts.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_quiz_attempts 
        WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id 
        AND user_quiz_attempts.user_id = auth.uid()
    ));