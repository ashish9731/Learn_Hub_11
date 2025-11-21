import { supabase } from '../lib/supabase';

async function testDatabaseAccess() {
  console.log('Testing database access...');
  
  try {
    // Test if we can access the course_quizzes table
    console.log('Testing course_quizzes table access...');
    const { data: quizzes, error: quizzesError } = await supabase
      .from('course_quizzes')
      .select('id')
      .limit(1);
      
    if (quizzesError) {
      console.error('Error accessing course_quizzes:', quizzesError);
    } else {
      console.log('Successfully accessed course_quizzes, found:', quizzes?.length || 0, 'records');
    }
    
    // Test if we can access the quiz_questions table
    console.log('Testing quiz_questions table access...');
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id')
      .limit(1);
      
    if (questionsError) {
      console.error('Error accessing quiz_questions:', questionsError);
    } else {
      console.log('Successfully accessed quiz_questions, found:', questions?.length || 0, 'records');
    }
    
    // Test if we can access the quiz_answers table
    console.log('Testing quiz_answers table access...');
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('id')
      .limit(1);
      
    if (answersError) {
      console.error('Error accessing quiz_answers:', answersError);
    } else {
      console.log('Successfully accessed quiz_answers, found:', answers?.length || 0, 'records');
    }
    
    console.log('Database access test completed');
  } catch (error) {
    console.error('Error in database test:', error);
  }
}

testDatabaseAccess();