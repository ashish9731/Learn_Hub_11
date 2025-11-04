import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Upload, BookOpen, Headphones, FileText, Play, Clock, BarChart3, Youtube, ArrowLeft, ChevronDown, ChevronRight, ChevronLeft, Music, Folder, User, Image, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import QuizComponent from '../../components/Quiz/QuizComponent';
import QuizResults from '../../components/Quiz/QuizResults';
import PodcastPlayer from '../../components/Media/PodcastPlayer';

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
  content_type: string;
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

interface PodcastAssignment {
  id: string;
  user_id: string;
  podcast_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
}

interface PDFAssignment {
  id: string;
  user_id: string;
  pdf_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
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
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [podcastAssignments, setPodcastAssignments] = useState<PodcastAssignment[]>([]);
  const [pdfAssignments, setPdfAssignments] = useState<PDFAssignment[]>([]);
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
  const [videoViewMode, setVideoViewMode] = useState<'list' | 'tile'>('list');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [quizResults, setQuizResults] = useState<{ passed: boolean; score: number } | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]); // Track quiz attempts

  // Refs
  const youtubePlayerRef = useRef<HTMLIFrameElement>(null);

  // Check user authentication and get user ID
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setError('Authentication failed. Please log in again.');
          setIsAuthenticated(false);
          return;
        }
        
        if (session.user) {
          setUserId(session.user.id);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError('Failed to verify authentication status');
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const loadPodcastAssignments = async () => {
    if (!userId || !courseId) return;
    
    try {
      console.log('Loading podcast assignments for user:', userId, 'course:', courseId);
      // Get podcast assignments for this user that are for podcasts in this course
      const { data, error } = await supabase
        .from('podcast_assignments')
        .select(`
          *,
          podcasts!inner (
            id,
            course_id
          )
        `)
        .eq('user_id', userId)
        .eq('podcasts.course_id', courseId);
        
      if (error) {
        console.error('Error loading podcast assignments:', error);
        return;
      }
      
      console.log('Podcast assignments loaded:', data);
      setPodcastAssignments(data || []);
    } catch (error) {
      console.error('Error loading podcast assignments:', error);
    }
  };

  // Load PDF assignments
  const loadPdfAssignments = async () => {
    if (!userId || !courseId) return;
    
    try {
      console.log('Loading PDF assignments for user:', userId, 'course:', courseId);
      // Get PDF assignments for this user that are for PDFs in this course
      const { data, error } = await supabase
        .from('pdf_assignments')
        .select(`
          *,
          pdfs!inner (
            id,
            course_id
          )
        `)
        .eq('user_id', userId)
        .eq('pdfs.course_id', courseId);
        
      if (error) {
        console.error('Error loading PDF assignments:', error);
        return;
      }
      
      console.log('PDF assignments loaded:', data);
      setPdfAssignments(data || []);
    } catch (error) {
      console.error('Error loading PDF assignments:', error);
    }
  };

  // Load quiz attempts
  const loadQuizAttempts = async () => {
    if (!userId || !courseId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_quiz_attempts')
        .select(`
          *,
          module_quizzes (id, title),
          course_quizzes (id, title)
        `)
        .eq('user_id', userId)
        .or(`module_quizzes.course_id.eq.${courseId},course_quizzes.course_id.eq.${courseId}`);
        
      if (error) {
        console.error('Error loading quiz attempts:', error);
        return;
      }
      
      setQuizAttempts(data || []);
      console.log('Loaded quiz attempts:', data);
    } catch (error) {
      console.error('Error loading quiz attempts:', error);
    }
  };

  // Filter podcasts to only show assigned ones
  const getAssignedPodcasts = () => {
    console.log('Filtering podcasts, assignments count:', podcastAssignments.length);
    console.log('Total podcasts:', podcasts.length);
    
    // For testing purposes, if no podcast assignments exist, show all podcasts
    // In production, this should be removed and proper assignments should be used
    if (podcastAssignments.length === 0) {
      console.log('No podcast assignments found, showing all podcasts for testing');
      return podcasts;
    }
    
    // Filter podcasts to only show assigned ones
    const assignedPodcastIds = new Set(podcastAssignments.map(pa => pa.podcast_id));
    console.log('Assigned podcast IDs:', Array.from(assignedPodcastIds));
    
    const filteredPodcasts = podcasts.filter(podcast => {
      const isAssigned = assignedPodcastIds.has(podcast.id);
      console.log(`Podcast ${podcast.id} - Title: ${podcast.title}, Assigned: ${isAssigned}`);
      return isAssigned;
    });
    console.log('Filtered podcasts count:', filteredPodcasts.length);
    
    return filteredPodcasts;
  };

  // Filter PDFs to only show assigned ones
  const getAssignedPDFs = (contentType: string): PDF[] => {
    console.log('Filtering PDFs, assignments count:', pdfAssignments.length);
    console.log('Total PDFs:', pdfs.length);
    console.log('Requested content type:', contentType);
    
    // If no PDF assignments exist, show no PDFs (proper assignment filtering)
    if (pdfAssignments.length === 0) {
      console.log('No PDF assignments found, returning empty array');
      return [];
    }
    
    // Filter PDFs to only show assigned ones
    const assignedPdfIds = new Set(pdfAssignments.map(pa => pa.pdf_id));
    console.log('Assigned PDF IDs:', Array.from(assignedPdfIds));
    
    // Filter by both assignment and content type
    const filteredPDFs = pdfs.filter(pdf => {
      const isAssigned = assignedPdfIds.has(pdf.id);
      const matchesContentType = pdf.content_type === contentType;
      console.log(`PDF ${pdf.id} - Title: ${pdf.title}, Assigned: ${isAssigned}, ContentType: ${pdf.content_type}, Matches: ${matchesContentType}`);
      return isAssigned && matchesContentType;
    });
    
    console.log('Filtered PDFs count:', filteredPDFs.length);
    
    return filteredPDFs;
  };

  // Load course data when component mounts or courseId changes
  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) {
        setError('No course ID provided');
        setLoading(false);
        return;
      }

      // Wait for authentication to be verified before loading course data
      if (!isAuthenticated) {
        // Still checking auth, don't load course data yet
        return;
      }

      if (!userId) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // First check if user is assigned to this course
        const { data: userCourse, error: userCourseError } = await supabase
          .from('user_courses')
          .select('user_id, course_id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (userCourseError) {
          console.error('Error checking course assignment:', userCourseError);
          setError('Error checking course assignment');
          setLoading(false);
          return;
        } else if (!userCourse) {
          // User is not assigned to this course
          setError('You are not assigned to this course.');
          setLoading(false);
          return;
        }
        
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
        }

        // Load PDFs for this course
        const { data: pdfsData, error: pdfsError } = await supabase
          .from('pdfs')
          .select('*')
          .eq('course_id', courseId);

        if (pdfsError) {
          console.error('Error loading PDFs:', pdfsError);
        } else {
          console.log('PDFs loaded:', pdfsData);
          // Log content_type for each PDF to debug
          pdfsData?.forEach(pdf => {
            console.log(`PDF: ${pdf?.title}, content_type: ${pdf?.content_type}`);
          });
          // Ensure all PDFs have a content_type, set to 'docs' as default if missing
          const processedPdfs = pdfsData?.map(pdf => ({
            ...pdf,
            content_type: pdf.content_type || 'docs' // Use database value if available, otherwise default to 'docs'
          })) || [];
          setPdfs(processedPdfs);
        }

        // If we have a course image URL, use it
        if (courseData.image_url) {
          // Remove the incorrect line that was causing the error
        }
      } catch (err) {
        console.error('Error loading course data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, isAuthenticated, userId]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('=== STATE UPDATE ===');
    console.log('Podcast progress updated:', podcastProgress);
    console.log('Podcast assignments:', podcastAssignments);
    console.log('All podcasts:', podcasts);
    console.log('Assigned podcasts:', getAssignedPodcasts());
  }, [podcastProgress, podcastAssignments, podcasts]);

  // Load assignments when userId or courseId changes
  useEffect(() => {
    if (userId && courseId) {
      loadPodcastAssignments();
      loadPdfAssignments();
      loadQuizAttempts(); // Load quiz attempts
      loadPodcastProgress(); // Load podcast progress
    }
  }, [userId, courseId]);

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
    if (!activeCategory) return getAssignedPodcasts();
    return getAssignedPodcasts().filter(podcast => podcast.category_id === activeCategory);
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

  // Check if a YouTube video is unlocked (previous videos must be completed)
  const isVideoUnlocked = (videoIndex: number, videos: any[]) => {
    // First video is always unlocked
    if (videoIndex === 0) return true;
    
    // Check if previous video is completed
    const previousVideo = videos[videoIndex - 1];
    const progress = podcastProgress[previousVideo.id]; // Using podcast_progress for YouTube videos too
    return progress && progress.progress_percent >= 100;
  };

  // Get the completion percentage for a podcast
  const getPodcastCompletion = (podcastId: string) => {
    const progress = podcastProgress[podcastId];
    return progress ? progress.progress_percent : 0;
  };

  // Check if all modules are completed
  const checkAllModulesCompleted = () => {
    // Check if all audio and video content has been completed (100% progress)
    // Only audio and video are required for quiz access, not docs, images, or templates
    const assignedPodcasts = getAssignedPodcasts();
    const audioContent = assignedPodcasts.filter(p => !p.is_youtube_video);
    const videoContent = assignedPodcasts.filter(p => p.is_youtube_video);
    
    const allRequiredContent = [...audioContent, ...videoContent];
    
    console.log('=== MODULE COMPLETION CHECK ===');
    console.log('Assigned podcasts:', assignedPodcasts);
    console.log('Audio content:', audioContent);
    console.log('Video content:', videoContent);
    console.log('All required content:', allRequiredContent);
    console.log('Current podcast progress:', podcastProgress);
    console.log('Podcast assignments:', podcastAssignments);
    console.log('All podcasts:', podcasts);
    
    // If there's no required content, consider it completed
    if (allRequiredContent.length === 0) {
      console.log('No required content found, considering completed');
      return true;
    }
    
    // Check if all required content has 100% progress
    const completionResults = allRequiredContent.map(content => {
      const progress = podcastProgress[content.id];
      const isCompleted = progress && progress.progress_percent >= 100;
      console.log(`Content ${content.id} - Title: ${content.title}, Progress: ${progress?.progress_percent || 0}%, Completed: ${isCompleted}`);
      return {
        content,
        progress,
        isCompleted
      };
    });
    
    const allCompleted = completionResults.every(item => item.isCompleted);
    
    console.log('Completion results:', completionResults);
    console.log('All modules completed:', allCompleted);
    console.log('=== END MODULE COMPLETION CHECK ===');
    
    return allCompleted;
  };

  // Check if module quizzes are completed
  const checkModuleQuizzesCompleted = () => {
    // For now, we'll assume module quizzes are completed if any exist
    // In a more complex implementation, we would check specific module quiz completion
    return quizAttempts.some(attempt => attempt.module_quiz_id);
  };

  // Start module quiz
  const startModuleQuiz = (categoryId: string, categoryName: string) => {
    // Check if all modules are completed before allowing quiz access
    if (!checkAllModulesCompleted()) {
      alert('You must complete all modules before taking the quiz.');
      return;
    }
    
    setQuizCategoryId(categoryId);
    setQuizCategoryName(categoryName);
    setShowQuiz(true);
    setActiveTab('quizzes');
  };

  // Start final quiz
  const startFinalQuiz = () => {
    // Check if all modules are completed before allowing quiz access
    if (!checkAllModulesCompleted()) {
      alert('You must complete all modules before taking the quiz.');
      return;
    }
    
    setShowFinalQuiz(true);
    setActiveTab('quizzes');
  };

  // Handle quiz completion
  const handleQuizComplete = (passed: boolean, score: number) => {
    setQuizResults({ passed, score });
    setShowQuiz(false);
    setShowFinalQuiz(false);
    
    // Reload data to reflect quiz completion
    if (userId) {
      loadPodcastProgress();
      loadQuizAttempts(); // Reload quiz attempts
    }
  };

  const handleRetakeQuiz = () => {
    setQuizResults(null);
    if (quizCategoryId && quizCategoryName) {
      startModuleQuiz(quizCategoryId, quizCategoryName);
    } else {
      startFinalQuiz();
    }
  };

  const handleExitQuiz = () => {
    setQuizResults(null);
    setActiveTab('quizzes');
  };

  const loadPodcastProgress = async () => {
    if (!userId) return;
    
    try {
      console.log('Loading podcast progress for user:', userId);
      const { data, error } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error loading podcast progress:', error);
        return;
      }
      
      console.log('Raw podcast progress data:', data);
      
      if (data && data.length > 0) {
        // Create a map of podcast_id to progress
        const progressMap: Record<string, PodcastProgress> = {};
        
        data.forEach(item => {
          progressMap[item.podcast_id] = item;
        });
        
        setPodcastProgress(progressMap);
        console.log('Loaded podcast progress map:', progressMap);
      } else {
        console.log('No podcast progress found for user:', userId);
        setPodcastProgress({});
      }
    } catch (error) {
      console.error('Error loading podcast progress:', error);
    }
  };  // Handle play podcast - updated to work with both audio and YouTube videos
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

  // Render YouTube video player
  const renderYouTubePlayer = (videoUrl: string) => {
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) return null;

    return (
      <div className="aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          className="w-full h-full rounded-lg"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube Video Player"
        ></iframe>
      </div>
    );
  };

  if (loading) {
    console.log('CourseDetail: Showing loading spinner');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    console.log('CourseDetail: Showing error message:', error);
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-400">Error loading course: {error}</div>
          <button
            onClick={() => navigate('/user/courses')}
            className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-600"
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
          {error.includes('not assigned') && (
            <div className="mt-4 text-gray-300">
              <p>Please contact your administrator to be assigned to this course.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!course) {
    console.log('CourseDetail: Showing course not found message');
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-400">Course not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Glassmorphism Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-b-2xl border-b border-white/20 shadow-xl p-6 mb-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/user/courses')}
            className="flex items-center text-blue-400 hover:text-blue-300 mb-6 group"
          >
            <ChevronLeft className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Courses</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 backdrop-blur-lg rounded-2xl border border-red-500/30 shadow-xl p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">Error loading course</h3>
                <div className="mt-2 text-sm text-red-200">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : course ? (
          <>
            {/* Course Header */}
            <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-800">
              <div className="md:flex">
                {/* Course Image - Left Side */}
                <div className="md:w-1/3">
                  <div className="aspect-video bg-gray-800 relative rounded-xl overflow-hidden border border-gray-700">
                    {course?.image_url ? (
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-6 border border-gray-700">
                        <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-400 text-center font-medium">No course image</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Details - Right Side */}
                <div className="md:w-2/3 p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-3">{course.title}</h1>
                      {course.level && (
                        <span className={`px-4 py-2 text-sm rounded-full font-medium ${
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
                  </div>

                  <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                    {course.description ? course.description : 'No description provided for this course.'}
                  </p>

                  {/* Course Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-center shadow-sm border border-gray-700">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {categoriesWithProgress.length}
                      </div>
                      <div className="text-sm font-medium text-gray-300">Categories</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-center shadow-sm border border-gray-700">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        {getAssignedPodcasts().filter(p => !p.is_youtube_video).length}
                      </div>
                      <div className="text-sm font-medium text-gray-300">Audio Files</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-center shadow-sm border border-gray-700">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {getAssignedPodcasts().filter(p => p.is_youtube_video).length}
                      </div>
                      <div className="text-sm font-medium text-gray-300">Video Files</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-center shadow-sm border border-gray-700">
                      <div className="text-2xl font-bold text-yellow-400 mb-1">
                        {pdfs.length}
                      </div>
                      <div className="text-sm font-medium text-gray-300">Documents</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Content Type Navigation Buttons - Below Course Image */}
              <div className="px-8 pb-8">
                <div className="flex flex-wrap gap-4 justify-center">
                  {['audio', 'video', 'docs', 'images', 'templates', 'quizzes'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 min-w-[140px] px-6 py-4 rounded-2xl font-semibold text-lg capitalize transition-all duration-300 transform hover:scale-105 ${
                        activeTab === tab
                          ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-xl'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:shadow-lg'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Tab */}
            {activeTab === 'audio' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Audio Content</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Audio List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {(() => {
                        const assignedPodcasts = getAssignedPodcasts().filter(p => !p.is_youtube_video);
                        console.log('Rendering audio tab, assigned podcasts count:', assignedPodcasts.length);
                        return assignedPodcasts.length > 0 ? 
                          assignedPodcasts.map(podcast => {
                            const completion = getPodcastCompletion(podcast.id);
                            
                            return (
                              <div 
                                key={podcast.id} 
                                className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                  currentPodcast?.id === podcast.id 
                                    ? 'bg-gray-800 border border-blue-500' 
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => handlePlayPodcast(podcast)}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                      <Headphones className="h-5 w-5 text-blue-400" />
                                    </div>
                                  </div> 
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{podcast.title}</h3>
                                    <p className="text-xs text-gray-400">Audio content</p>
                                    {completion > 0 && (
                                      <div className="ml-2 flex items-center">
                                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${completion}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500 ml-1">{completion}%</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Show checkmark when completed */}
                                  {completion >= 100 && (
                                    <div className="flex-shrink-0 ml-2">
                                      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-center py-8 text-gray-400">
                              <Headphones className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">No Audio Content</h3>
                              <p className="text-gray-400">No audio content has been assigned to you for this course.</p>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                  {/* Audio Completion Panel */}
                  <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">Audio Module Completion</h3>
                    <p className="text-gray-300 text-sm mb-3">After listening to all audio content, mark the entire module as complete:</p>
                    <div className="space-y-2">
                      {getAssignedPodcasts().filter(p => !p.is_youtube_video).map((podcast) => {
                        const completion = getPodcastCompletion(podcast.id);
                        return (
                          <div key={podcast.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                <Headphones className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-white">{podcast.title}</h3>
                                <p className="text-xs text-gray-400">Audio content</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${completion}%` }}></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">{completion}%</span>
                              {/* Show checkmark when completed */}
                              {completion >= 100 && (
                                <div className="flex-shrink-0 ml-2">
                                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Complete Module Button */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={async () => {
                            try {
                              // Mark all audio podcasts as 100% complete
                              const audioPodcasts = getAssignedPodcasts().filter(p => !p.is_youtube_video);
                              for (const podcast of audioPodcasts) {
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  podcast.id,
                                  100, // playback position
                                  100, // duration
                                  100  // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [podcast.id]: {
                                    id: podcast.id,
                                    user_id: userId || '',
                                    podcast_id: podcast.id,
                                    playback_position: 100,
                                    duration: 100,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                              }
                              
                              alert('All audio modules marked as complete!');
                              // Refresh progress to update UI
                              setTimeout(() => {
                                loadPodcastProgress();
                              }, 500);
                            } catch (error) {
                              console.error('Error marking audio modules as complete:', error);
                              alert('Error marking modules as complete');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark Entire Audio Module Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Video Tab */}
            {activeTab === 'video' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Video Content</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Video List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {(() => {
                        const assignedPodcasts = getAssignedPodcasts().filter(p => p.is_youtube_video);
                        console.log('Rendering video tab, assigned podcasts count:', assignedPodcasts.length);
                        return assignedPodcasts.length > 0 ? 
                          assignedPodcasts.map(podcast => {
                            const completion = getPodcastCompletion(podcast.id);
                            
                            return (
                              <div 
                                key={podcast.id} 
                                className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                  currentPodcast?.id === podcast.id 
                                    ? 'bg-gray-800 border border-blue-500' 
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => handlePlayPodcast(podcast)}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                      <Youtube className="h-5 w-5 text-blue-400" />
                                    </div>
                                  </div> 
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{podcast.title}</h3>
                                    <p className="text-xs text-gray-400">Video content</p>
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
                            <div className="text-center py-8 text-gray-400">
                              <Youtube className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">No Video Content</h3>
                              <p className="text-gray-400">No video content has been assigned to you for this course.</p>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                  {/* Video Completion Panel */}
                  <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">Video Module Completion</h3>
                    <p className="text-gray-300 text-sm mb-3">After watching all video content, mark the entire module as complete:</p>
                    <div className="space-y-2">
                      {getAssignedPodcasts().filter(p => p.is_youtube_video).map((podcast) => {
                        const completion = getPodcastCompletion(podcast.id);
                        return (
                          <div key={podcast.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                                <Youtube className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-white">{podcast.title}</h3>
                                <p className="text-xs text-gray-400">Video content</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${completion}%` }}></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">{completion}%</span>
                              {/* Show checkmark when completed */}
                              {completion >= 100 && (
                                <div className="flex-shrink-0 ml-2">
                                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Complete Module Button */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={async () => {
                            try {
                              // Mark all video podcasts as 100% complete
                              const videoPodcasts = getAssignedPodcasts().filter(p => p.is_youtube_video);
                              for (const podcast of videoPodcasts) {
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  podcast.id,
                                  1800, // playback position (30 minutes default)
                                  1800, // duration (30 minutes default)
                                  100   // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [podcast.id]: {
                                    id: podcast.id,
                                    user_id: userId || '',
                                    podcast_id: podcast.id,
                                    playback_position: 1800,
                                    duration: 1800,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                              }
                              
                              alert('All video modules marked as complete!');
                              // Refresh progress to update UI
                              setTimeout(() => {
                                loadPodcastProgress();
                              }, 500);
                            } catch (error) {
                              console.error('Error marking video modules as complete:', error);
                              alert('Error marking modules as complete');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark Entire Video Module Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'docs' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Documents</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Document List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {(() => {
                        const assignedPDFs = getAssignedPDFs('docs');
                        console.log('Rendering documents tab, assigned PDFs count:', assignedPDFs.length);
                        return assignedPDFs.length > 0 ? 
                          assignedPDFs.map(pdf => {
                            return (
                              <div 
                                key={pdf.id} 
                                className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                  currentPdf?.id === pdf.id 
                                    ? 'bg-gray-800 border border-blue-500' 
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => setCurrentPdf(pdf)}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                      <FileText className="h-5 w-5 text-blue-400" />
                                    </div>
                                  </div> 
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{pdf.title}</h3>
                                    <p className="text-xs text-gray-400">Document</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-center py-8 text-gray-400">
                              <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">No Documents</h3>
                              <p className="text-gray-400">No documents have been assigned to you for this course.</p>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                  {/* Document Completion Panel */}
                  <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">Document Module Completion</h3>
                    <p className="text-gray-300 text-sm mb-3">After reviewing all documents, mark the entire module as complete:</p>
                    <div className="space-y-2">
                      {getAssignedPDFs('docs').map((pdf) => {
                        return (
                          <div key={pdf.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                                <FileText className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-white">{pdf.title}</h3>
                                <p className="text-xs text-gray-400">Document</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">100%</span>
                              {/* Show checkmark when completed */}
                              <div className="flex-shrink-0 ml-2">
                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Complete Module Button */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={async () => {
                            try {
                              // Mark all documents as 100% complete
                              const documents = getAssignedPDFs('docs');
                              for (const pdf of documents) {
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  pdf.id,
                                  100, // playback position
                                  100, // duration
                                  100  // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [pdf.id]: {
                                    id: pdf.id,
                                    user_id: userId || '',
                                    podcast_id: pdf.id,
                                    playback_position: 100,
                                    duration: 100,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                              }
                              
                              alert('All documents marked as complete!');
                              // Refresh progress to update UI
                              setTimeout(() => {
                                loadPodcastProgress();
                              }, 500);
                            } catch (error) {
                              console.error('Error marking documents as complete:', error);
                              alert('Error marking modules as complete');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark Entire Document Module Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Images</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Image List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {(() => {
                        const assignedPDFs = getAssignedPDFs('images');
                        console.log('Rendering images tab, assigned PDFs count:', assignedPDFs.length);
                        return assignedPDFs.length > 0 ? 
                          assignedPDFs.map(pdf => {
                            return (
                              <div 
                                key={pdf.id} 
                                className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                  currentPdf?.id === pdf.id 
                                    ? 'bg-gray-800 border border-blue-500' 
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => setCurrentPdf(pdf)}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                      <Image className="h-5 w-5 text-blue-400" />
                                    </div>
                                  </div> 
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{pdf.title}</h3>
                                    <p className="text-xs text-gray-400">Image</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-center py-8 text-gray-400">
                              <Image className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">No Images</h3>
                              <p className="text-gray-400">No images have been assigned to you for this course.</p>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                  {/* Image Completion Panel */}
                  <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">Image Module Completion</h3>
                    <p className="text-gray-300 text-sm mb-3">After reviewing all images, mark the entire module as complete:</p>
                    <div className="space-y-2">
                      {getAssignedPDFs('images').map((pdf) => {
                        return (
                          <div key={pdf.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                                <Image className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-white">{pdf.title}</h3>
                                <p className="text-xs text-gray-400">Image</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">100%</span>
                              {/* Show checkmark when completed */}
                              <div className="flex-shrink-0 ml-2">
                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Complete Module Button */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={async () => {
                            try {
                              // Mark all images as 100% complete
                              const images = getAssignedPDFs('images');
                              for (const pdf of images) {
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  pdf.id,
                                  100, // playback position
                                  100, // duration
                                  100  // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [pdf.id]: {
                                    id: pdf.id,
                                    user_id: userId || '',
                                    podcast_id: pdf.id,
                                    playback_position: 100,
                                    duration: 100,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                              }
                              
                              alert('All images marked as complete!');
                              // Refresh progress to update UI
                              setTimeout(() => {
                                loadPodcastProgress();
                              }, 500);
                            } catch (error) {
                              console.error('Error marking images as complete:', error);
                              alert('Error marking modules as complete');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark Entire Image Module Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Templates</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Template List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {(() => {
                        const assignedPDFs = getAssignedPDFs('templates');
                        console.log('Rendering templates tab, assigned PDFs count:', assignedPDFs.length);
                        return assignedPDFs.length > 0 ? 
                          assignedPDFs.map(pdf => {
                            return (
                              <div 
                                key={pdf.id} 
                                className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                  currentPdf?.id === pdf.id 
                                    ? 'bg-gray-800 border border-blue-500' 
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => setCurrentPdf(pdf)}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                      <Folder className="h-5 w-5 text-blue-400" />
                                    </div>
                                  </div> 
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{pdf.title}</h3>
                                    <p className="text-xs text-gray-400">Template</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-center py-8 text-gray-400">
                              <Folder className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">No Templates</h3>
                              <p className="text-gray-400">No templates have been assigned to you for this course.</p>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                  {/* Template Completion Panel */}
                  <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">Template Module Completion</h3>
                    <p className="text-gray-300 text-sm mb-3">After reviewing all templates, mark the entire module as complete:</p>
                    <div className="space-y-2">
                      {getAssignedPDFs('templates').map((pdf) => {
                        return (
                          <div key={pdf.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                                <Folder className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-white">{pdf.title}</h3>
                                <p className="text-xs text-gray-400">Template</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">100%</span>
                              {/* Show checkmark when completed */}
                              <div className="flex-shrink-0 ml-2">
                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Complete Module Button */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={async () => {
                            try {
                              // Mark all templates as 100% complete
                              const templates = getAssignedPDFs('templates');
                              for (const pdf of templates) {
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  pdf.id,
                                  100, // playback position
                                  100, // duration
                                  100  // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [pdf.id]: {
                                    id: pdf.id,
                                    user_id: userId || '',
                                    podcast_id: pdf.id,
                                    playback_position: 100,
                                    duration: 100,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                              }
                              
                              alert('All templates marked as complete!');
                              // Refresh progress to update UI
                              setTimeout(() => {
                                loadPodcastProgress();
                              }, 500);
                            } catch (error) {
                              console.error('Error marking templates as complete:', error);
                              alert('Error marking modules as complete');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark Entire Template Module Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quizzes Tab */}
            {activeTab === 'quizzes' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Quizzes</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Quiz List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {(() => {
                        const assignedPodcasts = getAssignedPodcasts();
                        console.log('Rendering quizzes tab, assigned podcasts count:', assignedPodcasts.length);
                        return assignedPodcasts.length > 0 ? 
                          assignedPodcasts.map(podcast => {
                            return (
                              <div 
                                key={podcast.id} 
                                className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                  currentPodcast?.id === podcast.id 
                                    ? 'bg-gray-800 border border-blue-500' 
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => handlePlayPodcast(podcast)}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                      <BookOpen className="h-5 w-5 text-blue-400" />
                                    </div>
                                  </div> 
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{podcast.title}</h3>
                                    <p className="text-xs text-gray-400">Quiz</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-center py-8 text-gray-400">
                              <BookOpen className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">No Quizzes</h3>
                              <p className="text-gray-400">No quizzes have been assigned to you for this course.</p>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                  {/* Quiz Completion Panel */}
                  <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">Quiz Module Completion</h3>
                    <p className="text-gray-300 text-sm mb-3">After completing all quizzes, mark the entire module as complete:</p>
                    <div className="space-y-2">
                      {getAssignedPodcasts().map((podcast) => {
                        return (
                          <div key={podcast.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-white">{podcast.title}</h3>
                                <p className="text-xs text-gray-400">Quiz</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">100%</span>
                              {/* Show checkmark when completed */}
                              <div className="flex-shrink-0 ml-2">
                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Complete Module Button */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={async () => {
                            try {
                              // Mark all quizzes as 100% complete
                              const quizzes = getAssignedPodcasts();
                              for (const podcast of quizzes) {
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  podcast.id,
                                  100, // playback position
                                  100, // duration
                                  100  // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [podcast.id]: {
                                    id: podcast.id,
                                    user_id: userId || '',
                                    podcast_id: podcast.id,
                                    playback_position: 100,
                                    duration: 100,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                              }
                              
                              alert('All quizzes marked as complete!');
                              // Refresh progress to update UI
                              setTimeout(() => {
                                loadPodcastProgress();
                              }, 500);
                            } catch (error) {
                              console.error('Error marking quizzes as complete:', error);
                              alert('Error marking modules as complete');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark Entire Quiz Module Complete
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Video Completion Panel */}
                  <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">Video Module Completion</h3>
                    <p className="text-gray-300 text-sm mb-3">After watching all videos, mark the entire module as complete:</p>
                    <div className="space-y-2">
                      {getAssignedPodcasts().map((podcast) => {
                        return (
                          <div key={podcast.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                                <Film className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-white">{podcast.title}</h3>
                                <p className="text-xs text-gray-400">Video</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">100%</span>
                              {/* Show checkmark when completed */}
                              <div className="flex-shrink-0 ml-2">
                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Complete Module Button */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={async () => {
                            try {
                              // Mark all video podcasts as 100% complete
                              const videoPodcasts = getAssignedPodcasts().filter(p => p.is_youtube_video);
                              for (const podcast of videoPodcasts) {
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  podcast.id,
                                  1800, // playback position (30 minutes default)
                                  1800, // duration (30 minutes default)
                                  100   // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [podcast.id]: {
                                    id: podcast.id,
                                    user_id: userId || '',
                                    podcast_id: podcast.id,
                                    playback_position: 1800,
                                    duration: 1800,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                              }
                              
                              alert('All video modules marked as complete!');
                              // Refresh progress to update UI
                              setTimeout(() => {
                                loadPodcastProgress();
                              }, 500);
                            } catch (error) {
                              console.error('Error marking video modules as complete:', error);
                              alert('Error marking modules as complete');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark Entire Video Module Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {podcast.is_youtube_video ? (
              <div className="w-full">
                <div className="relative">
                  <iframe
                    width="100%"
                    height="400"
                    src={`https://www.youtube.com/embed/${podcast.youtube_video_id}`}
                    title={podcast.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                          <Film className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-white">{podcast.title}</h3>
                          <p className="text-xs text-gray-400">Video</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-1">100%</span>
                        {/* Show checkmark when completed */}
                        <div className="flex-shrink-0 ml-2">
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs">{completion}% completed</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="relative">
                  <audio
                    controls
                    className="w-full"
                    src={podcast.audio_url}
                    onTimeUpdate={(e) => {
                      const audio = e.target as HTMLAudioElement;
                      const progress = (audio.currentTime / audio.duration) * 100;
                      setCompletion(progress);
                    }}
                    onEnded={() => {
                      setCompletion(100);
                    }}
                  ></audio>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                          <MusicNote className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-white">{podcast.title}</h3>
                          <p className="text-xs text-gray-400">Audio</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${completion}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-1">{completion.toFixed(0)}%</span>
                        {/* Show checkmark when completed */}
                        <div className="flex-shrink-0 ml-2">
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs">{completion}% completed</p>
                  </div>
                </div>
              </div>
            )}
            {podcast.is_youtube_video ? (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    try {
                      // Mark as 100% complete
                      await supabaseHelpers.savePodcastProgressWithRetry(
                        userId || '',
                        podcast.id,
                        1800, // playback position (30 minutes default)
                        1800, // duration (30 minutes default)
                        100   // progress percent
                      );
                      
                      // Update local state
                      setPodcastProgress(prev => ({
                        ...prev,
                        [podcast.id]: {
                          id: podcast.id,
                          user_id: userId || '',
                          podcast_id: podcast.id,
                          playback_position: 1800,
                          duration: 1800,
                          progress_percent: 100,
                          last_played_at: new Date().toISOString()
                        }
                      }));
                      
                      alert(`${podcast.title} marked as complete!`);
                      // Refresh progress to update UI
                      setTimeout(() => {
                        loadPodcastProgress();
                      }, 500);
                    } catch (error) {
                      console.error('Error marking video as complete:', error);
                      alert('Error marking content as complete');
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Complete
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    try {
                      // Mark as 100% complete
                      await supabaseHelpers.savePodcastProgressWithRetry(
                        userId || '',
                        podcast.id,
                        1800, // playback position (30 minutes default)
                        1800, // duration (30 minutes default)
                        100   // progress percent
                      );
                      
                      // Update local state
                      setPodcastProgress(prev => ({
                        ...prev,
                        [podcast.id]: {
                          id: podcast.id,
                          user_id: userId || '',
                          podcast_id: podcast.id,
                          playback_position: 1800,
                          duration: 1800,
                          progress_percent: 100,
                          last_played_at: new Date().toISOString()
                        }
                      }));
                      
                      alert(`${podcast.title} marked as complete!`);
                      // Refresh progress to update UI
                      setTimeout(() => {
                        loadPodcastProgress();
                      }, 500);
                    } catch (error) {
                      console.error('Error marking video as complete:', error);
                      alert('Error marking content as complete');
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Complete
                </button>
              </div>
            )}

            {/* Audio Tab */}
            {activeTab === 'audio' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Audio Content</h2>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Audio List - Left Side */}
                  <div className="lg:w-1/2">
                    <div className="space-y-3">
                      {(() => {
                        const assignedPodcasts = getAssignedPodcasts().filter(p => !p.is_youtube_video);
                        console.log('Rendering audio tab, assigned podcasts count:', assignedPodcasts.length);
                        return assignedPodcasts.length > 0 ? 
                          assignedPodcasts.map(podcast => {
                            const completion = getPodcastCompletion(podcast.id);
                            
                            return (
                              <div 
                                key={podcast.id} 
                                className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                  currentPodcast?.id === podcast.id 
                                    ? 'bg-gray-800 border border-blue-500' 
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => handlePlayPodcast(podcast)}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                      <Headphones className="h-5 w-5 text-blue-400" />
                                    </div>
                                  </div> 
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{podcast.title}</h3>
                                    <p className="text-xs text-gray-400">Audio content</p>
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
                            <div className="text-center py-8 text-gray-400">
                              <Headphones className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">No Audio Content</h3>
                              <p className="text-gray-400">No audio content has been assigned to you for this course.</p>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                  
                  {/* Audio Player - Right Side */}
                  <div className="lg:w-1/2">
                    {currentPodcast && !currentPodcast.is_youtube_video ? (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-white mb-2">{currentPodcast.title}</h3>
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
                        {/* Complete Button for Audio */}
                        <div className="mt-4">
                          <button
                            onClick={async () => {
                              try {
                                // Mark as 100% complete
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  currentPodcast.id,
                                  100, // playback position
                                  100, // duration
                                  100  // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [currentPodcast.id]: {
                                    id: currentPodcast.id,
                                    user_id: userId || '',
                                    podcast_id: currentPodcast.id,
                                    playback_position: 100,
                                    duration: 100,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                                
                                alert(`${currentPodcast.title} marked as complete!`);
                                // Refresh progress to update UI
                                setTimeout(() => {
                                  loadPodcastProgress();
                                }, 500);
                              } catch (error) {
                                console.error('Error marking audio as complete:', error);
                                alert('Error marking content as complete');
                              }
                            }}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Mark Audio Module Complete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <Headphones className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Select an Audio File</h3>
                        <p className="text-gray-400">Choose an audio file from the list to play it here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Video Tab */}
            {activeTab === 'video' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Video Content</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setVideoViewMode('list')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        videoViewMode === 'list'
                          ? 'bg-blue-700 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      List View
                    </button>
                    <button
                      onClick={() => setVideoViewMode('tile')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        videoViewMode === 'tile'
                          ? 'bg-blue-700 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Tile View
                    </button>
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Video List - Left Side */}
                  <div className={currentPodcast && currentPodcast.is_youtube_video ? "lg:w-1/2" : "w-full"}>
                    {(() => {
                      const assignedPodcasts = getAssignedPodcasts().filter(p => p.is_youtube_video);
                      console.log('Rendering video tab, assigned podcasts count:', assignedPodcasts.length);
                      return assignedPodcasts.length > 0 ? 
                        assignedPodcasts.map(podcast => {
                          const completion = getPodcastCompletion(podcast.id);
                          
                          return (
                            <div 
                              key={podcast.id} 
                              className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-800 ${
                                currentPodcast?.id === podcast.id 
                                  ? 'bg-gray-800 border border-blue-500' 
                                  : 'bg-gray-800'
                              }`}
                              onClick={() => handlePlayPodcast(podcast)}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 mr-3">
                                  <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                                    <Youtube className="h-5 w-5 text-blue-400" />
                                  </div>
                                </div> 
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium text-white truncate">{podcast.title}</h3>
                                  <p className="text-xs text-gray-400">Video content</p>
                                  {completion > 0 && (
                                    <div className="ml-2 flex items-center">
                                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${completion}%` }}></div>
                                      </div>
                                      <span className="text-xs text-gray-500 ml-1">{completion}%</span>
                                    </div>
                                  )}
                                </div>
                                {/* Show checkmark when completed */}
                                {completion >= 100 && (
                                  <div className="flex-shrink-0 ml-2">
                                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="text-center py-8 text-gray-400">
                            <Youtube className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No Video Content</h3>
                            <p className="text-gray-400">No video content has been assigned to you for this course.</p>
                          </div>
                        );
                    })()}
                  </div>
                  
                  {/* Video Player - Right Side */}
                  <div className="lg:w-1/2">
                    {currentPodcast && currentPodcast.is_youtube_video ? (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-white mb-2">{currentPodcast.title}</h3>
                        <div className="mt-4">
                          {renderYouTubePlayer(currentPodcast.video_url)}
                        </div>
                        {/* Complete Button for Video */}
                        <div className="mt-4">
                          <button
                            onClick={async () => {
                              try {
                                // Mark as 100% complete
                                await supabaseHelpers.savePodcastProgressWithRetry(
                                  userId || '',
                                  currentPodcast.id,
                                  1800, // playback position (30 minutes default)
                                  1800, // duration (30 minutes default)
                                  100   // progress percent
                                );
                                
                                // Update local state
                                setPodcastProgress(prev => ({
                                  ...prev,
                                  [currentPodcast.id]: {
                                    id: currentPodcast.id,
                                    user_id: userId || '',
                                    podcast_id: currentPodcast.id,
                                    playback_position: 1800,
                                    duration: 1800,
                                    progress_percent: 100,
                                    last_played_at: new Date().toISOString()
                                  }
                                }));
                                
                                alert(`${currentPodcast.title} marked as complete!`);
                                // Refresh progress to update UI
                                setTimeout(() => {
                                  loadPodcastProgress();
                                }, 500);
                              } catch (error) {
                                console.error('Error marking video as complete:', error);
                                alert('Error marking content as complete');
                              }
                            }}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Mark Video Module Complete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <Youtube className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Select a Video</h3>
                        <p className="text-gray-400">Choose a video from the list to play it here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Docs Tab */}
            {activeTab === 'docs' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Documents</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const assignedDocs = getAssignedPDFs('docs');
                    console.log('Rendering docs tab, assigned docs count:', assignedDocs.length);
                    return assignedDocs.length > 0 ? (
                      <>
                        {assignedDocs.map((pdf: PDF) => (
                          <div key={pdf.id} className="border border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-800">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 p-2 bg-blue-900 rounded-lg">
                                <FileText className="h-8 w-8 text-blue-400" />
                              </div>
                              <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-white mb-1">{pdf.title}</h3>
                                <p className="text-xs text-gray-400 mb-3">
                                  {(pdf && pdf.content_type === 'docs') ? 'PDF Document' : 'Template/Document'}
                                </p>
                                <a 
                                  href={pdf.pdf_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-700 hover:bg-blue-600"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    // Open in new window/tab for view-only
                                    window.open(pdf.pdf_url, '_blank');
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {(pdf && pdf.content_type === 'docs') ? 'View Document' : 'View Template'}
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-400 col-span-full">
                        <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No Documents</h3>
                        <p className="text-gray-400">No documents have been assigned to you for this course.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Images & Infographics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const assignedImages = getAssignedPDFs('images');
                    console.log('Rendering images tab, assigned images count:', assignedImages.length);
                    return assignedImages.length > 0 ? (
                      <>
                        {assignedImages.map((pdf: PDF) => (
                          <div key={pdf.id} className="border border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-800">
                            <div className="aspect-video bg-gray-700 rounded-lg mb-3 overflow-hidden">
                              <img 
                                src={pdf.pdf_url} 
                                alt={pdf.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <h3 className="text-sm font-medium text-white mb-1 truncate">{pdf.title}</h3>
                            <p className="text-xs text-gray-400 mb-2">Image</p>
                            <a 
                              href={pdf.pdf_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-700 hover:bg-blue-600"
                              onClick={(e) => {
                                e.preventDefault();
                                // Open in new window/tab for view-only
                                window.open(pdf.pdf_url, '_blank');
                              }}
                            >
                              <Image className="h-3 w-3 mr-1" />
                              View Image
                            </a>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-400 col-span-full">
                        <Image className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No Images</h3>
                        <p className="text-gray-400">No images or infographics have been assigned to you for this course.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Templates & Other Content</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const assignedTemplates = getAssignedPDFs('templates');
                    console.log('Rendering templates tab, assigned templates count:', assignedTemplates.length);
                    return assignedTemplates.length > 0 ? (
                      <>
                        {assignedTemplates.map((pdf: PDF) => (
                          <div key={pdf.id} className="border border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-800">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 p-2 bg-blue-900 rounded-lg">
                                <FileText className="h-8 w-8 text-blue-400" />
                              </div>
                              <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-white mb-1">{pdf.title}</h3>
                                <p className="text-xs text-gray-400 mb-3">
                                  {(pdf && pdf.content_type === 'templates') ? 'Template/Document' : 'PDF Document'}
                                </p>
                                <a 
                                  href={pdf.pdf_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-700 hover:bg-blue-600"
                                  onClick={(e) => {
                                    // Allow download for templates
                                    // No need to prevent default, let it download normally
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {(pdf && pdf.content_type === 'templates') ? 'Download Template' : 'View Document'}
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-400 col-span-full">
                        <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No Templates</h3>
                        <p className="text-gray-400">No templates or other content have been assigned to you for this course.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Quiz Tab */}
            {activeTab === 'quizzes' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Quizzes</h2>
                {!checkAllModulesCompleted() ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <div className="text-yellow-500 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-yellow-800 mb-2">Modules Not Completed</h3>
                    <p className="text-yellow-700 mb-4">You must complete all audio and video modules before accessing quizzes.</p>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-600">Complete all audio and video content in the Audio and Video tabs to unlock quizzes.</p>
                    </div>
                  </div>
                ) : quizResults ? (
                  <QuizResults
                    passed={quizResults.passed}
                    score={quizResults.score}
                    userName={userName}
                    courseName={course?.title || 'Course'}
                    onRetake={handleRetakeQuiz}
                    onExit={handleExitQuiz}
                  />
                ) : showQuiz || showFinalQuiz ? (
                  <QuizComponent
                    courseId={courseId || ''}
                    categoryId={quizCategoryId || undefined}
                    categoryName={quizCategoryName || undefined}
                    isFinalQuiz={showFinalQuiz}
                    onComplete={handleQuizComplete}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Quiz Content */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">Module Quiz</h3>
                      <p className="text-gray-300 mb-4">Test your knowledge on the course modules.</p>
                      <button
                        onClick={() => startModuleQuiz('module1', 'Module 1')}
                        className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Start Module 1 Quiz
                      </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">Final Quiz</h3>
                      <p className="text-gray-300 mb-4">Complete the final quiz to finish the course.</p>
                      <button
                        onClick={startFinalQuiz}
                        className={`px-3 py-1 rounded text-sm ${
                          checkModuleQuizzesCompleted() 
                            ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                            : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        }`}
                        disabled={!checkModuleQuizzesCompleted()}
                      >
                        Start Final Quiz
                      </button>
                      {!checkModuleQuizzesCompleted() && (
                        <p className="text-xs text-gray-400 mt-2">
                          Complete all module quizzes to unlock the final quiz
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


          </>
        ) : (
          <div className="text-center py-12 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-white">Course not found</h3>
            <p className="mt-1 text-sm text-gray-300">
              The requested course could not be found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
