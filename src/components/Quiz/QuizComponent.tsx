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
  categoryId?: string; // For module quizzes
  categoryName?: string; // For module quizzes
  isFinalQuiz?: boolean; // For final course quizzes
  isDocumentQuiz?: boolean; // For document-based quizzes
  onComplete: (passed: boolean, score: number) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  courseId,
  categoryId,
  categoryName,
  isFinalQuiz = false,
  isDocumentQuiz = false,
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
        
        // Generate quiz if needed
        if (isDocumentQuiz && isFinalQuiz) {
          // For document-based final quiz, we need to get the quiz document content
          const { data: quizDocuments, error: documentsError } = await supabase
            .from('pdfs')
            .select('id, title, content_text')
            .eq('course_id', courseId)
            .eq('content_type', 'quizzes');
            
          if (documentsError) {
            setError('Error loading quiz document');
            setLoading(false);
            return;
          }
          
          if (!quizDocuments || quizDocuments.length === 0) {
            setError('No quiz document found for this course');
            setLoading(false);
            return;
          }
          
          // Use the first quiz document (assuming one per course)
          const quizDocument = quizDocuments[0];
          
          // Generate quiz from document content
          const quizId = await generateQuizFromDocument(
            courseId,
            'Final Quiz',
            quizDocument.content_text || ''
          );
          
          if (quizId) {
            setQuizId(quizId);
            setQuizGenerated(true);
          } else {
            setError('Failed to generate quiz from document');
            setLoading(false);
            return;
          }
        } else if (isFinalQuiz) {
          // For final quiz, we need to get all category content
          const { data: categories, error: categoriesError } = await supabase
            .from('content-categories')
            .select(`
              id,
              name,
              podcasts (id, title, mp3_url)
            `)
            .eq('course_id', courseId);
            
          if (categoriesError) {
            setError('Error loading course content');
            setLoading(false);
            return;
          }
          
          // Generate final quiz
          const quizId = await generateFinalQuiz(
            courseId,
            'Final Quiz', // This should be the actual course title
            categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              podcasts: cat.podcasts || []
            }))
          );
          
          if (quizId) {
            setQuizId(quizId);
            setQuizGenerated(true);
          } else {
            setError('Failed to generate final quiz');
            setLoading(false);
            return;
          }
        } else if (categoryId && categoryName) {
          // For module quiz, get podcast content for this category
          const { data: podcasts, error: podcastsError } = await supabase
            .from('podcasts')
            .select('id, title, mp3_url')
            .eq('category_id', categoryId);
            
          if (podcastsError) {
            setError('Error loading module content');
            setLoading(false);
            return;
          }
          
          // Generate module quiz
          const quizId = await generateModuleQuiz(
            courseId,
            categoryId,
            categoryName,
            podcasts
          );
          
          if (quizId) {
            setQuizId(quizId);
            setQuizGenerated(true);
          } else {
            setError('Failed to generate module quiz');
            setLoading(false);
            return;
          }
        } else {
          setError('Invalid quiz parameters');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error initializing quiz:', err);
        setError('Failed to initialize quiz: ' + (err as Error).message);
        setLoading(false);
      }
    };

    initializeQuiz();
  }, [courseId, categoryId, categoryName, isFinalQuiz, isDocumentQuiz]);

  useEffect(() => {
    const loadQuizQuestions = async () => {
      if (!quizId || !quizGenerated) return;
      
      try {
        // Load quiz questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select(`
            id,
            question_text,
            difficulty,
            quiz_answers (id, answer_text)
          `)
          .eq(isFinalQuiz ? 'course_quiz_id' : 'module_quiz_id', quizId)
          .order('id');

        if (questionsError) {
          setError('Error loading quiz questions');
          setLoading(false);
          return;
        }

        // Format questions data
        const formattedQuestions = questionsData?.map(question => ({
          id: question.id,
          question_text: question.question_text,
          difficulty: question.difficulty,
          answers: question.quiz_answers?.map(answer => ({
            id: answer.id,
            answer_text: answer.answer_text
          })) || []
        })) || [];

        setQuestions(formattedQuestions);
        
        // Start quiz attempt
        if (userId) {
          const attemptId = await startQuizAttempt(userId, quizId, !isFinalQuiz);
          if (attemptId) {
            setAttemptId(attemptId);
          } else {
            setError('Failed to start quiz attempt');
            setLoading(false);
            return;
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading quiz questions:', err);
        setError('Failed to load quiz questions');
        setLoading(false);
      }
    };

    loadQuizQuestions();
  }, [quizId, quizGenerated, userId, isFinalQuiz]);

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    // Prevent changing answer if it's already submitted
    if (submittedAnswers[questionId]) {
      return;
    }
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleSubmitAnswer = async () => {
    // Submit current answer if not already submitted
    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswerId = selectedAnswers[currentQuestion.id];
    
    if (selectedAnswerId && attemptId && !submittedAnswers[currentQuestion.id]) {
      const result = await submitQuizAnswer(attemptId, currentQuestion.id, selectedAnswerId);
      
      if (result.success) {
        // Mark this question as submitted and store feedback
        setSubmittedAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: true
        }));
        
        setAnswerFeedback(prev => ({
          ...prev,
          [currentQuestion.id]: {
            isCorrect: result.isCorrect,
            correctAnswerId: result.correctAnswerId || '',
            explanation: result.explanation || ''
          }
        }));
        
        // Show next button after submission
        setShowNextButton(true);
      }
    }
  };

  const handleNextQuestion = async () => {
    // Hide next button and reset for next question
    setShowNextButton(false);
    
    // Move to next question or complete quiz
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Complete quiz
      if (attemptId) {
        await completeQuizAttempt(attemptId);
        
        // Get final score
        const { data: attemptData, error: attemptError } = await supabase
          .from('user_quiz_attempts')
          .select('score, passed')
          .eq('id', attemptId)
          .maybeSingle();
          
        if (!attemptError && attemptData) {
          onComplete(attemptData.passed || false, attemptData.score || 0);
        } else {
          onComplete(false, 0);
        }
      } else {
        onComplete(false, 0);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Hide next button when going back
      setShowNextButton(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {quizGenerated ? 'Loading quiz questions...' : 'Generating quiz...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No questions available for this quiz.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = selectedAnswers[currentQuestion.id];
  const isSubmitted = submittedAnswers[currentQuestion.id];
  const feedback = answerFeedback[currentQuestion.id];

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Quiz Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isFinalQuiz ? 'Final Course Quiz' : `${categoryName} Quiz`}
        </h2>
        <div className="flex items-center mt-2">
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className="ml-4 flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {currentQuestion.question_text}
        </h3>
        
        {/* Difficulty Indicator */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            currentQuestion.difficulty === 'easy' 
              ? 'bg-green-100 text-green-800' 
              : currentQuestion.difficulty === 'medium' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
          }`}>
            {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
          </span>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.answers.map((answer) => {
            const isSelected = selectedAnswer === answer.id;
            const isCorrectAnswer = feedback?.correctAnswerId === answer.id;
            
            return (
              <div
                key={answer.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  isSubmitted
                    ? isSelected
                      ? feedback.isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : isCorrectAnswer
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`answer-${answer.id}`}
                    checked={isSelected}
                    onChange={() => !isSubmitted && handleAnswerSelect(currentQuestion.id, answer.id)}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={isSubmitted}
                  />
                  <label 
                    htmlFor={`answer-${answer.id}`} 
                    className="ml-3 text-gray-800 cursor-pointer"
                  >
                    {answer.answer_text}
                  </label>
                </div>
                {isSubmitted && isSelected && !feedback.isCorrect && (
                  <div className="mt-2 text-sm text-red-600">
                    Incorrect. {feedback.explanation}
                  </div>
                )}
                {isSubmitted && isCorrectAnswer && feedback.isCorrect && (
                  <div className="mt-2 text-sm text-green-600">
                    Correct! {feedback.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback and Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`px-4 py-2 rounded-md ${
            currentQuestionIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Previous
        </button>
        
        {!showNextButton ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || isSubmitted}
            className={`px-4 py-2 rounded-md ${
              !selectedAnswer || isSubmitted
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Submit
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizComponent;