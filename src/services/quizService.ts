import { supabase } from '../lib/supabase';

interface PodcastContent {
  id: string;
  title: string;
  mp3_url: string;
}

interface CategoryContent {
  id: string;
  name: string;
  podcasts: PodcastContent[];
}

interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice';
  difficulty: 'easy' | 'medium' | 'hard';
  answers: {
    answer_text: string;
    is_correct: boolean;
    explanation: string;
  }[];
}

/**
 * Parse quiz questions from uploaded document content
 * @param documentContent The content extracted from the uploaded quiz document
 * @returns Array of quiz questions parsed from the document
 */
function parseQuizFromDocument(documentContent: string): any[] {
  try {
    console.log('Parsing quiz from document content length:', documentContent.length);
    console.log('Document content preview:', documentContent.substring(0, 500) + '...');
    
    // Handle empty or whitespace-only content
    if (!documentContent || documentContent.trim().length === 0) {
      console.log('Document content is empty');
      return [];
    }
    
    // Try to parse as JSON first (if document contains pre-formatted JSON)
    try {
      const jsonData = JSON.parse(documentContent);
      if (Array.isArray(jsonData)) {
        // Validate that it's in the correct format
        const validQuestions = jsonData.filter(question => 
          question.question_text && 
          Array.isArray(question.answers) && 
          question.answers.length >= 2 && // At least 2 answers
          question.answers.some((a: any) => a.is_correct === true) // At least one correct answer
        );
        if (validQuestions.length > 0) {
          console.log('Parsed quiz from JSON format with', validQuestions.length, 'questions');
          return validQuestions;
        }
      }
    } catch (jsonError) {
      // Not JSON format, continue with text parsing
      console.log('Document is not in JSON format, parsing as text');
    }
    
    // Enhanced text parsing with better question/answer detection
    const questions: any[] = [];
    
    // Normalize line endings and split into lines
    const normalizedContent = documentContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Keep empty lines to preserve document structure
    const lines = normalizedContent.split('\n');
    
    console.log('Total lines to parse:', lines.length);
    
    // If we have very few lines, it's likely not a proper quiz document
    if (lines.length < 5) {
      console.log('Too few lines to parse as quiz document');
      return [];
    }
    
    // Parse using block-based approach
    let i = 0;
    let currentQuestion: string | null = null;
    let currentAnswers: Array<{answer_text: string, is_correct: boolean, explanation: string}> = [];
    let correctAnswerLetter = '';
    let collectingExplanation = false;
    let explanationBuffer = '';
    let inAnswerSection = false;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Look for question pattern (e.g., "1. What is the capital of France?")
      const questionMatch = trimmedLine.match(/^(\d+)[\.\-\)]\s*(.+)$/);
      if (questionMatch) {
        // Save previous question if exists
        if (currentQuestion && currentAnswers.length >= 2) {
          // Mark correct answer if we found the answer line
          if (correctAnswerLetter && correctAnswerLetter.length === 1) {
            const answerIndex = correctAnswerLetter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
            if (answerIndex >= 0 && answerIndex < currentAnswers.length) {
              currentAnswers[answerIndex].is_correct = true;
              // Add any collected explanation to the correct answer
              if (explanationBuffer) {
                currentAnswers[answerIndex].explanation = explanationBuffer.trim();
              }
            }
          } else if (currentAnswers.length > 0) {
            // If no correct answer was explicitly specified, don't default to first answer
            console.log('No correct answer specified in document for question:', currentQuestion);
            return [];
          }
          
          questions.push({
            question_text: currentQuestion,
            question_type: 'multiple_choice',
            difficulty: 'medium',
            answers: currentAnswers
          });
          console.log('Added question:', currentQuestion, 'with', currentAnswers.length, 'answers');
        }
        
        // Start new question
        const questionNumber = questionMatch[1];
        currentQuestion = questionMatch[2].trim();
        currentAnswers = [];
        correctAnswerLetter = '';
        collectingExplanation = false;
        explanationBuffer = '';
        inAnswerSection = false;
        console.log('Found question:', questionNumber, currentQuestion);
      } 
      // Look for answer options with various formats (e.g., "a) Paris", "(b) London", "c. Berlin")
      else if (currentQuestion && trimmedLine.match(/^[\(\[]?[a-dA-D][\.\)\]]?\s*(.+)$/)) {
        const answerMatch = trimmedLine.match(/^[\(\[]?([a-dA-D])[\.\)\]]?\s*(.+)$/);
        if (answerMatch) {
          const letter = answerMatch[1].toUpperCase();
          const answerText = answerMatch[2].trim();
          console.log('Found answer option:', letter, answerText);
          currentAnswers.push({
            answer_text: answerText,
            is_correct: false,
            explanation: ''
          });
          inAnswerSection = true;
        }
      }
      // Look for various answer line formats (e.g., "Answer: a", "Correct Answer: B")
      else if (currentQuestion && inAnswerSection && 
               (trimmedLine.toLowerCase().startsWith('answer:') || 
                trimmedLine.toLowerCase().startsWith('correct answer:') ||
                trimmedLine.toLowerCase().startsWith('solution:') ||
                trimmedLine.toLowerCase().match(/^answer\s*[a-d][\.\)]?/i) ||
                trimmedLine.toLowerCase().match(/^correct\s+answer\s*[a-d][\.\)]?/i))) {
        // Extract the answer value from different formats
        let answerValue = '';
        if (trimmedLine.toLowerCase().startsWith('answer:')) {
          answerValue = trimmedLine.substring(7).trim();
        } else if (trimmedLine.toLowerCase().startsWith('correct answer:')) {
          answerValue = trimmedLine.substring(15).trim();
        } else if (trimmedLine.toLowerCase().startsWith('solution:')) {
          answerValue = trimmedLine.substring(9).trim();
        } else if (trimmedLine.toLowerCase().match(/^answer\s*[a-d][\.\)]?/i)) {
          const match = trimmedLine.toLowerCase().match(/^answer\s*([a-d])[\.\)]?/i);
          if (match) {
            answerValue = match[1];
          }
        } else if (trimmedLine.toLowerCase().match(/^correct\s+answer\s*[a-d][\.\)]?/i)) {
          const match = trimmedLine.toLowerCase().match(/^correct\s+answer\s*([a-d])[\.\)]?/i);
          if (match) {
            answerValue = match[1];
          }
        }
        
        console.log('Found answer indicator:', answerValue);
        
        // Handle different answer formats
        if (answerValue.length === 1 && /^[A-Da-d]$/.test(answerValue)) {
          correctAnswerLetter = answerValue.toUpperCase();
          console.log('Set correct answer letter:', correctAnswerLetter);
        } else if (answerValue.match(/^([A-Da-d])[\.\)]/)) {
          const letterMatch = answerValue.match(/^([A-Da-d])[\.\)]/);
          if (letterMatch) {
            correctAnswerLetter = letterMatch[1].toUpperCase();
            console.log('Set correct answer letter from format:', correctAnswerLetter);
          }
        }
        inAnswerSection = false;
      }
      // Look for explanation (e.g., "Explanation: Paris is the capital of France.")
      else if (currentQuestion && trimmedLine.toLowerCase().startsWith('explanation:')) {
        collectingExplanation = true;
        const explanationText = trimmedLine.substring(12).trim();
        explanationBuffer = explanationText;
        console.log('Found explanation start:', explanationText);
        inAnswerSection = false;
      }
      // Continue explanation text
      else if (collectingExplanation && trimmedLine !== '' && 
               !trimmedLine.match(/^(\d+)[\.\-\)]\s*(.+)$/)) {
        // Append to the explanation buffer
        if (explanationBuffer) {
          explanationBuffer += ' ' + trimmedLine;
        } else {
          explanationBuffer = trimmedLine;
        }
        console.log('Continued explanation:', trimmedLine);
      }
      // Stop collecting explanation when we hit a new question or answer section
      else if (collectingExplanation && 
               (trimmedLine.match(/^(\d+)[\.\-\)]\s*(.+)$/) || 
                trimmedLine.toLowerCase().startsWith('answer:') ||
                trimmedLine.toLowerCase().startsWith('correct answer:') ||
                trimmedLine.toLowerCase().startsWith('solution:') ||
                trimmedLine.match(/^[\(\[]?[a-dA-D][\.\)\]]?\s*(.+)$/))) {
        collectingExplanation = false;
      }
      
      i++;
    }
    
    // Save the last question
    if (currentQuestion && currentAnswers.length >= 2) {
      // Mark correct answer if we found the answer line
      if (correctAnswerLetter && correctAnswerLetter.length === 1) {
        const answerIndex = correctAnswerLetter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
        if (answerIndex >= 0 && answerIndex < currentAnswers.length) {
          currentAnswers[answerIndex].is_correct = true;
          // Add any collected explanation to the correct answer
          if (explanationBuffer) {
            currentAnswers[answerIndex].explanation = explanationBuffer.trim();
          }
        }
      } else if (currentAnswers.length > 0) {
        // If no correct answer was explicitly specified, don't default to first answer
        console.log('No correct answer specified in document for question:', currentQuestion);
        return [];
      }
      
      questions.push({
        question_text: currentQuestion,
        question_type: 'multiple_choice',
        difficulty: 'medium',
        answers: currentAnswers
      });
      console.log('Added final question:', currentQuestion, 'with', currentAnswers.length, 'answers');
    }
    
    // If we still have no questions, return empty array rather than default questions
    if (questions.length === 0) {
      console.log('No questions parsed from document content');
      return [];
    }
    
    console.log('Parsed', questions.length, 'questions from document text');
    return questions;
  } catch (error) {
    console.error('Error parsing quiz from document:', error);
    return [];
  }
}

