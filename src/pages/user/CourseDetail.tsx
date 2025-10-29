import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, BookOpen, User, ChevronLeft, Play, FileText, MessageSquare, Headphones, Download, Lock, CheckCircle, Image as ImageIcon, File as FileIcon } from 'lucide-react';
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

  // State for course image
  const [courseImage, setCourseImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState<boolean>(false);
  
  // Ref to track if image generation has been attempted
  const imageGenerationAttemptedRef = useRef(false);

  // Generate course image using Stability AI
  const generateCourseImage = async (courseTitle: string, courseId: string) => {
    // If we already have a course image, return it
    if (courseImage) {
      return courseImage;
    }
    
    // First, check if course already has an image_url
    if (course?.image_url) {
      setCourseImage(course.image_url);
      return course.image_url;
    }
    
    // If no image_url exists, generate one using Stability AI
    try {
      setLoadingImage(true);
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
          setLoadingImage(false);
          return null;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('course-images')
          .getPublicUrl(fileName);
        
        // Update course with the new image URL
        try {
          await supabaseHelpers.updateCourse(courseId, { image_url: publicUrl });
          console.log('Course image updated successfully');
        } catch (updateError) {
          console.error('Error updating course with image URL:', updateError);
        }
        
        setCourseImage(publicUrl);
        setLoadingImage(false);
        return publicUrl;
      }
    } catch (error) {
      console.error('Error generating AI course image:', error);
    }
    
    setLoadingImage(false);
    return null;
  };

  // Effect to generate course image when course loads
  useEffect(() => {
    if (course && course.id && !courseImage && !loadingImage && !imageGenerationAttemptedRef.current) {
      imageGenerationAttemptedRef.current = true;
      generateCourseImage(course.title, course.id);
    }
  }, [course, courseImage, loadingImage]);

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
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
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

      {/* Course Header with Enhanced Design */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 transition-all hover:shadow-2xl">
        <div className="flex flex-col md:flex-row">
          {/* Course Image with Gradient Overlay */}
          <div className="md:w-2/5 relative">
            <div className="h-64 md:h-full bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
              {loadingImage ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              ) : (
                <img
                  src={getCourseImageWithFallback()}
                  alt={course.title}
                  className="w-full h-full object-cover opacity-90"
                  onError={handleImageError}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            </div>
          </div>
          
          {/* Course Info with Enhanced Styling */}
          <div className="md:w-3/5 p-8">
            <div className="mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                {course.level && (
                  <span className={`px-4 py-2 text-sm font-semibold rounded-full shadow-sm ${
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
              
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                {course.description || `Master the art of ${course.title.toLowerCase()}. This course contains various modules to help you develop your skills.`}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Time</p>
                    <p className="font-semibold">{podcasts.length > 0 ? `${Math.ceil(podcasts.length * 0.25)} hours` : 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Modules</p>
                    <p className="font-semibold">{categories.length}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Progress</p>
                    <p className="font-semibold">
                      {(() => {
                        const totalPodcasts = podcasts.length;
                        const completedPodcasts = podcasts.filter(p => {
                          const progress = podcastProgress[p.id];
                          return progress && progress.progress_percent === 100;
                        }).length;
                        return totalPodcasts > 0 ? `${Math.round((completedPodcasts / totalPodcasts) * 100)}%` : '0%';
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <button
          onClick={() => setActiveTab('audios')}
          className={`py-4 px-2 rounded-xl flex flex-col items-center justify-center font-medium transition-all transform hover:scale-105 ${
            activeTab === 'audios' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
          }`}
        >
          <div className="p-3 rounded-full mb-2 bg-white/20">
            <Headphones className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold">Audios</span>
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-4 px-2 rounded-xl flex flex-col items-center justify-center font-medium transition-all transform hover:scale-105 ${
            activeTab === 'videos' 
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
          }`}
        >
          <div className="p-3 rounded-full mb-2 bg-white/20">
            <Play className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold">Videos</span>
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`py-4 px-2 rounded-xl flex flex-col items-center justify-center font-medium transition-all transform hover:scale-105 ${
            activeTab === 'docs' 
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
          }`}
        >
          <div className="p-3 rounded-full mb-2 bg-white/20">
            <FileText className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold">Docs</span>
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`py-4 px-2 rounded-xl flex flex-col items-center justify-center font-medium transition-all transform hover:scale-105 ${
            activeTab === 'images' 
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
          }`}
        >
          <div className="p-3 rounded-full mb-2 bg-white/20">
            <ImageIcon className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold">Images</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-4 px-2 rounded-xl flex flex-col items-center justify-center font-medium transition-all transform hover:scale-105 ${
            activeTab === 'templates' 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
          }`}
        >
          <div className="p-3 rounded-full mb-2 bg-white/20">
            <FileIcon className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold">Templates</span>
        </button>
      </div>

      {/* Audios Tab */}
      {activeTab === 'audios' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Audio Content</h2>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Podcast List - Left Side */}
            <div className="lg:w-1/2">
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
                  <p className="text-center">Select an audio file from the playlist to start listening</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Content</h2>
          <div className="space-y-6">
            {podcasts.filter(p => p.is_youtube_video).length > 0 ? 
              podcasts.filter(p => p.is_youtube_video).map(podcast => {
                const completion = getPodcastCompletion(podcast.id);
                
                return (
                  <div 
                    key={podcast.id} 
                    className={`p-4 rounded-lg transition-colors ${
                      currentPodcast?.id === podcast.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="md:w-1/3">
                        {podcast.video_url ? (
                          <div 
                            className="aspect-video bg-gray-200 rounded-lg cursor-pointer relative group"
                            onClick={() => handlePlayPodcast(podcast)}
                          >
                            <img 
                              src={`https://img.youtube.com/vi/${extractYouTubeVideoId(podcast.video_url)}/mqdefault.jpg`} 
                              alt={podcast.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg group-hover:bg-opacity-20 transition-all">
                              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                <Play className="h-8 w-8 text-white ml-1" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                            <Play className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="md:w-2/3">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{podcast.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">YouTube Video</p>
                        
                        {currentPodcast?.id === podcast.id && podcast.video_url && (
                          <div className="mt-4 bg-white rounded-lg overflow-hidden border">
                            <div className="aspect-video">
                              <iframe
                                src={`https://www.youtube.com/embed/${extractYouTubeVideoId(podcast.video_url)}?autoplay=1`}
                                title={podcast.title}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-4">
                          <button
                            onClick={() => handlePlayPodcast(podcast)}
                            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {currentPodcast?.id === podcast.id ? 'Playing...' : 'Play Video'}
                          </button>
                          
                          {completion > 0 && (
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${completion}%` }}></div>
                              </div>
                              <span className="text-sm text-gray-600">{completion}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12 text-gray-500">
                  <Play className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Video Content</h3>
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
                      <ImageIcon className="h-8 w-8 text-blue-600" />
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
                        <ImageIcon className="h-3 w-3 mr-1" />
                        View Image
                      </a>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500 col-span-full">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
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
                      <FileIcon className="h-8 w-8 text-blue-600" />
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
                        <FileIcon className="h-3 w-3 mr-1" />
                        View Template
                      </a>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500 col-span-full">
                  <FileIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
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
    </div>
  );
}