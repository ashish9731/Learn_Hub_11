import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, BookOpen, User, ChevronLeft, Play, FileText, MessageSquare, Headphones, Download, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import DebugUserCourses from '../../components/Debug/DebugUserCourses';
import QuizComponent from '../../components/Quiz/QuizComponent';

interface Course {
  id: string;
  title: string;
  description: string;
  company_id: string | null;
  image_url: string | null;
  created_at: string;
  level?: string;
}

interface Category {
  id: string;
  name: string;
  course_id: string;
  created_at: string;
}

interface Podcast {
  id: string;
  title: string;
  course_id: string;
  category_id: string;
  mp3_url: string;
  video_url: string | null;
  is_youtube_video: boolean;
  created_by: string | null;
  created_at: string;
}

interface PodcastProgress {
  id: string;
  user_id: string;
  podcast_id: string;
  playback_position: number;
  duration: number;
  progress_percent: number;
  last_played_at: string;
}

interface CategoryWithProgress {
  id: string;
  name: string;
  course_id: string;
  created_at: string;
  podcasts: Podcast[];
  completedPodcasts: number;
  totalPodcasts: number;
  isCompleted: boolean;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('podcasts');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<any>(null);
  const [currentPdf, setCurrentPdf] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [podcastProgress, setPodcastProgress] = useState<Record<string, PodcastProgress>>({});
  const [isUserAssignedToCourse, setIsUserAssignedToCourse] = useState<boolean>(false);
  const [assignmentChecked, setAssignmentChecked] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [categoriesWithProgress, setCategoriesWithProgress] = useState<CategoryWithProgress[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCategoryId, setQuizCategoryId] = useState<string | null>(null);
  const [quizCategoryName, setQuizCategoryName] = useState<string | null>(null);
  const [showFinalQuiz, setShowFinalQuiz] = useState(false);
  const [allModulesCompleted, setAllModulesCompleted] = useState(false);

  useEffect(() => {
    const checkAuthAndUser = async () => {
      try {
        // First check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('Auth session missing or error:', sessionError);
          setError('Authentication failed. Please log in again.');
          setLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Also get user ID through getUser as fallback
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError('Authentication check failed. Please log in again.');
        setLoading(false);
      }
    };
    
    checkAuthAndUser();
  }, []);

  useEffect(() => {
    console.log('CourseId changed:', courseId);
    if (courseId && userId && isAuthenticated) {
      checkUserCourseAssignment();
    }
  }, [courseId, userId, isAuthenticated]);

  useEffect(() => {
    console.log('User assignment status changed or dependencies updated:', { 
      courseId, 
      userId, 
      isUserAssignedToCourse,
      assignmentChecked,
      isAuthenticated
    });
    // Only load course data after we've checked the assignment and user is authenticated
    if (courseId && userId && assignmentChecked && isAuthenticated) {
      loadCourseData();
    }
  }, [courseId, userId, isUserAssignedToCourse, assignmentChecked, isAuthenticated]);

  useEffect(() => {
    if (userId && isAuthenticated) {
      loadPodcastProgress();
    }
  }, [userId, isAuthenticated]);

  // Calculate category progress and completion status
  useEffect(() => {
    if (categories.length > 0 && podcasts.length > 0 && Object.keys(podcastProgress).length > 0) {
      const updatedCategories = categories.map(category => {
        const categoryPodcasts = podcasts.filter(p => p.category_id === category.id);
        const completedPodcasts = categoryPodcasts.filter(podcast => {
          const progress = podcastProgress[podcast.id];
          return progress && progress.progress_percent === 100;
        }).length;
        
        const isCompleted = categoryPodcasts.length > 0 && completedPodcasts === categoryPodcasts.length;
        
        return {
          ...category,
          podcasts: categoryPodcasts,
          completedPodcasts,
          totalPodcasts: categoryPodcasts.length,
          isCompleted
        };
      });
      
      setCategoriesWithProgress(updatedCategories);
      
      // Check if all modules are completed
      const allCompleted = updatedCategories.length > 0 && 
        updatedCategories.every(category => category.isCompleted);
      setAllModulesCompleted(allCompleted);
    }
  }, [categories, podcasts, podcastProgress]);

