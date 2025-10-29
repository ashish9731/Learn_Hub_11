import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';

interface Podcast {
  id: string;
  title: string;
  mp3_url: string;
  course_id: string;
  category_id: string;
  is_youtube_video: boolean;
  video_url: string | null;
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

interface SequentialAudioPlayerProps {
  podcasts: Podcast[];
  userId: string;
  courseId: string;
  onComplete?: () => void;
}

export default function SequentialAudioPlayer({ 
  podcasts, 
  userId,
  courseId,
  onComplete
}: SequentialAudioPlayerProps) {
  const [currentPodcastIndex, setCurrentPodcastIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressSaveInterval = useRef<any>(null);
  const [progressSaved, setProgressSaved] = useState(false);
  const lastSaveTime = useRef<number>(0);

  const currentPodcast = podcasts[currentPodcastIndex];

  // Load saved progress for all podcasts
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('podcast_progress')
          .select('*')
          .eq('user_id', userId)
          .in('podcast_id', podcasts.map(p => p.id));
        
        if (error) {
          console.error('Error loading podcast progress:', error);
          return;
        }
        
        if (data) {
          const progressMap: Record<string, number> = {};
          const durationMap: Record<string, number> = {};
          
          data.forEach(item => {
            progressMap[item.podcast_id] = item.progress_percent || 0;
            durationMap[item.podcast_id] = typeof item.duration === 'string' ? 
              parseFloat(item.duration) : (item.duration || 0);
          });
          
          setProgress(progressMap);
          setDurations(durationMap);
        }
      } catch (error) {
        console.error('Error loading podcast progress:', error);
      }
    };
    
