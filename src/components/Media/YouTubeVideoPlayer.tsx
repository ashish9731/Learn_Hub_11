import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';

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
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Record<string, boolean>>({});
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const currentVideo = videos[currentVideoIndex];

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Load saved progress for all videos
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!userId) return;
      
      try {
        // For YouTube videos, we'll track completion rather than detailed progress
        const watchedVideoIds = videos.map(v => v.id);
        if (watchedVideoIds.length === 0) return;
        
        // In a real implementation, you might track actual watch time
        // For now, we'll just mark videos as watched when they're completed
        setWatchedVideos(prev => {
          const newWatched = { ...prev };
          watchedVideoIds.forEach(id => {
            newWatched[id] = newWatched[id] || false;
          });
          return newWatched;
        });
      } catch (error) {
        console.error('Error loading video progress:', error);
      }
    };
    
    loadSavedProgress();
  }, [userId, videos]);

  const markVideoAsWatched = async (videoId: string) => {
    try {
      setWatchedVideos(prev => ({
        ...prev,
        [videoId]: true
      }));
      
      // Save completion status to database
      // In a real implementation, you might save more detailed progress
      console.log(`Video ${videoId} marked as watched`);
    } catch (error) {
      console.error('Error marking video as watched:', error);
    }
  };

  const handleVideoEnd = () => {
    // Mark current video as watched
    markVideoAsWatched(currentVideo.id);
    
    // If this is the last video, show quiz
    if (currentVideoIndex === videos.length - 1) {
      generateQuiz();
    } else {
      // Automatically move to next video
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handleSkipBack = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleSkipForward = () => {
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
                is_correct: false,
                explanation: 'This concept was mentioned but not emphasized.'
              },
              {
                id: 'a5',
                answer_text: 'Concept Y',
                is_correct: true,
                explanation: 'This was the key concept emphasized.'
              },
              {
                id: 'a6',
                answer_text: 'Concept Z',
                is_correct: false,
                explanation: 'This concept was not discussed.'
              }
            ]
          },
          {
            id: 'q3',
            question_text: 'What was the key takeaway from this module?',
            question_type: 'multiple_choice',
            difficulty: 'hard',
            answers: [
              {
                id: 'a7',
                answer_text: 'Takeaway 1',
                is_correct: false,
                explanation: 'This was a minor point.'
              },
              {
                id: 'a8',
                answer_text: 'Takeaway 2',
                is_correct: true,
                explanation: 'This was the main takeaway.'
              },
              {
                id: 'a9',
                answer_text: 'Takeaway 3',
                is_correct: false,
                explanation: 'This was not mentioned.'
              }
            ]
          },
          {
            id: 'q4',
            question_text: 'Which example was used to illustrate the main point?',
            question_type: 'multiple_choice',
            difficulty: 'medium',
            answers: [
              {
                id: 'a10',
                answer_text: 'Example A',
                is_correct: true,
                explanation: 'This example was used to illustrate the point.'
              },
              {
                id: 'a11',
                answer_text: 'Example B',
                is_correct: false,
                explanation: 'This example was not used.'
              },
              {
                id: 'a12',
                answer_text: 'Example C',
                is_correct: false,
                explanation: 'This example was not relevant.'
              }
            ]
          },
          {
            id: 'q5',
            question_text: 'What should you remember most from this module?',
            question_type: 'multiple_choice',
            difficulty: 'easy',
            answers: [
              {
                id: 'a13',
                answer_text: 'Remember this',
                is_correct: true,
                explanation: 'This is the key point to remember.'
              },
              {
                id: 'a14',
                answer_text: 'Remember that',
                is_correct: false,
                explanation: 'This is less important.'
              },
              {
                id: 'a15',
                answer_text: 'Remember other',
                is_correct: false,
                explanation: 'This was not emphasized.'
              }
            ]
          }
        ]
      };
      
      setCurrentQuiz(mockQuiz);
      setShowQuiz(true);
    } catch (error) {
      console.error('Error generating quiz:', error);
      // In case of error, just complete the module
      if (onComplete) onComplete();
    }
  };

  const handleQuizAnswer = (questionId: string, answerId: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const submitQuiz = () => {
    if (!currentQuiz) return;
    
    let correctAnswers = 0;
    
    currentQuiz.questions.forEach(question => {
      const selectedAnswerId = quizAnswers[question.id];
      if (selectedAnswerId) {
        const selectedAnswer = question.answers.find(a => a.id === selectedAnswerId);
        if (selectedAnswer?.is_correct) {
          correctAnswers++;
        }
      }
    });
    
    const score = Math.round((correctAnswers / currentQuiz.questions.length) * 100);
    const passed = score >= 70; // 70% to pass
    
    setQuizScore(score);
    setQuizPassed(passed);
    setQuizSubmitted(true);
    
    // Save quiz results
    saveQuizResults(score, passed);
  };

  const saveQuizResults = async (score: number, passed: boolean) => {
    if (!userId || !currentQuiz) return;
    
    try {
      // Create a module quiz record
      const { data: moduleQuizData, error: moduleQuizError } = await supabase
        .from('module_quizzes')
        .insert({
          course_id: courseId,
          category_id: currentVideo.category_id,
          title: currentQuiz.title,
          description: currentQuiz.description,
          created_by: userId
        })
        .select()
        .single();
      
      if (moduleQuizError) {
        console.error('Error creating module quiz:', moduleQuizError);
        return;
      }
      
      // Create quiz attempt record
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: userId,
          module_quiz_id: moduleQuizData.id,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          score: score,
          total_questions: currentQuiz.questions.length,
          passed: passed
        })
        .select()
        .single();
      
      if (attemptError) {
        console.error('Error creating quiz attempt:', attemptError);
        return;
      }
      
      // Save individual question answers
      for (const question of currentQuiz.questions) {
        const selectedAnswerId = quizAnswers[question.id];
        if (selectedAnswerId) {
          const selectedAnswer = question.answers.find(a => a.id === selectedAnswerId);
          
          await supabase
            .from('user_quiz_answers')
            .insert({
              attempt_id: attemptData.id,
              question_id: question.id,
              selected_answer_id: selectedAnswerId,
              is_correct: selectedAnswer?.is_correct || false
            });
        }
      }
      
      console.log('Quiz results saved successfully');
    } catch (error) {
      console.error('Error saving quiz results:', error);
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

  const completeModule = () => {
    resetQuiz();
    if (onComplete) onComplete();
  };

  if (showQuiz && currentQuiz) {
    return (
      <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6">
        <h2 className="text-xl font-bold text-white mb-4">{currentQuiz.title}</h2>
        {currentQuiz.description && (
          <p className="text-sm text-[#a0a0a0] mb-6">{currentQuiz.description}</p>
        )}
        
        {!quizSubmitted ? (
          <>
            <div className="space-y-6">
              {currentQuiz.questions.map((question, index) => (
                <div key={question.id} className="bg-[#252525] rounded-lg p-4">
                  <h3 className="font-medium text-white mb-3">
                    {index + 1}. {question.question_text}
                  </h3>
                  <div className="space-y-2">
                    {question.answers.map((answer) => (
                      <label 
                        key={answer.id} 
                        className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-[#333333]"
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={answer.id}
                          checked={quizAnswers[question.id] === answer.id}
                          onChange={() => handleQuizAnswer(question.id, answer.id)}
                          className="h-4 w-4 text-[#8b5cf6] focus:ring-[#8b5cf6]"
                        />
                        <span className="ml-3 text-sm text-white">{answer.answer_text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={submitQuiz}
                disabled={Object.keys(quizAnswers).length !== currentQuiz.questions.length}
                className="px-4 py-2 bg-[#8b5cf6] text-white rounded-md disabled:opacity-50"
              >
                Submit Quiz
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#252525]">
              {quizPassed ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <h3 className="mt-2 text-lg font-medium text-white">
              {quizPassed ? 'Quiz Passed!' : 'Quiz Failed'}
            </h3>
            <p className="mt-1 text-sm text-[#a0a0a0]">
              You scored {quizScore}% ({Object.keys(quizAnswers).filter(q => {
                const question = currentQuiz.questions.find(qs => qs.id === q);
                const selectedAnswer = question?.answers.find(a => a.id === quizAnswers[q]);
                return selectedAnswer?.is_correct;
              }).length}/{currentQuiz.questions.length} correct)
            </p>
            
            {quizPassed ? (
              <div className="mt-6">
                <p className="text-sm text-green-400">
                  Congratulations! You've successfully completed this module.
                </p>
                <button
                  onClick={completeModule}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Continue to Next Module
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-red-400">
                  You need to score at least 70% to pass. Please review the material and try again.
                </p>
                <div className="mt-4 flex justify-center space-x-3">
                  <button
                    onClick={resetQuiz}
                    className="px-4 py-2 bg-[#8b5cf6] text-white rounded-md hover:bg-[#7c3aed]"
                  >
                    Retry Quiz
                  </button>
                  <button
                    onClick={completeModule}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const videoId = getYouTubeVideoId(currentVideo.video_url);
  
  return (
    <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] overflow-hidden">
      {/* Video Info */}
      <div className="p-4 border-b border-[#333333]">
        <h2 className="text-lg font-medium text-white truncate">{currentVideo.title}</h2>
        <div className="mt-1 flex items-center text-sm text-[#a0a0a0]">
          <span>{currentVideoIndex + 1} of {videos.length}</span>
          <span className="mx-2">•</span>
          <span>
            {watchedVideos[currentVideo.id] ? 'Watched' : 'Not watched'}
          </span>
        </div>
      </div>
      
      {/* YouTube Video Player */}
      <div className="p-4">
        {videoId ? (
          <div className="relative pb-[56.25%] h-0"> {/* 16:9 Aspect Ratio */}
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentVideo.title}
            ></iframe>
          </div>
        ) : (
          <div className="bg-[#252525] rounded-lg p-8 text-center">
            <p className="text-[#a0a0a0]">Invalid YouTube URL</p>
          </div>
        )}
        
        {/* Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSkipBack}
              disabled={currentVideoIndex === 0}
              className="p-2 rounded-full text-[#a0a0a0] hover:text-white disabled:opacity-50"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleSkipForward}
              className="p-2 rounded-full text-[#a0a0a0] hover:text-white"
            >
              {currentVideoIndex === videos.length - 1 ? 'Complete Module' : 'Next Video'}
            </button>
          </div>
          
          <div className="flex items-center">
            {watchedVideos[currentVideo.id] && (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            )}
            <span className="text-sm text-[#a0a0a0]">
              {watchedVideos[currentVideo.id] ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Video List */}
      <div className="border-t border-[#333333] max-h-60 overflow-y-auto">
        {videos.map((video, index) => (
          <div 
            key={video.id}
            className={`flex items-center p-3 cursor-pointer ${
              index === currentVideoIndex 
                ? 'bg-[#252525]' 
                : 'hover:bg-[#252525]'
            }`}
            onClick={() => {
              if (index !== currentVideoIndex) {
                setCurrentVideoIndex(index);
              }
            }}
          >
            <div className="flex-shrink-0 w-8 text-center">
              {watchedVideos[video.id] ? (
                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
              ) : (
                <span className="text-xs text-[#a0a0a0]">{index + 1}</span>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className={`text-sm truncate ${
                index === currentVideoIndex ? 'text-white font-medium' : 'text-[#a0a0a0]'
              }`}>
                {video.title}
              </p>
            </div>
            <div className="flex-shrink-0">
              {watchedVideos[video.id] ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <span className="text-xs text-[#a0a0a0]">Pending</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}