/**
 * Generate a quiz from uploaded quiz document content
 * @param courseId The course ID
 * @param courseTitle The course title
 * @param quizDocumentContent The content extracted from the uploaded quiz document
 * @returns Quiz ID if successful, null if failed
 */
export async function generateQuizFromDocument(
  courseId: string,
  courseTitle: string,
  quizDocumentContent: string
): Promise<string | null> {
  try {
    console.log('=== GENERATE QUIZ FROM DOCUMENT ===');
    console.log('Course ID:', courseId);
    console.log('Course Title:', courseTitle);
    console.log('Document content length:', quizDocumentContent.length);
    console.log('Document content preview:', quizDocumentContent.substring(0, 200) + '...');
    
    // Always regenerate the quiz from document content
    // First, check if a final quiz already exists for this course
    const { data: existingQuiz, error: existingQuizError } = await supabase
      .from('course_quizzes')
      .select('id')
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingQuizError) {
      console.error('Error checking existing document quiz:', existingQuizError);
      // Continue even if there's an error checking for existing quiz
    }

    // If quiz already exists, delete it first to ensure we regenerate from document
    if (existingQuiz) {
      console.log('Quiz already exists with ID:', existingQuiz.id, 'Deleting it to regenerate from document');
      
      // First get the question IDs
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('course_quiz_id', existingQuiz.id);
      
      if (questionsError) {
        console.error('Error fetching quiz questions:', questionsError);
      } else if (questions && questions.length > 0) {
        // Delete existing quiz answers
        const questionIds = questions.map(q => q.id);
        const { error: deleteAnswersError } = await supabase
          .from('quiz_answers')
          .delete()
          .in('question_id', questionIds);
        
        if (deleteAnswersError) {
          console.error('Error deleting quiz answers:', deleteAnswersError);
        }
      }
      
      // Delete existing quiz questions
      const { error: deleteQuestionsError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('course_quiz_id', existingQuiz.id);
      
      if (deleteQuestionsError) {
        console.error('Error deleting quiz questions:', deleteQuestionsError);
      }
      
      // Delete the quiz itself
      const { error: deleteQuizError } = await supabase
        .from('course_quizzes')
        .delete()
        .eq('id', existingQuiz.id);
      
      if (deleteQuizError) {
        console.error('Error deleting existing quiz:', deleteQuizError);
      }
      
      console.log('Deleted existing quiz, will regenerate from document content');
    }

    // Parse quiz questions directly from document content (no AI generation)
    console.log('Parsing quiz directly from document content');
    let quizData = parseQuizFromDocument(quizDocumentContent);
    
    console.log('Parsed quiz data:', JSON.stringify(quizData, null, 2));
    
    // If parsing failed, try with truncated content
    if (quizData.length === 0 && quizDocumentContent.length > 3000) {
      console.log('Parsing failed with full content, trying with truncated content');
      const truncatedContent = quizDocumentContent.substring(0, 3000) + '...';
      quizData = parseQuizFromDocument(truncatedContent);
    }
    
    // If still no questions parsed, return error
    if (quizData.length === 0) {
      console.error('Failed to parse any questions from document content');
      console.log('Document content that failed to parse:', quizDocumentContent.substring(0, 1000));
      return null;
    }
    
    console.log('Successfully parsed', quizData.length, 'questions from document');
    
    // Validate and filter the quiz data
    if (!Array.isArray(quizData)) {
      console.error('Invalid quiz data parsed from document:', quizData);
      return null;
    }
    
    // Filter out any invalid questions
    const validQuestions = quizData.filter(question => 
      question.question_text && 
      Array.isArray(question.answers) && 
      question.answers.length >= 2 && // At least 2 answers
      question.answers.some((a: any) => a.is_correct === true) // At least one correct answer
    );
    
    console.log('Valid questions after filtering:', validQuestions.length);
    
    // For document quizzes, we want at least 1 question
    if (validQuestions.length < 1) {
      console.warn(`Only ${validQuestions.length} valid questions found`);
      // If we have questions but none have correct answers marked, this is a parsing issue
      if (quizData.length > 0) {
        console.error('Questions found but none have correct answers marked. Check document format.');
        console.log('Sample question structure:', JSON.stringify(quizData[0], null, 2));
      }
      return null;
    }
    
    // Use the valid questions
    quizData = validQuestions;
    
    // Additional validation: Ensure each question has explanations or placeholder
    quizData = quizData.map(question => {
      // Ensure each answer has an explanation (even if empty)
      const answersWithExplanations = question.answers.map((answer: any) => ({
        ...answer,
        explanation: answer.explanation || ''
      }));
      
      return {
        ...question,
        answers: answersWithExplanations
      };
    });
    
    // Since we're having RLS issues with direct inserts, let's try a different approach
    // We'll use the admin client to create the quiz, which bypasses RLS
    // First get the admin client
    const { supabaseAdmin } = await import('../lib/supabase');
    
    if (!supabaseAdmin) {
      console.error('Admin client not available, falling back to regular client');
      // Try with regular client
      const { data: quiz, error: quizError } = await supabase
        .from('course_quizzes')
        .insert({
          course_id: courseId,
          title: `${courseTitle} Final Quiz`,
          description: `Final quiz generated from uploaded quiz document for ${courseTitle}`
        })
        .select()
        .single();
        
      if (quizError) {
        console.error('Error creating document quiz:', quizError);
        return null;
      }

      // Create questions and answers
      for (let index = 0; index < quizData.length; index++) {
        const questionData = quizData[index];
        // Create question
        const { data: question, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            course_quiz_id: quiz.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type || 'multiple_choice',
            difficulty: questionData.difficulty || 'medium'
            // Temporarily remove order_index to avoid database errors until migration is applied
          })
          .select()
          .single();

        if (questionError) {
          console.error('Error creating quiz question:', questionError);
          continue;
        }

        // Create answers
        for (const answerData of questionData.answers) {
          const { error: answerError } = await supabase
            .from('quiz_answers')
            .insert({
              question_id: question.id,
              answer_text: answerData.answer_text,
              is_correct: answerData.is_correct || false,
              explanation: answerData.explanation || 'No explanation provided for this answer.'
            });

          if (answerError) {
            console.error('Error creating quiz answer:', answerError);
          }
        }
      }

      console.log('Document quiz generated successfully:', quiz.id);
      return quiz.id;
    } else {
      // Use admin client which bypasses RLS
      const { data: quiz, error: quizError } = await supabaseAdmin
        .from('course_quizzes')
        .insert({
          course_id: courseId,
          title: `${courseTitle} Final Quiz`,
          description: `Final quiz generated from uploaded quiz document for ${courseTitle}`
        })
        .select()
        .single();
        
      if (quizError) {
        console.error('Error creating document quiz with admin client:', quizError);
        return null;
      }

      // Create questions and answers using admin client
      for (let index = 0; index < quizData.length; index++) {
        const questionData = quizData[index];
        // Create question
        const { data: question, error: questionError } = await supabaseAdmin
          .from('quiz_questions')
          .insert({
            course_quiz_id: quiz.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type || 'multiple_choice',
            difficulty: questionData.difficulty || 'medium'
            // Temporarily remove order_index to avoid database errors until migration is applied
          })
          .select()
          .single();

        if (questionError) {
          console.error('Error creating quiz question:', questionError);
          continue;
        }

        // Create answers
        for (const answerData of questionData.answers) {
          const { error: answerError } = await supabaseAdmin
            .from('quiz_answers')
            .insert({
              question_id: question.id,
              answer_text: answerData.answer_text,
              is_correct: answerData.is_correct || false,
              explanation: answerData.explanation || 'No explanation provided for this answer.'
            });

          if (answerError) {
            console.error('Error creating quiz answer:', answerError);
          }
        }
      }

      console.log('Document quiz generated successfully with admin client:', quiz.id);
      return quiz.id;
    }
  } catch (error) {
    console.error('Error generating document quiz:', error);
    return null;
  }
}

