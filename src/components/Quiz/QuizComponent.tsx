import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateQuizFromDocument } from '../../services/quizService';
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Play } from 'lucide-react';

interface Answer {
  id: string;
  answer_text: string;
  is_correct: boolean;
  explanation: string;
}

interface Question {
  id: string;
  question_text: string;
  difficulty: string;
  answers: Answer[];
}

interface QuizComponentProps {
  courseId: string;
  isFinalQuiz: boolean;
  isDocumentQuiz: boolean;
  onComplete: (passed: boolean, score: number, totalQuestions: number, correctAnswers: number) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  courseId,
  isFinalQuiz = true,
  isDocumentQuiz = true,
  onComplete
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false); // Changed to false by default
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswered, setIsAnswered] = useState<boolean[]>([]);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<Record<string, { isCorrect: boolean; correctAnswerId: string; explanation: string; selectedAnswerExplanation?: string }>>({});
  const [showStartButton, setShowStartButton] = useState(true); // New state for start button

  // Get user session
  useEffect(() => {
    const getUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('You must be logged in to take this quiz');
        return;
      }
      setUserId(session.user.id);
    };

    getUserSession();
  }, []);

  // Function to start the quiz
  const startQuiz = async () => {
    console.log('=== START QUIZ BUTTON CLICKED ===');
    setIsLoading(true);
    setShowStartButton(false);
    setError(null);
    
    try {
      // Check if this is a document-based quiz
      if (isDocumentQuiz) {
        console.log('Document-based quiz selected, fetching quiz documents...');
        
        // Get quiz documents for this course
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
          console.log('Quiz document content_text:', quizDocument.content_text ? quizDocument.content_text.substring(0, 200) + '...' : 'null/empty');
          
          // Check if content_text is available
          if (!quizDocument.content_text || quizDocument.content_text.trim() === '') {
            throw new Error('Quiz document content is not available or is empty. Please re-upload the quiz document or contact your administrator.');
          }
          
          // Check if content_text contains an error message
          if (quizDocument.content_text.startsWith('Error:')) {
            throw new Error(`Quiz document processing error: ${quizDocument.content_text}`);
          }

          // Get course title
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single();
            
          if (courseError) {
            throw new Error('Failed to fetch course information');
          }
          
          // Generate quiz from document content using our existing service
          // Trust that admin has already assigned the course to the user
          // No need to check enrollment as it's handled by the assignment system
          const generatedQuizId = await generateQuizFromDocument(
            courseId,
            courseData.title,
            quizDocument.content_text
          );
          
          if (generatedQuizId) {
            setQuizId(generatedQuizId);
            setQuizGenerated(true);
            
            // Load the generated quiz questions
            await loadQuizQuestions(generatedQuizId);
          } else {
            setError('Failed to generate quiz from document. Please check that your document contains properly formatted questions and answers.');
            setIsLoading(false);
            setShowStartButton(true); // Show start button again if failed
            return;
          }
        } else {
          setError('Only document-based quizzes are supported');
          setIsLoading(false);
          setShowStartButton(true); // Show start button again if failed
          return;
        }
      } catch (err) {
        console.error('Error initializing quiz:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize quiz');
        setIsLoading(false);
        setShowStartButton(true); // Show start button again if failed
      }
    };

  const loadQuizQuestions = async (generatedQuizId: string) => {
    try {
      // Load course quiz questions
      const { data, error } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          question_text,
          difficulty,
          quiz_answers (
            id,
            answer_text,
            is_correct,
            explanation
          )
        `)
        .eq('course_quiz_id', generatedQuizId)
        .order('id'); // Temporarily use id ordering until order_index column is added to database
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transform the data to match our interface
        const transformedQuestions: Question[] = data.map((question: any) => ({
          id: question.id,
          question_text: question.question_text,
          difficulty: question.difficulty,
          answers: question.quiz_answers ? question.quiz_answers.map((answer: any) => ({
            id: answer.id,
            answer_text: answer.answer_text,
            is_correct: answer.is_correct,
            explanation: answer.explanation
          })) : []
        }));
        
        setQuestions(transformedQuestions);
        setSelectedAnswers({});
        setIsAnswered(new Array(transformedQuestions.length).fill(false));
        setIsLoading(false);
      } else {
        throw new Error('No questions found for this quiz');
      }
    } catch (err) {
      console.error('Error loading quiz questions:', err);
      setError('Failed to load quiz questions');
      setIsLoading(false);
      setShowStartButton(true); // Show start button again if failed
    }
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    if (isAnswered[currentQuestion]) return; // Prevent changing after submission
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleSubmitAnswer = () => {
    const currentQ = questions[currentQuestion];
    const selectedAnswerId = selectedAnswers[currentQ.id];
    
    if (!selectedAnswerId) {
      alert("Please select an answer before submitting");
      return;
    }

    // Find the selected answer to get correctness and explanation
    const selectedAnswer = currentQ.answers.find((a: Answer) => a.id === selectedAnswerId);
    const correctAnswer = currentQ.answers.find((a: Answer) => a.is_correct);
    
    if (selectedAnswer && correctAnswer) {
      const isCorrect = selectedAnswer.is_correct;
      
      // Store feedback - use explanation from correct answer and selected answer
      setAnswerFeedback(prev => ({
        ...prev,
        [currentQ.id]: {
          isCorrect,
          correctAnswerId: correctAnswer.id,
          explanation: correctAnswer.explanation || '',
          selectedAnswerExplanation: selectedAnswer.explanation || ''
        }
      }));
      
      const newIsAnswered = [...isAnswered];
      newIsAnswered[currentQuestion] = true;
      setIsAnswered(newIsAnswered);
      setShowFeedback(true);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowFeedback(isAnswered[currentQuestion + 1]);
    } else {
      // Quiz completed - calculate score and navigate to results
      calculateAndSubmitResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowFeedback(isAnswered[currentQuestion - 1]);
    }
  };

  const calculateAndSubmitResults = async () => {
    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach((question) => {
        const selectedAnswerId = selectedAnswers[question.id];
        const selectedAnswer = question.answers.find((a: Answer) => a.id === selectedAnswerId);
        if (selectedAnswer && selectedAnswer.is_correct) {
          correctCount++;
        }
      });
      
      const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      const passed = score >= 50; // Changed to 50% passing rate
      
      // Submit results to the database
      if (userId && quizId) {
        // Create or update quiz attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from('user_quiz_attempts')
          .upsert({
            user_id: userId,
            course_quiz_id: quizId,
            score: score,
            total_questions: questions.length,
            passed: passed,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id, course_quiz_id'
          })
          .select()
          .single();
          
        if (attemptError) {
          console.error('Error saving quiz attempt:', attemptError);
        }
      }
      
      // Call onComplete callback with additional parameters
      onComplete(passed, score, questions.length, correctCount);
    } catch (err) {
      console.error('Error calculating results:', err);
      alert("Failed to calculate quiz results");
    }
  };

  // Show start button initially
  if (showStartButton) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white backdrop-blur-lg rounded-2xl border border-gray-200 shadow-xl p-8 text-center max-w-md dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">Quiz</h2>
          <p className="text-gray-700 mb-6 dark:text-gray-300">
            Click the button below to start the quiz.
          </p>
          <button 
            onClick={startQuiz}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-lg transform transition hover:scale-105 duration-300 flex items-center justify-center mx-auto dark:bg-purple-700 dark:hover:bg-purple-600"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white backdrop-blur-lg rounded-2xl border border-gray-200 shadow-xl p-8 text-center dark:bg-gray-800 dark:border-gray-700">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4 dark:text-purple-400" />
          <h2 className="text-2xl font-semibold mb-2 text-black dark:text-white">Generating Your Quiz</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Please wait while we generate your quiz...
          </p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white backdrop-blur-lg rounded-2xl border border-gray-200 shadow-xl p-8 text-center max-w-md dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">
            {error || "No questions generated"}
          </h2>
          <button 
            onClick={() => {
              setShowStartButton(true);
              setError(null);
              setQuestions([]);
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-lg transform transition hover:scale-105 duration-300 dark:bg-purple-700 dark:hover:bg-purple-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const currentQ = questions[currentQuestion];
  const feedback = answerFeedback[currentQ.id];

  return (
    <div className="bg-gradient-to-br from-white to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 dark:bg-purple-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white backdrop-blur-lg rounded-2xl border border-gray-200 shadow-xl p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-4">{currentQ.question_text}</h2>

          <div className="space-y-3">
            {currentQ.answers.map((answer) => (
              <div 
                key={answer.id}
                className={`p-4 rounded-lg border transition-all ${
                  showFeedback
                    ? feedback?.isCorrect && answer.id === selectedAnswers[currentQ.id]
                      ? 'bg-green-500/20 border-green-500'
                      : !feedback?.isCorrect && answer.id === selectedAnswers[currentQ.id]
                        ? 'bg-red-500/20 border-red-500'
                        : feedback?.isCorrect && answer.id === feedback.correctAnswerId
                          ? 'bg-green-500/20 border-green-500'
                          : 'bg-gray-800/50 border-gray-700'
                    : selectedAnswers[currentQ.id] === answer.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={answer.id}
                    checked={selectedAnswers[currentQ.id] === answer.id}
                    onChange={() => handleAnswerSelect(currentQ.id, answer.id)}
                    disabled={isAnswered[currentQuestion]}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-3 text-black dark:text-white">{answer.answer_text}</span>
                </label>
                
              </div>
            ))}
          </div>

          {/* Feedback Section */}
          {showFeedback && feedback && (
            <div className={`mt-6 p-4 rounded-lg ${
              feedback.isCorrect 
                ? 'bg-green-500/20 border border-green-500' 
                : 'bg-red-500/20 border border-red-500'
            }`}>
              <div className="flex items-center mb-2">
                {feedback.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mr-2" />
                )}
                <span className={`font-medium ${
                  feedback.isCorrect ? 'text-green-400' : 'text-red-400'
                }`}>
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              {!feedback.isCorrect && (
                <div className="mb-2">
                  <p className="text-black dark:text-white">
                    <span className="font-medium">Correct Answer:</span> {
                      // Find the correct answer text
                      currentQ.answers.find(a => a.id === feedback.correctAnswerId)?.answer_text || 'Unknown'
                    }
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {/* Show explanations only when they exist and are not the default placeholder */}
                {currentQ.answers
                  .filter(answer => answer.explanation && answer.explanation.trim() !== '' && answer.explanation !== 'No explanation provided for this answer.')
                  .map((answer) => (
                    <div key={answer.id} className="text-black dark:text-white ml-4">
                      {answer.explanation}
                    </div>
                  ))
                }
                
                {/* Show explanation for selected answer if it has one and wasn't already shown above */}
                {selectedAnswers[currentQ.id] && 
                 !currentQ.answers.some(a => a.id === selectedAnswers[currentQ.id] && a.explanation && a.explanation.trim() !== '' && a.explanation !== 'No explanation provided for this answer.') &&
                 currentQ.answers.find(a => a.id === selectedAnswers[currentQ.id])?.explanation && 
                 currentQ.answers.find(a => a.id === selectedAnswers[currentQ.id])?.explanation.trim() !== '' && 
                 currentQ.answers.find(a => a.id === selectedAnswers[currentQ.id])?.explanation !== 'No explanation provided for this answer.' && (
                  <div className="text-black dark:text-white ml-4">
                    <span className="font-medium">Explanation for your answer:</span> {currentQ.answers.find(a => a.id === selectedAnswers[currentQ.id])?.explanation}
                  </div>
                )}
                
                {/* Show explanation for correct answer if it has one and wasn't already shown above */}
                {!currentQ.answers.some(a => a.id === feedback.correctAnswerId && a.explanation && a.explanation.trim() !== '' && a.explanation !== 'No explanation provided for this answer.') &&
                 currentQ.answers.find(a => a.id === feedback.correctAnswerId)?.explanation && 
                 currentQ.answers.find(a => a.id === feedback.correctAnswerId)?.explanation.trim() !== '' && 
                 currentQ.answers.find(a => a.id === feedback.correctAnswerId)?.explanation !== 'No explanation provided for this answer.' && (
                  <div className="text-black dark:text-white ml-4">
                    <span className="font-medium">{feedback.isCorrect ? 'Explanation:' : 'Explanation for correct answer:'}</span> {currentQ.answers.find(a => a.id === feedback.correctAnswerId)?.explanation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`px-6 py-3 rounded-lg font-medium ${
              currentQuestion === 0
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-white hover:bg-gray-100 text-black dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4 inline mr-2" />
            Previous
          </button>
          
          {!showFeedback ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswers[currentQ.id] || isAnswered[currentQuestion]}
              className={`px-6 py-3 rounded-lg font-medium ${
                selectedAnswers[currentQ.id] && !isAnswered[currentQuestion]
                  ? 'bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              {currentQuestion < questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="w-4 h-4 inline ml-2" />
                </>
              ) : (
                'Finish Quiz'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizComponent;