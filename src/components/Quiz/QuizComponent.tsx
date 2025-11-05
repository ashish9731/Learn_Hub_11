import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateModuleQuiz, generateFinalQuiz, generateQuizFromDocument, startQuizAttempt, submitQuizAnswer, completeQuizAttempt } from '../../services/quizService';

interface QuizQuestion {
  id: string;
  question_text: string;
  difficulty: string;
  answers: {
    id: string;
    answer_text: string;
  }[];
}

interface QuizComponentProps {
  courseId: string;
  categoryId?: string; // For module quizzes (deprecated)
  categoryName?: string; // For module quizzes (deprecated)
  isFinalQuiz?: boolean; // For final course quizzes (always true for document quizzes)
  isDocumentQuiz?: boolean; // For document-based quizzes (always true now)
  onComplete: (passed: boolean, score: number) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  courseId,
  categoryId,
  categoryName,
  isFinalQuiz = true, // Always true for document quizzes
  isDocumentQuiz = true, // Always true - only document quizzes supported
  onComplete
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({}); // Track submitted answers
  const [answerFeedback, setAnswerFeedback] = useState<Record<string, { isCorrect: boolean; correctAnswerId: string; explanation: string }>>({}); // Track answer feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false); // Show next button after submission
  const [quizCompleted, setQuizCompleted] = useState(false); // Track if quiz is completed

  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setError('You must be logged in to take this quiz');
          setLoading(false);
          return;
        }
        
        setUserId(session.user.id);
        
        // ONLY generate quiz from document for final quizzes
        if (isDocumentQuiz && isFinalQuiz) {
          // For document-based final quiz, we need to get the quiz document content
          let quizDocuments: any[] | null = null;
          let documentsError: any = null;
          
          try {
            // First try to get documents with content_text column
            const result = await supabase
              .from('pdfs')
              .select('id, title, content_text')
              .eq('course_id', courseId)
              .eq('content_type', 'quizzes');
              
            quizDocuments = result.data || null;
            documentsError = result.error;
            
            // If we get an error about content_text column not existing, try without it
            if (documentsError && documentsError.message && documentsError.message.includes('content_text')) {
              console.log('content_text column not found, trying without it');
              const fallbackResult = await supabase
                .from('pdfs')
                .select('id, title')
                .eq('course_id', courseId)
                .eq('content_type', 'quizzes');
                
              quizDocuments = fallbackResult.data || null;
              documentsError = fallbackResult.error;
              
              // Add placeholder content_text for each document
              if (quizDocuments) {
                quizDocuments = quizDocuments.map(doc => ({
                  ...doc,
                  content_text: 'Quiz content not available. Please contact administrator.'
                }));
              }
            }
          } catch (selectError) {
            console.error('Error selecting pdfs with content_text:', selectError);
            // Try without content_text column as fallback
            try {
              const result = await supabase
                .from('pdfs')
                .select('id, title')
                .eq('course_id', courseId)
                .eq('content_type', 'quizzes');
                
              quizDocuments = result.data || null;
              documentsError = result.error;
              
              // Add a placeholder content_text for each document
              if (quizDocuments) {
                quizDocuments = quizDocuments.map(doc => ({
                  ...doc,
                  content_text: 'Quiz content not available. Please contact administrator.'
                }));
              }
            } catch (fallbackError) {
              console.error('Fallback query also failed:', fallbackError);
              documentsError = fallbackError;
            }
          }
          
          // If we still have an error, show error message
          if (documentsError) {
            console.error('Error fetching quiz documents:', documentsError);
            throw new Error('Failed to fetch quiz documents. Please try again later.');
          }
          
          // If no quiz documents found, show message
          if (!quizDocuments || quizDocuments.length === 0) {
            throw new Error('No quiz documents found for this course. Please contact your administrator.');
          }
          
          // Use the first quiz document for now (in future we might support multiple)
          const quizDocument = quizDocuments[0];
          console.log('Using quiz document:', quizDocument);
          
          // Get course title
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single();
            
          if (courseError) {
            throw new Error('Failed to fetch course information');
          }
          
          // Check if user is enrolled in the course
          const { data: userCourseData, error: userCourseError } = await supabase
            .from('user_courses')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('course_id', courseId)
            .maybeSingle();
            
          if (userCourseError) {
            console.error('Error checking user course enrollment:', userCourseError);
            // Even if there's an error checking enrollment, we should still try to generate the quiz
            // as the admin has already assigned the course
            console.log('Proceeding with quiz generation despite enrollment check error');
          }
          
          // Generate quiz from document content regardless of enrollment status
          // since admin has already assigned the course to the user
          const generatedQuizId = await generateQuizFromDocument(
            courseId,
            courseData.title,
            quizDocument.content_text || 'No content available'
          );
          
          if (generatedQuizId) {
            setQuizId(generatedQuizId);
            setQuizGenerated(true);
          } else {
            setError('Failed to generate quiz from document');
            setLoading(false);
            return;
          }
        } 
        // Remove module quiz generation - only document quizzes are allowed
        else if (isFinalQuiz) {
          // This should never happen since we're only allowing document quizzes
          setError('Only document-based quizzes are supported');
          setLoading(false);
          return;
        } else if (categoryId && categoryName) {
          // This should never happen since we're only allowing document quizzes
          setError('Only document-based quizzes are supported');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error initializing quiz:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize quiz');
        setLoading(false);
      }
    };

    initializeQuiz();
  }, [courseId, categoryId, categoryName, isFinalQuiz, isDocumentQuiz]);

  // Start the quiz attempt
  const startQuizAttemptHandler = async () => {
    if (!quizId || !userId) return;
    
    try {
      const attemptId = await startQuizAttempt(userId, quizId, !isFinalQuiz);
      if (attemptId) {
        setAttemptId(attemptId);
        setLoading(false);
      } else {
        setError('Failed to start quiz attempt');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error starting quiz attempt:', err);
      setError('Failed to start quiz attempt');
      setLoading(false);
    }
  };

  // Load quiz questions
  const loadQuizQuestions = async () => {
    if (!quizId) return;
    
    try {
      setLoading(true);
      let questionsData: any[] = [];
      
      if (isFinalQuiz) {
        // Load course quiz questions
        const { data, error } = await supabase
          .from('quiz_questions')
          .select(`
            id,
            question_text,
            difficulty,
            quiz_answers (
              id,
              answer_text
            )
          `)
          .eq('course_quiz_id', quizId)
          .order('id');
          
        if (error) throw error;
        questionsData = data || [];
      } else {
        // Load module quiz questions
        const { data, error } = await supabase
          .from('quiz_questions')
          .select(`
            id,
            question_text,
            difficulty,
            quiz_answers (
              id,
              answer_text
            )
          `)
          .eq('module_quiz_id', quizId)
          .order('id');
          
        if (error) throw error;
        questionsData = data || [];
      }
      
      // Transform the data to match our interface
      const transformedQuestions = questionsData.map(question => ({
        id: question.id,
        question_text: question.question_text,
        difficulty: question.difficulty,
        answers: question.quiz_answers.map((answer: any) => ({
          id: answer.id,
          answer_text: answer.answer_text
        }))
      }));
      
      setQuestions(transformedQuestions);
      setLoading(false);
    } catch (err) {
      console.error('Error loading quiz questions:', err);
      setError('Failed to load quiz questions');
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  // Handle answer submission
  const handleSubmitAnswer = async (questionId: string) => {
    if (!attemptId || !selectedAnswers[questionId]) return;
    
    try {
      const result = await submitQuizAnswer(
        attemptId,
        questionId,
        selectedAnswers[questionId]
      );
      
      if (result.success) {
        // Mark this question as submitted
        setSubmittedAnswers(prev => ({
          ...prev,
          [questionId]: true
        }));
        
        // Store feedback
        setAnswerFeedback(prev => ({
          ...prev,
          [questionId]: {
            isCorrect: result.isCorrect,
            correctAnswerId: result.correctAnswerId || '',
            explanation: result.explanation || ''
          }
        }));
        
        // Show next button
        setShowNextButton(true);
      } else {
        setError('Failed to submit answer');
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer');
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowNextButton(false);
    } else {
      // Quiz completed
      handleQuizCompletion();
    }
  };

  // Handle quiz completion
  const handleQuizCompletion = async () => {
    if (!attemptId) return;
    
    try {
      const success = await completeQuizAttempt(attemptId);
      if (success) {
        setQuizCompleted(true);
        // Calculate final score (this would normally come from the completeQuizAttempt function)
        const correctCount = Object.values(answerFeedback).filter(feedback => feedback.isCorrect).length;
        const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
        const passed = score >= 60; // 60% passing mark
        onComplete(passed, score);
      } else {
        setError('Failed to complete quiz');
      }
    } catch (err) {
      console.error('Error completing quiz:', err);
      setError('Failed to complete quiz');
    }
  };

  // Render current question
  const renderCurrentQuestion = () => {
    const question = questions[currentQuestionIndex];
    const isSubmitted = submittedAnswers[question.id];
    const feedback = answerFeedback[question.id];
    
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Question {currentQuestionIndex + 1} of {questions.length}</h2>
            <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full capitalize">
              {question.difficulty}
            </span>
          </div>
          <p className="text-lg text-white mb-6">{question.question_text}</p>
        </div>
        
        <div className="space-y-3 mb-6">
          {question.answers.map((answer) => (
            <div 
              key={answer.id}
              className={`p-4 rounded-lg border transition-all ${
                isSubmitted 
                  ? feedback?.isCorrect && selectedAnswers[question.id] === answer.id
                    ? 'bg-green-500/20 border-green-500'
                    : !feedback?.isCorrect && selectedAnswers[question.id] === answer.id
                      ? 'bg-red-500/20 border-red-500'
                      : feedback?.isCorrect && feedback.correctAnswerId === answer.id
                        ? 'bg-green-500/20 border-green-500'
                        : 'bg-gray-800/50 border-gray-700'
                  : selectedAnswers[question.id] === answer.id
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50'
              }`}
            >
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={answer.id}
                  checked={selectedAnswers[question.id] === answer.id}
                  onChange={() => handleAnswerSelect(question.id, answer.id)}
                  disabled={isSubmitted}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-white">{answer.answer_text}</span>
              </label>
            </div>
          ))}
        </div>
        
        {isSubmitted && feedback && (
          <div className={`p-4 rounded-lg mb-6 ${
            feedback.isCorrect ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
          }`}>
            <p className="text-white font-medium mb-2">
              {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
            </p>
            <p className="text-gray-200">
              {feedback.explanation}
            </p>
          </div>
        )}
        
        <div className="flex justify-between">
          {!isSubmitted ? (
            <button
              onClick={() => handleSubmitAnswer(question.id)}
              disabled={!selectedAnswers[question.id]}
              className={`px-6 py-3 rounded-lg font-medium ${
                selectedAnswers[question.id]
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render quiz completion
  const renderQuizCompletion = () => {
    const correctCount = Object.values(answerFeedback).filter(feedback => feedback.isCorrect).length;
    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const passed = score >= 60;
    
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6 text-center">
        <div className="mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            passed ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {passed ? (
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {passed ? 'Quiz Completed Successfully!' : 'Quiz Not Passed'}
          </h2>
          <p className="text-gray-300 mb-4">
            You scored {score}% ({correctCount} out of {questions.length} questions correct)
          </p>
          <p className="text-gray-400">
            {passed 
              ? 'Congratulations! You have passed the quiz.' 
              : 'You need to score at least 60% to pass. Please try again.'}
          </p>
        </div>
        
        {!passed && (
          <button
            onClick={() => {
              // Reset quiz state to allow retake
              setCurrentQuestionIndex(0);
              setSelectedAnswers({});
              setSubmittedAnswers({});
              setAnswerFeedback({});
              setShowNextButton(false);
              setQuizCompleted(false);
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Retake Quiz
          </button>
        )}
      </div>
    );
  };

  // Effect to load questions when quiz is generated
  useEffect(() => {
    if (quizGenerated && quizId) {
      loadQuizQuestions();
    }
  }, [quizGenerated, quizId]);

  // Effect to start quiz attempt when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && !attemptId) {
      startQuizAttemptHandler();
    }
  }, [questions, attemptId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 backdrop-blur-lg rounded-2xl border border-red-500/30 shadow-xl p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-300">Error</h3>
            <div className="mt-2 text-sm text-red-200">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return renderQuizCompletion();
  }

  if (questions.length > 0) {
    return renderCurrentQuestion();
  }

  return (
    <div className="text-center py-12">
      <div className="text-gray-400">No questions available for this quiz.</div>
    </div>
  );
};

export default QuizComponent;