/**
 * Start a quiz attempt for a user
 * @param userId The user ID
 * @param quizId The quiz ID (either module or course quiz)
 * @param isModuleQuiz Whether this is a module quiz or course quiz
 * @returns Attempt ID if successful, null if failed
 */
export async function startQuizAttempt(
  userId: string,
  quizId: string,
  isModuleQuiz: boolean
): Promise<string | null> {
  try {
    const { data: attempt, error } = await supabase
      .from('user_quiz_attempts')
      .insert({
        user_id: userId,
        [isModuleQuiz ? 'module_quiz_id' : 'course_quiz_id']: quizId
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting quiz attempt:', error);
      return null;
    }

    return attempt.id;
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    return null;
  }
}

/**
 * Submit a quiz answer
 * @param attemptId The attempt ID
 * @param questionId The question ID
 * @param selectedAnswerId The selected answer ID
 * @returns True if successful, false if failed
 */
export async function submitQuizAnswer(
  attemptId: string,
  questionId: string,
  selectedAnswerId: string
): Promise<{ success: boolean; isCorrect: boolean; correctAnswerId: string | null; explanation: string | null }> {
  try {
    // Get the correct answer for this question
    const { data: correctAnswer, error: answerError } = await supabase
      .from('quiz_answers')
      .select('id, is_correct, explanation')
      .eq('question_id', questionId)
      .eq('is_correct', true)
      .maybeSingle();

    if (answerError) {
      console.error('Error fetching correct answer:', answerError);
      return { success: false, isCorrect: false, correctAnswerId: null, explanation: null };
    }

    const isCorrect = correctAnswer?.id === selectedAnswerId;

    // Save the user's answer
    const { error: submitError } = await supabase
      .from('user_quiz_answers')
      .insert({
        attempt_id: attemptId,
        question_id: questionId,
        selected_answer_id: selectedAnswerId,
        is_correct: isCorrect
      });

    if (submitError) {
      console.error('Error submitting quiz answer:', submitError);
      return { success: false, isCorrect: false, correctAnswerId: null, explanation: null };
    }

    return {
      success: true,
      isCorrect: isCorrect,
      correctAnswerId: correctAnswer?.id || null,
      explanation: correctAnswer?.explanation || null
    };
  } catch (error) {
    console.error('Error submitting quiz answer:', error);
    return { success: false, isCorrect: false, correctAnswerId: null, explanation: null };
  }
}

/**
 * Complete a quiz attempt and calculate score
 * @param attemptId The attempt ID
 * @returns True if successful, false if failed
 */
export async function completeQuizAttempt(attemptId: string): Promise<boolean> {
  try {
    // Get all answers for this attempt
    const { data: answers, error: answersError } = await supabase
      .from('user_quiz_answers')
      .select('is_correct')
      .eq('attempt_id', attemptId);

    if (answersError) {
      console.error('Error fetching quiz answers:', answersError);
      return false;
    }

    // Calculate score
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(answer => answer.is_correct).length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = correctAnswers >= 13; // 13 correct answers to pass (52% for 25 questions)

    // Update the attempt with completion data
    const { error: updateError } = await supabase
      .from('user_quiz_attempts')
      .update({
        completed_at: new Date().toISOString(),
        score: score,
        total_questions: totalQuestions,
        passed: passed
      })
      .eq('id', attemptId);

    if (updateError) {
      console.error('Error completing quiz attempt:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error completing quiz attempt:', error);
    return false;
  }
}

/**
 * Get user's quiz attempts for a course
 * @param userId The user ID
 * @param courseId The course ID
 * @returns Array of quiz attempts with details
 */
export async function getUserQuizAttempts(userId: string, courseId: string) {
  try {
    // Get module quiz attempts
    const { data: moduleAttempts, error: moduleError } = await supabase
      .from('user_quiz_attempts')
      .select(`
        id,
        started_at,
        completed_at,
        score,
        total_questions,
        passed,
        module_quizzes!inner (
          id,
          title,
          category_id,
          content_categories (name)
        )
      `)
      .eq('user_id', userId)
      .eq('module_quizzes.course_id', courseId);

    if (moduleError) {
      console.error('Error fetching module quiz attempts:', moduleError);
    }

    // Get course quiz attempts
    const { data: courseAttempts, error: courseError } = await supabase
      .from('user_quiz_attempts')
      .select(`
        id,
        started_at,
        completed_at,
        score,
        total_questions,
        passed,
        course_quizzes!inner (
          id,
          title
        )
      `)
      .eq('user_id', userId)
      .eq('course_quizzes.course_id', courseId);

    if (courseError) {
      console.error('Error fetching course quiz attempts:', courseError);
    }

    return {
      moduleAttempts: moduleAttempts || [],
      courseAttempts: courseAttempts || []
    };
  } catch (error) {
    console.error('Error fetching user quiz attempts:', error);
    return {
      moduleAttempts: [],
      courseAttempts: []
    };
  }
}

/**
 * Get detailed results for a quiz attempt
 * @param attemptId The attempt ID
 * @returns Detailed results including questions, answers, and explanations
 */
export async function getQuizAttemptDetails(attemptId: string) {
  try {
    // Get the attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('user_quiz_attempts')
      .select(`
        id,
        started_at,
        completed_at,
        score,
        total_questions,
        passed,
        module_quizzes (title, content_categories (name)),
        course_quizzes (title)
      `)
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptError) {
      console.error('Error fetching quiz attempt:', attemptError);
      return null;
    }

    // Get questions and user answers with proper joins
    const { data: questions, error: questionsError } = await supabase
      .from('user_quiz_answers')
      .select(`
        question_id,
        selected_answer_id,
        is_correct,
        quiz_questions (question_text, difficulty)
      `)
      .eq('attempt_id', attemptId);

    if (questionsError) {
      console.error('Error fetching quiz questions:', questionsError);
      return null;
    }

    // Get selected answers details
    const selectedAnswerIds = questions
      .map(q => q.selected_answer_id)
      .filter((id): id is string => id !== null);

    const { data: selectedAnswersData, error: selectedAnswersError } = selectedAnswerIds.length > 0
      ? await supabase
          .from('quiz_answers')
          .select('id, answer_text, is_correct, explanation')
          .in('id', selectedAnswerIds)
      : { data: [], error: null };

    if (selectedAnswersError) {
      console.error('Error fetching selected answers:', selectedAnswersError);
      return null;
    }

    // Get correct answers for each question
    const questionIds = questions.map(q => q.question_id);
    const { data: correctAnswersData, error: correctAnswersError } = questionIds.length > 0
      ? await supabase
          .from('quiz_answers')
          .select('id, question_id, answer_text, explanation')
          .in('question_id', questionIds)
          .eq('is_correct', true)
      : { data: [], error: null };

    if (correctAnswersError) {
      console.error('Error fetching correct answers:', correctAnswersError);
      return null;
    }

    // Format the data for display
    const formattedQuestions = questions.map(q => {
      const selectedAnswer = selectedAnswersData?.find(a => a.id === q.selected_answer_id) || null;
      const correctAnswer = correctAnswersData?.find(a => a.question_id === q.question_id) || null;
      
      // Access the first item in the quiz_questions array
      const quizQuestion = Array.isArray(q.quiz_questions) ? q.quiz_questions[0] : q.quiz_questions;
      
      return {
        question_text: quizQuestion?.question_text || '',
        difficulty: quizQuestion?.difficulty || 'medium',
        selected_answer: selectedAnswer?.answer_text || '',
        selected_is_correct: q.is_correct || false,
        correct_answer: correctAnswer?.answer_text || '',
        explanation: selectedAnswer?.explanation || '',
        correct_explanation: correctAnswer?.explanation || ''
      };
    });

    return {
      ...attempt,
      questions: formattedQuestions
    };
  } catch (error) {
    console.error('Error fetching quiz attempt details:', error);
    return null;
  }
}