  const checkUserCourseAssignment = async () => {
    // Reset states
    setIsUserAssignedToCourse(false);
    setAssignmentChecked(false);
    
    if (!userId || !courseId) {
      console.log('Missing userId or courseId for assignment check');
      setAssignmentChecked(true);
      return;
    }
    
    try {
      console.log('Checking if user', userId, 'is assigned to course', courseId);
      
      // First, try to get all user courses to see what's available
      const { data: allUserCourses, error: allCoursesError } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', userId);
      
      if (allCoursesError) {
        console.error('Error fetching all user courses:', allCoursesError);
        // Check if it's an auth error
        if (allCoursesError.message && allCoursesError.message.includes('Auth')) {
          setError('Authentication failed. Please log in again.');
          setLoading(false);
          return;
        }
      } else {
        console.log('All user courses:', allUserCourses);
      }
      
      // Check if user is assigned to this specific course
      // Note: user_courses table doesn't have an 'id' column, only user_id and course_id
      const { data, error } = await supabase
        .from('user_courses')
        .select('user_id, course_id, assigned_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking course assignment:', error);
        // Check if it's an auth error
        if (error.message && error.message.includes('Auth')) {
          setError('Authentication failed. Please log in again.');
          setLoading(false);
          setAssignmentChecked(true);
          return;
        }
        console.log('Setting isUserAssignedToCourse to false due to error');
        setIsUserAssignedToCourse(false);
        setAssignmentChecked(true);
        return;
      }
      
      const isAssigned = !!data;
      console.log('User course assignment result:', isAssigned, 'Data:', data);
      setIsUserAssignedToCourse(isAssigned);
      setAssignmentChecked(true);
      
      // Additional debugging - check if course exists at all
      if (!isAssigned) {
        console.log('User is not assigned to course. Checking if course exists...');
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', courseId)
          .maybeSingle();
        
        if (courseError) {
          console.error('Error checking if course exists:', courseError);
        } else {
          console.log('Course exists:', courseData);
        }
      }
    } catch (err) {
      console.error('Error checking course assignment:', err);
      console.log('Setting isUserAssignedToCourse to false due to exception');
      setIsUserAssignedToCourse(false);
      setAssignmentChecked(true);
    }
  };

  const loadPodcastProgress = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error loading podcast progress:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Create a map of podcast_id to progress
        const progressMap: Record<string, PodcastProgress> = {};
        
        data.forEach(item => {
          progressMap[item.podcast_id] = item;
        });
        
        setPodcastProgress(progressMap);
        console.log('Loaded podcast progress:', progressMap);
      }
    } catch (error) {
      console.error('Error loading podcast progress:', error);
    }
  };

  const loadCourseData = async () => {
    try {
      console.log('Loading course data for courseId:', courseId);
      console.log('User ID:', userId);
      console.log('Is user assigned to course:', isUserAssignedToCourse);
      setLoading(true);
      setError(null);

      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('Timeout reached, setting loading to false');
        setLoading(false);
        setError('Timeout loading course data. Please try again.');
      }, 10000); // 10 second timeout

      // Check if user is assigned to this course
      if (!isUserAssignedToCourse) {
        clearTimeout(timeoutId);
        console.log('User is not assigned to this course, showing error');
        setError('You are not assigned to this course. Please contact your administrator.');
        setLoading(false);
        return;
      }

      console.log('User is assigned, proceeding to load course data...');
      // Get course details and related data including documents
      console.log('Fetching course data...');
      const [courseData, categoriesData, podcastsData, pdfsData] = await Promise.all([
        supabase
        .from('courses')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq('id', courseId)
        .single()
        .then(res => {
          console.log('Course data result:', res);
          if (res.error) throw res.error;
          return res.data;
        }),
        supabase
        .from('content_categories')
        .select('*')
        .eq('course_id', courseId)
        .order('name')
        .then(res => {
          console.log('Categories data result:', res);
          return res.data || [];
        }),
        supabase
        .from('podcasts')
        .select('*')
        .eq('course_id', courseId)
        .then(res => {
          console.log('Podcasts data result:', res);
          return res.data || [];
        }),
        supabase
        .from('pdfs')
        .select('*')
        .eq('course_id', courseId)
        .then(res => {
          console.log('PDFs data result:', res);
          return res.data || [];
        })
      ]);
      
      // Clear the timeout since we've successfully loaded
      clearTimeout(timeoutId);
      
      console.log('All data loaded successfully');
      setCourse(courseData);
      setCategories(categoriesData);
      setPodcasts(podcastsData);
      setPdfs(pdfsData);

      // Set first category as active if categories exist
      if (categoriesData && categoriesData.length > 0) {
        setActiveCategory(categoriesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load course data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPodcast = (podcast: any) => {
    console.log("Playing podcast:", podcast);
    setCurrentPodcast(podcast);
  };

  // Extract YouTube video ID from URL
  const extractYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Render media player based on content type
  const renderMediaPlayer = () => {
    if (!currentPodcast) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Headphones className="h-12 w-12 mb-4" />
          <p>Select a podcast to start listening</p>
          <p className="text-sm mt-2">Note: Modules must be completed in sequence</p>
        </div>
      );
    }

    if (currentPodcast.is_youtube_video && currentPodcast.video_url) {
      const videoId = extractYouTubeVideoId(currentPodcast.video_url);
      if (videoId) {
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{currentPodcast.title}</h2>
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={currentPodcast.title}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Note: You must watch this video completely before accessing the next module.</p>
            </div>
          </div>
        );
      } else {
        return (
          <div className="text-red-500">
            Invalid YouTube URL. Please contact administrator.
          </div>
        );
      }
    } else {
      return (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{currentPodcast.title}</h2>
          <audio
            src={currentPodcast.mp3_url}
            controls
            controlsList="nodownload noplaybackrate"
            className="w-full"
            onTimeUpdate={async (e) => {
              const audio = e.currentTarget;
              const progress = Math.round((audio.currentTime / audio.duration) * 100);
              
              // Prevent skipping by checking if user is trying to skip ahead
              const podcastId = currentPodcast.id;
              const existingProgress = podcastProgress[podcastId];
              const allowedPosition = existingProgress ? 
                Math.min(audio.duration, existingProgress.playback_position + 30) : // Allow 30s forward jump
                30; // Allow initial 30s jump
                
              if (audio.currentTime > allowedPosition) {
                audio.currentTime = allowedPosition;
                return;
              }
              
              setPodcastProgress(prev => ({
                ...prev,
                [podcastId]: {
                  ...prev[podcastId],
                  playback_position: audio.currentTime,
                  duration: audio.duration,
                  progress_percent: progress
                }
              }));
              
              // Save progress to Supabase
              if (userId && progress > 0) {
                try {
                  await supabase
                    .from('podcast_progress')
                    .upsert({
                      user_id: userId,
                      podcast_id: podcastId,
                      playback_position: audio.currentTime,
                      duration: audio.duration,
                      progress_percent: progress,
                      last_played_at: new Date().toISOString()
                    }, {
                      onConflict: 'user_id,podcast_id'
                    });
                  console.log('Progress saved');
                } catch (error) {
                  console.error('Error saving progress:', error);
                }
              }
            }}
            onSeeking={(e) => {
              // Prevent seeking by resetting to current position
              const audio = e.currentTarget;
              const podcastId = currentPodcast.id;
              const existingProgress = podcastProgress[podcastId];
              if (existingProgress) {
                audio.currentTime = Math.min(audio.currentTime, existingProgress.playback_position + 30);
              }
            }}
          />
          <div className="mt-4 text-sm text-gray-600">
            <p>Note: You must listen to this podcast completely before accessing the next module.</p>
          </div>
        </div>
      );
    }
  };

  const getCourseImage = (courseTitle: string) => {
    const title = courseTitle?.toLowerCase() || '';
    
    if (title.includes('communication')) {
      return 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('listen')) {
      return 'https://images.pexels.com/photos/7176319/pexels-photo-7176319.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('time') || title.includes('management')) {
      return 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('leadership')) {
      return 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('question')) {
      return 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else {
      return 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
  };

  const getFilteredPodcasts = () => {
    if (!activeCategory) return podcasts;
    return podcasts.filter(podcast => podcast.category_id === activeCategory);
  };

  // Check if a podcast is unlocked (previous podcasts in the same category must be completed)
  const isPodcastUnlocked = (podcast: Podcast, categoryPodcasts: Podcast[]) => {
    // Find the index of this podcast in the category
    const podcastIndex = categoryPodcasts.findIndex(p => p.id === podcast.id);
    
    // First podcast is always unlocked
    if (podcastIndex === 0) return true;
    
    // Check if all previous podcasts are completed (100%)
    for (let i = 0; i < podcastIndex; i++) {
      const previousPodcast = categoryPodcasts[i];
      const progress = podcastProgress[previousPodcast.id];
      if (!progress || progress.progress_percent < 100) {
        return false;
      }
    }
    
    return true;
  };

  // Get the completion percentage for a podcast
  const getPodcastCompletion = (podcastId: string) => {
    const progress = podcastProgress[podcastId];
    return progress ? progress.progress_percent : 0;
  };

  // Start module quiz
  const startModuleQuiz = (categoryId: string, categoryName: string) => {
    setQuizCategoryId(categoryId);
    setQuizCategoryName(categoryName);
    setShowQuiz(true);
    setActiveTab('quiz');
  };

  // Start final quiz
  const startFinalQuiz = () => {
    setShowFinalQuiz(true);
    setActiveTab('quiz');
  };

  // Handle quiz completion
  const handleQuizComplete = (passed: boolean, score: number) => {
    setShowQuiz(false);
    setShowFinalQuiz(false);
    setActiveTab('podcasts');
    
    // Reload data to reflect quiz completion
    if (userId) {
      loadPodcastProgress();
    }
  };

  if (loading) {
    console.log('CourseDetail: Showing loading spinner');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    console.log('CourseDetail: Showing error message:', error);
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600">Error loading course: {error}</div>
          <button
            onClick={() => navigate('/user/courses')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Courses
          </button>
          {error.includes('Authentication') && (
            <button
              onClick={() => {
                // Redirect to login page
                window.location.href = '/login';
              }}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ml-4"
            >
              Go to Login
            </button>
          )}
        </div>
        
        {/* Debug component for troubleshooting */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      </div>
    );
  }

  if (!course) {
    console.log('CourseDetail: Showing course not found message');
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Course not found</div>
        </div>
        
        {/* Debug component for troubleshooting */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/user/courses')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <ChevronLeft className="h-5 w-5 mr-1" />
        Back to Courses
      </button>

      {/* Debug component for troubleshooting - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      )}

      {/* Course Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="flex flex-col md:flex-row">
          {/* Course Image */}
          <div className="md:w-1/3 h-64 bg-gray-200">
            <img
              src={getCourseImage(course.title)}
              alt={course.title}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
          
          {/* Course Info */}
          <div className="md:w-2/3 p-6">
            <div className="mb-4">
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
                {course.level && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    course.level === 'Basics' 
                      ? 'bg-green-100 text-green-800' 
                      : course.level === 'Intermediate' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {course.level}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-4">
                {course.description || `Master the art of ${course.title.toLowerCase()}. This course contains various modules to help you develop your skills.`}
              </p>
              
              <div className="flex flex-wrap items-center text-sm text-gray-500 mb-4">
                <div className="flex items-center mr-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{podcasts.length > 0 ? `${Math.ceil(podcasts.length * 0.25)} hours` : 'No content yet'}</span>
                </div>
                <div className="flex items-center mr-4">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>{categories.length} modules</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Single Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('audios')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'audios' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Headphones className="h-5 w-5 mr-2" />
          Audios
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'videos' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Play className="h-5 w-5 mr-2" />
          Videos
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'docs' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="h-5 w-5 mr-2" />
          Docs
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'images' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Image className="h-5 w-5 mr-2" />
          Images
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'templates' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <File className="h-5 w-5 mr-2" />
          Templates
        </button>
      </div>

      {/* Audios Tab */}
      {activeTab === 'audios' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Audio Content</h2>
          <div className="space-y-3">
            {podcasts.filter(p => !p.is_youtube_video).length > 0 ? 
              podcasts.filter(p => !p.is_youtube_video).map(podcast => {
                const completion = getPodcastCompletion(podcast.id);
                
                return (
                  <div 
                    key={podcast.id} 
                    className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                      currentPodcast?.id === podcast.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50'
                    }`}
                    onClick={() => handlePlayPodcast(podcast)}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Headphones className="h-5 w-5 text-blue-600" />
                        </div>
                      </div> 
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{podcast.title}</h3>
                        <p className="text-xs text-gray-500">Audio content</p>
                        {completion > 0 && (
                          <div className="ml-2 flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${completion}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500 ml-1">{completion}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-500">
                  <Headphones className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Audio Content</h3>
                  <p className="text-gray-500">This course doesn't have any audio content yet.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Content</h2>
          <div className="space-y-3">
            {podcasts.filter(p => p.is_youtube_video).length > 0 ? 
              podcasts.filter(p => p.is_youtube_video).map(podcast => {
                const completion = getPodcastCompletion(podcast.id);
                
                return (
                  <div 
                    key={podcast.id} 
                    className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                      currentPodcast?.id === podcast.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50'
                    }`}
                    onClick={() => {
                      // Open YouTube video in new tab
                      if (podcast.video_url) {
                        window.open(podcast.video_url, '_blank');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <Play className="h-5 w-5 text-red-600" />
                        </div>
                      </div> 
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{podcast.title}</h3>
                        <p className="text-xs text-gray-500">YouTube Video</p>
                        {completion > 0 && (
                          <div className="ml-2 flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${completion}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500 ml-1">{completion}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-500">
                  <Play className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Video Content</h3>
                  <p className="text-gray-500">This course doesn't have any video content yet.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Docs Tab */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdfs.filter(pdf => {
              const extension = pdf.pdf_url.split('.').pop()?.toLowerCase();
              return extension === 'pdf' || extension === 'docx' || extension === 'doc' || extension === 'txt';
            }).length > 0 ? 
              pdfs.filter(pdf => {
                const extension = pdf.pdf_url.split('.').pop()?.toLowerCase();
                return extension === 'pdf' || extension === 'docx' || extension === 'doc' || extension === 'txt';
              }).map(pdf => (
                <div key={pdf.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">{pdf.title}</h3>
                      <p className="text-xs text-gray-500 mb-3">PDF Document</p>
                      <a 
                        href={pdf.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.preventDefault();
                          // Open in new window/tab
                          window.open(pdf.pdf_url, '_blank');
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500 col-span-full">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
                  <p className="text-gray-500">This course doesn't have any documents yet.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Images & Cheatsheets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdfs.filter(pdf => {
              const extension = pdf.pdf_url.split('.').pop()?.toLowerCase();
              return extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'gif' || extension === 'svg';
            }).length > 0 ? 
              pdfs.filter(pdf => {
                const extension = pdf.pdf_url.split('.').pop()?.toLowerCase();
                return extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'gif' || extension === 'svg';
              }).map(pdf => (
                <div key={pdf.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                      <Image className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">{pdf.title}</h3>
                      <p className="text-xs text-gray-500 mb-3">Image File</p>
                      <a 
                        href={pdf.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.preventDefault();
                          // Open in new window/tab
                          window.open(pdf.pdf_url, '_blank');
                        }}
                      >
                        <Image className="h-3 w-3 mr-1" />
                        View Image
                      </a>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500 col-span-full">
                  <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Images</h3>
                  <p className="text-gray-500">This course doesn't have any images or cheatsheets yet.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdfs.filter(pdf => {
              const extension = pdf.pdf_url.split('.').pop()?.toLowerCase();
              return extension !== 'pdf' && extension !== 'docx' && extension !== 'doc' && extension !== 'txt' && 
                     extension !== 'jpg' && extension !== 'jpeg' && extension !== 'png' && extension !== 'gif' && extension !== 'svg';
            }).length > 0 ? 
              pdfs.filter(pdf => {
                const extension = pdf.pdf_url.split('.').pop()?.toLowerCase();
                return extension !== 'pdf' && extension !== 'docx' && extension !== 'doc' && extension !== 'txt' && 
                       extension !== 'jpg' && extension !== 'jpeg' && extension !== 'png' && extension !== 'gif' && extension !== 'svg';
              }).map(pdf => (
                <div key={pdf.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                      <File className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">{pdf.title}</h3>
                      <p className="text-xs text-gray-500 mb-3">Template File</p>
                      <a 
                        href={pdf.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.preventDefault();
                          // Open in new window/tab
                          window.open(pdf.pdf_url, '_blank');
                        }}
                      >
                        <File className="h-3 w-3 mr-1" />
                        View Template
                      </a>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500 col-span-full">
                  <File className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates</h3>
                  <p className="text-gray-500">This course doesn't have any templates yet.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Media Player */}
      {currentPodcast && activeTab === 'audios' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{currentPodcast.title}</h2>
              <button
                onClick={() => setCurrentPodcast(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4">
              <PodcastPlayer 
                podcast={currentPodcast} 
                userId={userId || undefined}
                onProgressUpdate={(progress, duration, currentTime) => {
                  // Update local progress state
                  setPodcastProgress(prev => ({
                    ...prev,
                    [currentPodcast.id]: {
                      id: currentPodcast.id,
                      user_id: userId || '',
                      podcast_id: currentPodcast.id,
                      playback_position: currentTime,
                      duration: duration,
                      progress_percent: progress,
                      last_played_at: new Date().toISOString()
                    }
                  }));
                  
                  // Call parent callback if provided
                  if (onProgressUpdate) {
                    onProgressUpdate(progress, duration, currentTime);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}