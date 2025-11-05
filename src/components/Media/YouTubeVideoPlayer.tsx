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
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Record<string, boolean>>({});
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [completedVideos, setCompletedVideos] = useState<Record<string, boolean>>({}); // Track which videos are completed
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [lastValidTime, setLastValidTime] = useState<number>(0);
  const [maxAllowedTime, setMaxAllowedTime] = useState<number>(0);

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
      // Clean up player and interval
      if (playerRef.current) {
        clearProgressTracking(playerRef.current);
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
        clearProgressTracking(player);
        handleVideoEnd();
        break;
        
      case (window as any).YT.PlayerState.PLAYING:
        // Video started playing
        trackVideoProgress(player);
        break;
        
      case (window as any).YT.PlayerState.PAUSED:
        // Video paused - save current progress
        saveCurrentProgress(player);
        clearProgressTracking(player);
        break;
        
      case (window as any).YT.PlayerState.BUFFERING:
        // Video buffering - no action needed
        break;
        
      default:
        // Other states
        break;
    }
  };

  // Save current progress when video is paused
  const saveCurrentProgress = async (player: any) => {
    try {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      
      if (duration > 0) {
        const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));
        
        // Save progress to database
        await supabaseHelpers.savePodcastProgressWithRetry(
          userId,
          currentVideo.id,
          currentTime,
          duration,
          progressPercent
        );
        
        // Dispatch a custom event to trigger real-time updates
        const event = new CustomEvent('supabase-podcast-progress-changed', {
          detail: { userId, podcastId: currentVideo.id, progressPercent }
        });
        window.dispatchEvent(event);
        
        console.log(`Saved YouTube video progress on pause: ${progressPercent}%`);
      }
    } catch (error) {
      console.error('Error saving YouTube video progress:', error);
    }
  };

  // Track video progress while playing
  const trackVideoProgress = (player: any) => {
    // Clear any existing interval
    clearProgressTracking(player);
    
    const interval = setInterval(async () => {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        
        if (duration > 0) {
          const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));
          
          // Only save progress if it's meaningful (greater than 0% and less than 100%)
          // Or if it's exactly 100% (meaning the video has ended)
          if (progressPercent <= 0) return;
          
          // Save progress to database
          await supabaseHelpers.savePodcastProgressWithRetry(
            userId,
            currentVideo.id,
            currentTime,
            duration,
            progressPercent
          );
          
          // Dispatch a custom event to trigger real-time updates
          const event = new CustomEvent('supabase-podcast-progress-changed', {
            detail: { userId, podcastId: currentVideo.id, progressPercent }
          });
          window.dispatchEvent(event);
          
          console.log(`Saved YouTube video progress: ${progressPercent}%`);
        }
      } catch (error) {
        console.error('Error tracking YouTube video progress:', error);
      }
    }, 30000); // Save progress every 30 seconds
    
    // Store interval ID to clear later
    player.progressInterval = interval;
  };

  // Clear progress tracking interval
  const clearProgressTracking = (player: any) => {
    if (player.progressInterval) {
      clearInterval(player.progressInterval);
      player.progressInterval = null;
    }
  };

  // Load saved progress for all videos
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!userId) return;
      
      try {
        // Load which videos have been completed
        const completedVideoIds = videos.map(v => v.id);
        if (completedVideoIds.length === 0) return;
        
        // Initialize watched videos state
        setWatchedVideos(prev => {
          const newWatched = { ...prev };
          completedVideoIds.forEach(id => {
            newWatched[id] = newWatched[id] || false;
          });
          return newWatched;
        });
        
        // Load completion status from database
        const { data, error } = await supabase
          .from('podcast_progress')
          .select('*')
          .eq('user_id', userId)
          .in('podcast_id', completedVideoIds);
          
        if (!error && data) {
          const completedStatus: Record<string, boolean> = {};
          data.forEach(item => {
            if (item.progress_percent >= 100) {
              completedStatus[item.podcast_id] = true;
            }
          });
          setCompletedVideos(completedStatus);
        }
      } catch (error) {
        console.error('Error loading video progress:', error);
      }
    };
    
    loadSavedProgress();
  }, [userId, videos]);

  const handleVideoEnd = () => {
    // Mark current video as watched only when it actually ends
    markVideoAsWatched(currentVideo.id);
    
    // If this is the last video, show quiz
    if (currentVideoIndex === videos.length - 1) {
      generateQuiz();
    } else {
      // Automatically move to next video only if previous one is completed
      const nextVideo = videos[currentVideoIndex + 1];
      const previousVideoCompleted = currentVideoIndex === 0 || completedVideos[videos[currentVideoIndex].id];
      
      if (previousVideoCompleted) {
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else {
        // Show message that previous video must be completed first
        alert('You must complete the previous video before moving to the next one.');
      }
    }
  };

  const markVideoAsWatched = async (videoId: string) => {
    try {
      setWatchedVideos(prev => ({
        ...prev,
        [videoId]: true
      }));
      
      setCompletedVideos(prev => ({
        ...prev,
        [videoId]: true
      }));
      
      // Save completion status to database (using podcast_progress table for YouTube videos too)
      // Only mark as 100% when video actually ends
      await supabaseHelpers.savePodcastProgressWithRetry(
        userId,
        videoId,
        1800, // Default 30 minutes for YouTube videos
        1800, // Same duration
        100 // 100% completion
      );
      
      console.log(`Video ${videoId} marked as watched`);
    } catch (error) {
      console.error('Error marking video as watched:', error);
    }
  };

  const handleSkipBack = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      // Reset time tracking for new video
      setLastValidTime(0);
      setMaxAllowedTime(0);
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
                is_correct: true,
                explanation: 'This was the main takeaway.'
              },
              {
                id: 'a8',
                answer_text: 'Takeaway 2',
                is_correct: false,
                explanation: 'This was a secondary point.'
              },
              {
                id: 'a9',
                answer_text: 'Takeaway 3',
                is_correct: false,
                explanation: 'This was not covered.'
              }
            ]
          }
        ]
      };
      
      setCurrentQuiz(mockQuiz);
      setShowQuiz(true);
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Failed to generate quiz. Please try again.');
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
    
    // Grade the quiz
    currentQuiz.questions.forEach(question => {
      const userAnswerId = quizAnswers[question.id];
      if (userAnswerId) {
        const correctAnswer = question.answers.find(a => a.is_correct);
        if (correctAnswer && correctAnswer.id === userAnswerId) {
          correctAnswers++;
        }
      }
    });
    
    const score = Math.round((correctAnswers / currentQuiz.questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    
    // Consider quiz passed if score is 70% or higher
    const passed = score >= 70;
    setQuizPassed(passed);
    
    // If quiz is passed, mark the entire module as completed
    if (passed && onComplete) {
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

  const getVideoStatus = (videoId: string) => {
    if (completedVideos[videoId]) return 'completed';
    if (watchedVideos[videoId]) return 'in-progress';
    return 'not-started';
  };

  if (showQuiz && currentQuiz) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
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
                <div className="space-y-8">
                  {currentQuiz.questions.map((question, index) => (
                    <div key={question.id} className="border-b border-gray-200 pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {index + 1}. {question.question_text}
                      </h3>
                      
                      <div className="space-y-3">
                        {question.answers.map(answer => (
                          <div key={answer.id} className="flex items-start">
                            <input
                              type="radio"
                              id={`${question.id}-${answer.id}`}
                              name={question.id}
                              value={answer.id}
                              checked={quizAnswers[question.id] === answer.id}
                              onChange={() => handleQuizAnswer(question.id, answer.id)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <label 
                              htmlFor={`${question.id}-${answer.id}`} 
                              className="ml-3 text-gray-700"
                            >
                              {answer.answer_text}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(quizAnswers).length !== currentQuiz.questions.length}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Quiz
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  {quizPassed ? (
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-500" />
                  )}
                </div>
                
                <h3 className="text-2xl font-bold mb-2">
                  {quizPassed ? 'Quiz Passed!' : 'Quiz Failed'}
                </h3>
                
                <p className="text-lg mb-4">
                  Your score: <span className="font-bold">{quizScore}%</span>
                </p>
                
                {quizPassed ? (
                  <p className="text-green-600 mb-6">
                    Congratulations! You've successfully completed this module.
                  </p>
                ) : (
                  <p className="text-red-600 mb-6">
                    You need to score at least 70% to pass. Please review the content and try again.
                  </p>
                )}
                
                <div className="flex justify-center space-x-4">
                  {!quizPassed && (
                    <button
                      onClick={resetQuiz}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      resetQuiz();
                      if (quizPassed && onComplete) {
                        onComplete();
                      }
                    }}
                    className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    {quizPassed ? 'Continue' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <p className="text-gray-400">No videos available</p>
      </div>
    );
  }

  const videoId = getYouTubeVideoId(currentVideo.video_url);
  
  if (!videoId) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <p className="text-red-400">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl overflow-hidden">
      {/* Video Player - Modified to prevent seeking */}
      <div className="relative pb-[56.25%] h-0"> {/* 16:9 Aspect Ratio */}
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&controls=1&disablekb=0&fs=1&rel=0&modestbranding=1`}
          className="absolute top-0 left-0 w-full h-full rounded-t-2xl"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={true}
          title={currentVideo.title}
          // Add attributes to prevent download/context menu
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      
      {/* Custom Video Controls */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-white">{currentVideo.title}</h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSkipBack}
              disabled={currentVideoIndex === 0}
              className="p-2 rounded-full bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleSkipForward}
              disabled={currentVideoIndex === videos.length - 1 && !completedVideos[videos[currentVideoIndex].id]}
              className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              <Play className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Video Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Video {currentVideoIndex + 1} of {videos.length}</span>
            <span>
              {completedVideos[currentVideo.id] ? (
                <span className="text-green-400">Completed</span>
              ) : watchedVideos[currentVideo.id] ? (
                <span className="text-yellow-400">In Progress</span>
              ) : (
                <span className="text-gray-400">Not Started</span>
              )}
            </span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentVideoIndex + 1) / videos.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Video List */}
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Video Series</h4>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {videos.map((video, index) => {
              const status = getVideoStatus(video.id);
              const isCurrent = index === currentVideoIndex;
              
              return (
                <div 
                  key={video.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    isCurrent 
                      ? 'bg-blue-900/30 border border-blue-600' 
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                  } ${
                    status === 'completed' ? 'border-l-4 border-green-500' :
                    status === 'in-progress' ? 'border-l-4 border-yellow-500' :
                    'border-l-4 border-gray-600'
                  }`}
                  onClick={() => {
                    // Allow navigating to any video
                    setCurrentVideoIndex(index);
                  }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : status === 'in-progress' ? (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    ) : (
                      <span className="text-xs text-gray-400">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      isCurrent ? 'text-white font-medium' : 'text-gray-300'
                    }`}>
                      {video.title}
                    </p>
                  </div>
                  
                  {isCurrent && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}