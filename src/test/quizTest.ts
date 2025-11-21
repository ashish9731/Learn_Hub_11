import { supabase } from '../lib/supabase';

// Test function to check if quiz tables exist and are accessible
async function testQuizTables() {
  console.log('Testing quiz table access...');
  
  try {
    // Test course_quizzes table
    const { data: quizzes, error: quizzesError } = await supabase
      .from('course_quizzes')
      .select('id')
      .limit(1);
      
    if (quizzesError) {
      console.error('Error accessing course_quizzes table:', quizzesError);
    } else {
      console.log('Successfully accessed course_quizzes table');
    }
    
    // Test quiz_questions table
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id')
      .limit(1);
      
    if (questionsError) {
      console.error('Error accessing quiz_questions table:', questionsError);
    } else {
      console.log('Successfully accessed quiz_questions table');
    }
    
    // Test quiz_answers table
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('id')
      .limit(1);
      
    if (answersError) {
      console.error('Error accessing quiz_answers table:', answersError);
    } else {
      console.log('Successfully accessed quiz_answers table');
    }
    
    console.log('Quiz table access test completed');
  } catch (error) {
    console.error('Error in quiz table test:', error);
  }
}

// Run the test
testQuizTables();