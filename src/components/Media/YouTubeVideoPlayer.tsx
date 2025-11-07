import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Video {
  id: string;
  title: string;
  video_url: string;
  course_id: string;
  category_id: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  answers: {
    id: string;
    answer_text: string;
    is_correct: boolean;
    explanation: string | null;
  }[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
}

interface YouTubeVideoPlayerProps {
  videos: Video[];
  userId: string;
  courseId: string;
  onComplete?: () => void;
}

export default function YouTubeVideoPlayer({ 
  videos, 
  userId,
  courseId,
  onComplete
}: YouTubeVideoPlayerProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [completedVideos, setCompletedVideos] = useState<Record<string, boolean>>({}); // Track which videos are completed
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const currentVideo = videos[currentVideoIndex];

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!(window as any).YT) {
      const scriptTag = document.createElement('script');
      scriptTag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(scriptTag);
      
      // Set up global callback for when API is ready
      (window as any).onYouTubeIframeAPIReady = () => {
        console.log('YouTube IFrame API loaded');
      };
    }
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    if (!(window as any).YT || playerRef.current) return;
    
    const videoId = getYouTubeVideoId(currentVideo.video_url);
    if (!videoId) return;
    
    // Wait a bit for the iframe to be ready
    const timer = setTimeout(() => {
      if (iframeRef.current) {
        try {
          playerRef.current = new (window as any).YT.Player(iframeRef.current, {
            events: {
              'onReady': (event: any) => {
                console.log('YouTube player ready');
                setPlayerReady(true);
                // Enable normal controls
                event.target.setPlaybackQuality('hd720');
              },
              'onStateChange': (event: any) => {
                handlePlayerStateChange(event);
              }
            }
          });
        } catch (error) {
          console.error('Error initializing YouTube player:', error);
        }
      }
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      // Clean up player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [currentVideoIndex, currentVideo.video_url]);

  // Handle player state changes
  const handlePlayerStateChange = (event: any) => {
    const player = event.target;
    
    // Handle different player states
    switch (event.data) {
      case (window as any).YT.PlayerState.ENDED:
        // Video ended
        handleVideoEnd();
        break;
        
      case (window as any).YT.PlayerState.PLAYING:
        // Video started playing
        break;
        
      case (window as any).YT.PlayerState.PAUSED:
        // Video paused
        break;
        
      case (window as any).YT.PlayerState.BUFFERING:
        // Video buffering
        break;
        
      default:
        // Other states
        break;
    }
  };

  const handleVideoEnd = () => {
    // If this is the last video, show quiz
    if (currentVideoIndex === videos.length - 1) {
      generateQuiz();
    } else {
      // Allow moving to next video without restrictions
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handleSkipBack = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleSkipForward = () => {
    // Allow skipping to any video without restrictions
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else {
      // Last video, show quiz
      generateQuiz();
    }
  };

  const generateQuiz = async () => {
    try {
      // For now, we'll create a mock quiz
      // In a real implementation, this would call an AI service to generate questions
      const mockQuiz: Quiz = {
        id: 'mock-quiz-' + Date.now(),
        title: `Quiz for ${currentVideo.title}`,
        description: 'Test your knowledge from this video module',
        questions: [
          {
            id: 'q1',
            question_text: 'What was the main topic discussed in this video?',
            question_type: 'multiple_choice',
            difficulty: 'easy',
            answers: [
              {
                id: 'a1',
                answer_text: 'Topic A',
                is_correct: true,
                explanation: 'This was indeed the main topic.'
              },
              {
                id: 'a2',
                answer_text: 'Topic B',
                is_correct: false,
                explanation: 'This was mentioned but not the main focus.'
              },
              {
                id: 'a3',
                answer_text: 'Topic C',
                is_correct: false,
                explanation: 'This was not discussed in this video.'
              }
            ]
          },
          {
            id: 'q2',
            question_text: 'Which concept was emphasized the most?',
            question_type: 'multiple_choice',
            difficulty: 'medium',
            answers: [
              {
                id: 'a4',
                answer_text: 'Concept X',
                is_correct: true,
                explanation: 'This concept was emphasized throughout the video.'
              },
              {
                id: 'a5',
                answer_text: 'Concept Y',
                is_correct: false,
                explanation: 'This was mentioned but not emphasized.'
              },
              {
                id: 'a6',
                answer_text: 'Concept Z',
                is_correct: false,
                explanation: 'This was barely mentioned.'
              }
            ]
          }
        ]
      };
      
      setCurrentQuiz(mockQuiz);
      setShowQuiz(true);
    } catch (error) {
      console.error('Error generating quiz:', error);
    }
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleSubmitQuiz = () => {
    if (!currentQuiz) return;
    
    // Calculate score
    let correctAnswers = 0;
    currentQuiz.questions.forEach(question => {
      const selectedAnswerId = quizAnswers[question.id];
      if (selectedAnswerId) {
        const selectedAnswer = question.answers.find(a => a.id === selectedAnswerId);
        if (selectedAnswer && selectedAnswer.is_correct) {
          correctAnswers++;
        }
      }
    });
    
    const score = Math.round((correctAnswers / currentQuiz.questions.length) * 100);
    const passed = score >= 70; // 70% to pass
    
    setQuizScore(score);
    setQuizPassed(passed);
    setQuizSubmitted(true);
    
    // Call onComplete callback if provided
    if (onComplete) {
      onComplete();
    }
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizPassed(null);
    setShowQuiz(false);
    setCurrentQuiz(null);
  };

  if (!playerReady && currentVideo) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading video player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="aspect-video">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${getYouTubeVideoId(currentVideo.video_url)}?enablejsapi=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>

      {/* Video Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleSkipBack}
          disabled={currentVideoIndex === 0}
          className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Previous
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-white">{currentVideo.title}</h3>
          <p className="text-sm text-gray-400">
            Video {currentVideoIndex + 1} of {videos.length}
          </p>
        </div>
        
        <button
          onClick={handleSkipForward}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Next
          <Play className="h-4 w-4 ml-2" />
        </button>
      </div>

      {/* Quiz Modal */}
      {showQuiz && currentQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{currentQuiz.title}</h2>
                <button
                  onClick={resetQuiz}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              {currentQuiz.description && (
                <p className="text-gray-600 mb-6">{currentQuiz.description}</p>
              )}
              
              {!quizSubmitted ? (
                <>
                  <div className="space-y-6">
                    {currentQuiz.questions.map((question, index) => (
                      <div key={question.id} className="border-b border-gray-200 pb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          {index + 1}. {question.question_text}
                        </h3>
                        <div className="space-y-2">
                          {question.answers.map((answer) => (
                            <label key={answer.id} className="flex items-start">
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={answer.id}
                                checked={quizAnswers[question.id] === answer.id}
                                onChange={() => handleAnswerSelect(question.id, answer.id)}
                                className="mt-1 mr-3"
                              />
                              <span className="text-gray-700">{answer.answer_text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(quizAnswers).length !== currentQuiz.questions.length}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Quiz
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className={`h-16 w-16 mx-auto mb-4 ${quizPassed ? 'text-green-500' : 'text-red-500'}`} />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {quizPassed ? 'Quiz Passed!' : 'Quiz Failed'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Your score: {quizScore}% ({Object.keys(quizAnswers).filter(key => quizAnswers[key]).length} out of {currentQuiz.questions.length} questions answered)
                  </p>
                  {quizPassed ? (
                    <p className="text-green-600 mb-6">Congratulations! You've passed the quiz.</p>
                  ) : (
                    <p className="text-red-600 mb-6">You need to score at least 70% to pass. Please try again.</p>
                  )}
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={resetQuiz}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Close
                    </button>
                    {!quizPassed && (
                      <button
                        onClick={() => {
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          setQuizScore(null);
                          setQuizPassed(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}