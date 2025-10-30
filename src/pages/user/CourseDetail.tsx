import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Upload, BookOpen, Headphones, FileText, Play, Clock, BarChart3, Youtube, ArrowLeft, ChevronDown, ChevronRight, ChevronLeft, Music, Folder, User, Image, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import DebugUserCourses from '../../components/Debug/DebugUserCourses';
import QuizComponent from '../../components/Quiz/QuizComponent';
import PodcastPlayer from '../../components/Media/PodcastPlayer';
import { stabilityAI } from '../../services/stabilityai';

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

interface PDF {
  id: string;
  title: string;
  course_id: string;
  pdf_url: string;
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
  const [totalLearningHours, setTotalLearningHours] = useState<number>(0);

  // State for course image
  const [courseImage, setCourseImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Load course data when component mounts or courseId changes
  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) {
        setError('No course ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Load course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) {
          throw new Error(`Failed to load course: ${courseError.message}`);
        }

        if (!courseData) {
          throw new Error('Course not found');
        }

        setCourse(courseData);

        // Load categories for this course
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('content-categories')
          .select('*')
          .eq('course_id', courseId);

        if (categoriesError) {
          console.error('Error loading categories:', categoriesError);
        } else {
          setCategories(categoriesData || []);
        }

        // Load podcasts for this course
        const { data: podcastsData, error: podcastsError } = await supabase
          .from('podcasts')
          .select('*')
          .eq('course_id', courseId);

        if (podcastsError) {
          console.error('Error loading podcasts:', podcastsError);
        } else {
          setPodcasts(podcastsData || []);
          
          // Calculate total learning hours based on podcast durations
          let totalHours = 0;
          if (podcastsData) {
            // For now, we'll estimate 30 minutes per podcast as a placeholder
            // In a real implementation, you would sum the actual durations
            totalHours = podcastsData.length * 0.5;
          }
          setTotalLearningHours(totalHours);
        }

        // Load PDFs for this course
        const { data: pdfsData, error: pdfsError } = await supabase
          .from('pdfs')
          .select('*')
          .eq('course_id', courseId);

        if (pdfsError) {
          console.error('Error loading PDFs:', pdfsError);
        } else {
          setPdfs(pdfsData || []);
        }

        // If we have a course image URL, use it
        if (courseData.image_url) {
          setCourseImage(courseData.image_url);
        }
      } catch (err) {
        console.error('Error loading course data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  // Load user authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Load podcast progress when user ID changes
  useEffect(() => {
    if (userId) {
      loadPodcastProgress();
    }
  }, [userId]);

  // Function to manually generate course image using Stability AI
  const generateCourseImage = async (courseTitle: string, courseId: string) => {
    // Check if Stability AI is configured
    if (!stabilityAI.isConfigured()) {
      alert('Stability AI API key is not configured. Please contact administrator.');
      return;
    }

    try {
      setIsGeneratingImage(true);
      
      console.log('Generating AI image for course:', courseTitle);
      const base64Image = await stabilityAI.generateCourseImage(courseTitle);
      
      if (base64Image) {
        // Convert base64 to blob and upload to Supabase storage
        const binaryString = atob(base64Image);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });
        
        // Upload to Supabase storage
        const fileName = `course-images/${courseId}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('course-images')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Error uploading AI generated image:', uploadError);
          alert('Failed to upload generated image. Please try again.');
          setIsGeneratingImage(false);
          return;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('course-images')
          .getPublicUrl(fileName);
        
        // Update course with the new image URL
        try {
          await supabaseHelpers.updateCourse(courseId, { image_url: publicUrl });
          console.log('Course image updated successfully');
          setCourseImage(publicUrl);
          alert('Course image generated and saved successfully!');
        } catch (updateError) {
          console.error('Error updating course with image URL:', updateError);
          alert('Failed to save image to course. Please try again.');
        }
      } else {
        alert('Failed to generate course image. Please try again.');
      }
    } catch (error) {
      console.error('Error generating AI course image:', error);
      alert('Error generating course image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Get course image with fallback
  const getCourseImageWithFallback = () => {
    if (loadingImage) {
      return 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    }
    
    if (courseImage) {
      return courseImage;
    }
    
    if (course?.image_url) {
      return course.image_url;
    }
    
    return getDefaultImage(course?.title || '');
  };

  // Get default placeholder image based on course title
  const getDefaultImage = (courseTitle: string) => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <button
        onClick={() => navigate('/user/courses')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6 group"
      >
        <ChevronLeft className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" />
        <span className="font-medium">Back to Courses</span>
      </button>

      {/* Debug component for troubleshooting - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading course</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : course ? (
          <>
            {/* Course Header */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <div className="md:flex">
                {/* Course Image - Left Side */}
                <div className="md:w-1/3">
                  <div className="aspect-square bg-gray-200 relative">
                    {loadingImage ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : courseImage || course?.image_url ? (
                      <img
                        src={getCourseImageWithFallback()}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
                        <BookOpen className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500 text-center">No course image</p>
                        <button
                          onClick={() => generateCourseImage(course.title, course.id)}
                          disabled={isGeneratingImage}
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center disabled:opacity-50"
                        >
                          {isGeneratingImage ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Image className="h-4 w-4 mr-1" />
                              Generate Image
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Details - Right Side */}
                <div className="md:w-2/3 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
                      {course.level && (
                        <span className={`px-3 py-1 text-sm rounded-full ${
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
                    {(!courseImage && !course?.image_url) && (
                      <button
                        onClick={() => generateCourseImage(course.title, course.id)}
                        disabled={isGeneratingImage}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center disabled:opacity-50"
                      >
                        {isGeneratingImage ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Image className="h-4 w-4 mr-1" />
                            Generate Image
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <p className="text-gray-600 mb-6">{course.description || 'No description provided for this course.'}</p>

                  {/* Course Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {categoriesWithProgress.length}
                      </div>
                      <div className="text-sm text-gray-600">Categories</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {podcasts.length}
                      </div>
                      <div className="text-sm text-gray-600">Podcasts</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {pdfs.length}
                      </div>
                      <div className="text-sm text-gray-600">Documents</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {totalLearningHours.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">Hours</div>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      {['podcasts', 'documents', 'quiz'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                            activeTab === tab
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            </div>

            {/* Podcasts Tab */}
            {activeTab === 'podcasts' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Podcasts</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Podcast List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {podcasts.length > 0 ? 
                        podcasts.map(podcast => {
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
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Podcasts</h3>
                            <p className="text-gray-500">This course doesn't have any podcasts yet.</p>
                          </div>
                        )}
                    </div>
                  </div>
                  
                  {/* Audio Player - Right Side */}
                  <div className="lg:w-1/2">
                    {currentPodcast ? (
                      <div className="bg-gray-50 rounded-lg p-4 h-full">
                        <div className="mb-4">
                          <h2 className="text-lg font-bold text-gray-900">{currentPodcast.title}</h2>
                        </div>
                        <div className="mt-4">
                          <PodcastPlayer 
                            podcast={currentPodcast} 
                            userId={userId || undefined}
                            onProgressUpdate={(progress: number, duration: number, currentTime: number) => {
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
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 h-full flex flex-col items-center justify-center text-gray-500">
                        <Headphones className="h-12 w-12 mb-4" />
                        <p className="text-center">Select a podcast from the playlist to start listening</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdfs.length > 0 ? 
                    pdfs.map(pdf => (
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

            {/* Quiz Tab */}
            {activeTab === 'quiz' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quiz</h2>
                <div className="space-y-4">
                  {/* Quiz Content */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Module Quiz</h3>
                    <p className="text-gray-600 mb-4">Test your knowledge on the course modules.</p>
                    <button
                      onClick={() => startModuleQuiz('module1', 'Module 1')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Start Module 1 Quiz
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Final Quiz</h3>
                    <p className="text-gray-600 mb-4">Complete the final quiz to finish the course.</p>
                    <button
                      onClick={startFinalQuiz}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Start Final Quiz
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Media Player */}
            {currentPodcast && activeTab === 'podcasts' && (
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
                      onProgressUpdate={(progress: number, duration: number, currentTime: number) => {
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
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Course not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The requested course could not be found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}