    loadSavedProgress();
  }, [userId, podcasts]);

  // Set up interval to save progress periodically
  useEffect(() => {
    if (userId && currentPodcast) {
      progressSaveInterval.current = setInterval(() => {
        if (audioRef.current && audioRef.current.currentTime > 0 && !progressSaved) {
          const currentTime = Date.now();
          if (currentTime - lastSaveTime.current > 40000 || 
              (audioRef.current && audioRef.current.currentTime > 1)) {
            saveProgress();
            lastSaveTime.current = currentTime;
          }
        }
      }, 5000);
    }
    
    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      
      // Save progress when component unmounts
      if (userId && audioRef.current && audioRef.current.currentTime > 0.5 && !progressSaved) {
        saveProgress();
      }
    };
  }, [userId, currentPodcast, progressSaved]);

  const saveProgress = async (): Promise<void> => {
    if (!userId || !currentPodcast || !audioRef.current) return;
    
    // Don't save if we haven't played enough (at least 1 second)
    if (audioRef.current.currentTime < 1) return;
    
    try {
      const playbackPosition = audioRef.current.currentTime || 0;
      const duration = audioRef.current.duration || 0;
      
      // Don't save if duration is invalid
      if (duration <= 0) return;
      
      const progressPercent = Math.min(100, Math.round((playbackPosition / duration) * 100));
      
      try {
        // Use the helper function with retry logic
        await supabaseHelpers.savePodcastProgressWithRetry(
          userId,
          currentPodcast.id,
          playbackPosition,
          duration,
          progressPercent
        );
        
        // Update local progress state
        setProgress(prev => ({
          ...prev,
          [currentPodcast.id]: progressPercent
        }));
        
        setDurations(prev => ({
          ...prev,
          [currentPodcast.id]: duration
        }));
      } catch (rpcError) {
        console.error('Exception in RPC call:', rpcError);
      }

      setProgressSaved(true);
    } catch (error) {
      console.error('Error saving podcast progress:', error);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(prev => ({
        ...prev,
        [currentPodcast.id]: 0
      }));
    }
  };

  const handleSkipBack = () => {
    if (currentPodcastIndex > 0) {
      saveProgress(); // Save progress before switching
      setCurrentPodcastIndex(currentPodcastIndex - 1);
      setIsPlaying(false);
      setProgressSaved(false);
    }
  };

  const handleSkipForward = () => {
    if (currentPodcastIndex < podcasts.length - 1) {
      saveProgress(); // Save progress before switching
      setCurrentPodcastIndex(currentPodcastIndex + 1);
      setIsPlaying(false);
      setProgressSaved(false);
    } else {
      // Last podcast completed, show quiz
      saveProgress();
      generateQuiz();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      // Reset progressSaved flag when time changes significantly
      setProgressSaved(false);
      
      const progressPercent = Math.round((audioRef.current.currentTime / audioRef.current.duration) * 100);
      setProgress(prev => ({
        ...prev,
        [currentPodcast.id]: progressPercent
      }));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      console.log('Audio loaded successfully:', currentPodcast.title);
      
      // Set initial progress if available
      const savedProgress = progress[currentPodcast.id] || 0;
      if (savedProgress > 0) {
        audioRef.current.currentTime = (savedProgress / 100) * audioRef.current.duration;
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    saveProgress();
    
    // If this is the last podcast, show quiz
    if (currentPodcastIndex === podcasts.length - 1) {
      generateQuiz();
    } else {
      // Automatically move to next podcast
      setCurrentPodcastIndex(currentPodcastIndex + 1);
    }
  };

  const generateQuiz = async () => {
    try {
      // For now, we'll create a mock quiz
      // In a real implementation, this would call an AI service to generate questions
      const mockQuiz: Quiz = {
        id: 'mock-quiz-' + Date.now(),
        title: `Quiz for ${currentPodcast.title}`,
        description: 'Test your knowledge from this audio module',
        questions: [
          {
            id: 'q1',
            question_text: 'What was the main topic discussed in this audio?',
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
                explanation: 'This was not discussed in this audio.'
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
          category_id: currentPodcast.category_id,
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

  return (
    <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] overflow-hidden">
      {/* Podcast Info */}
      <div className="p-4 border-b border-[#333333]">
        <h2 className="text-lg font-medium text-white truncate">{currentPodcast.title}</h2>
        <div className="mt-1 flex items-center text-sm text-[#a0a0a0]">
          <span>{currentPodcastIndex + 1} of {podcasts.length}</span>
          <span className="mx-2">•</span>
          <span>
            {Math.round((progress[currentPodcast.id] || 0))}% complete
          </span>
        </div>
      </div>
      
      {/* Audio Player */}
      <div className="p-4">
        <audio
          ref={audioRef}
          src={currentPodcast.mp3_url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={(e) => console.error('Audio error:', e)}
          className="hidden"
        />
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-[#333333] rounded-full h-2">
            <div 
              className="bg-[#8b5cf6] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress[currentPodcast.id] || 0}%` }}
            ></div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSkipBack}
              disabled={currentPodcastIndex === 0}
              className="p-2 rounded-full text-[#a0a0a0] hover:text-white disabled:opacity-50"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-3 rounded-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={handleReset}
              className="p-2 rounded-full text-[#a0a0a0] hover:text-white"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleSkipForward}
              disabled={currentPodcastIndex === podcasts.length - 1 && (progress[currentPodcast.id] || 0) < 100}
              className="p-2 rounded-full text-[#a0a0a0] hover:text-white disabled:opacity-50"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
          
          <div className="text-sm text-[#a0a0a0]">
            {durations[currentPodcast.id] ? (
              <>
                {Math.floor((durations[currentPodcast.id] * (progress[currentPodcast.id] || 0) / 100) / 60)}:
                {Math.floor((durations[currentPodcast.id] * (progress[currentPodcast.id] || 0) / 100) % 60).toString().padStart(2, '0')} / 
                {Math.floor(durations[currentPodcast.id] / 60)}:
                {Math.floor(durations[currentPodcast.id] % 60).toString().padStart(2, '0')}
              </>
            ) : (
              'Loading...'
            )}
          </div>
        </div>
      </div>
      
      {/* Podcast List */}
      <div className="border-t border-[#333333] max-h-60 overflow-y-auto">
        {podcasts.map((podcast, index) => (
          <div 
            key={podcast.id}
            className={`flex items-center p-3 cursor-pointer ${
              index === currentPodcastIndex 
                ? 'bg-[#252525]' 
                : 'hover:bg-[#252525]'
            }`}
            onClick={() => {
              if (index !== currentPodcastIndex) {
                saveProgress(); // Save progress before switching
                setCurrentPodcastIndex(index);
                setIsPlaying(false);
                setProgressSaved(false);
              }
            }}
          >
            <div className="flex-shrink-0 w-8 text-center">
              {index < currentPodcastIndex || (index === currentPodcastIndex && (progress[podcast.id] || 0) >= 100) ? (
                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
              ) : (
                <span className="text-xs text-[#a0a0a0]">{index + 1}</span>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className={`text-sm truncate ${
                index === currentPodcastIndex ? 'text-white font-medium' : 'text-[#a0a0a0]'
              }`}>
                {podcast.title}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-xs text-[#a0a0a0]">
                {Math.round(progress[podcast.id] || 0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}