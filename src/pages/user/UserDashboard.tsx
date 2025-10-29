import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Headphones, 
  FileText, 
  Image, 
  File,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  BarChart3,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
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
  level?: string;
}

interface Podcast {
  id: string;
  title: string;
  course_id: string;
  category_id: string;
  category: string;
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
  created_by: string | null;
  created_at: string;
}

interface UserCourse {
  user_id: string;
  course_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  courses: Course;
}

// Add this helper function to determine file type from URL
const getFileType = (url: string): 'pdf' | 'image' | 'template' => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  const pdfExtensions = ['pdf'];
  
  if (imageExtensions.includes(extension)) {
    return 'image';
  } else if (pdfExtensions.includes(extension)) {
    return 'pdf';
  } else {
    return 'template';
  }
};

// Add this helper function to get file extension
const getFileExtension = (url: string): string => {
  return url.split('.').pop()?.toUpperCase() || 'FILE';
};

export default function UserDashboard({ userEmail = '' }: { userEmail?: string }) {
  const [userId, setUserId] = useState<string>('');
  const [podcastProgress, setPodcastProgress] = useState<Record<string, number>>({});
  const [podcastDurations, setPodcastDurations] = useState<Record<string, number>>({});
  const [supabaseData, setSupabaseData] = useState<{
    courses: Course[];
    categories: Category[];
    podcasts: Podcast[];
    pdfs: PDF[];
    userCourses: UserCourse[];
  }>({
    courses: [],
    categories: [],
    podcasts: [],
    pdfs: [],
    userCourses: []
  });
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPodcastPlayerOpen, setIsPodcastPlayerOpen] = useState(false);
  const [isPodcastPlayerMinimized, setIsPodcastPlayerMinimized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageCache, setGeneratedImageCache] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Load podcast progress
  const loadPodcastProgress = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error loading podcast progress:', error);
        setPodcastProgress({});
        setPodcastDurations({});
        return;
      }
      
      if (data && data.length > 0) {
        const progressMap: Record<string, any> = {};
        const durationMap: Record<string, number> = {};
        
        data.forEach(item => {
          progressMap[item.podcast_id] = item.progress_percent || 0;
          durationMap[item.podcast_id] = typeof item.duration === 'string' ? 
            parseFloat(item.duration) : (item.duration || 0);
        });
        
        setPodcastProgress(progressMap);
        setPodcastDurations(durationMap);
      } else {
        setPodcastProgress({});
        setPodcastDurations({});
      }
    } catch (error) {
      console.error('Exception loading podcast progress:', error);
      setPodcastProgress({});
      setPodcastDurations({});
    }
  }, [userId]);

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      if (!userId) return;
      
      setError(null);
      
      // Load all data in parallel
      const [categoriesData, podcastsData, pdfsData, userCoursesData] = await Promise.all([
        supabaseHelpers.getContentCategories(), 
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getUserCourses(userId)
      ]);
      
      // Load courses using regular supabase client to respect RLS policies
      let coursesData = [];
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching courses with RLS:', error);
          coursesData = [];
        } else {
          coursesData = data || [];
        }
      } catch (courseError) {
        console.error('Exception fetching courses:', courseError);
        coursesData = [];
      }
      
      // Filter courses to show only courses assigned to this specific user
      const assignedCourseIds = new Set(userCoursesData.map(uc => uc.course_id));
      const assignedCourses = (coursesData || []).filter(course => 
        assignedCourseIds.has(course.id)
      );
      
      setSupabaseData(prev => ({
        ...prev,
        courses: assignedCourses,
        categories: categoriesData || [],
        podcasts: podcastsData,
        pdfs: pdfsData,
        userCourses: userCoursesData || []
      }));
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    }
  }, [userId]);

  // Real-time sync for all relevant tables
  useRealtimeSync('user-courses', loadUserData);
  useRealtimeSync('courses', loadUserData);
  useRealtimeSync('podcasts', loadUserData);
  useRealtimeSync('content-categories', loadUserData);
  useRealtimeSync('pdfs', loadUserData);
  useRealtimeSync('podcast-progress', loadPodcastProgress);

  // Get user ID on component mount
  useEffect(() => {
    const checkAuthAndUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setError('Authentication failed. Please log in again.');
          setLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        setUserId(session.user.id);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setError('Authentication check failed. Please log in again.');
        setLoading(false);
      }
    };
    
    checkAuthAndUser();
  }, []);

  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setError('Authentication failed. Please log in again.');
          setLoading(false);
          return;
        }
        
        if (session.user) {
          setUserId(session.user.id);
          setIsAuthenticated(true);
          
          // Load all data in parallel
          await Promise.all([
            loadUserData(),
            loadPodcastProgress()
          ]);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to initialize dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated) {
      initializeDashboard();
    }
  }, [isAuthenticated]);
  
  // Load user data when userId is available
  useEffect(() => {
    if (userId) {
      loadUserData();
      loadPodcastProgress();
    }
  }, [userId]);
  
  // Load user profile when userId is available
  useEffect(() => {
    if (userId) {
      const fetchUserProfile = async () => {
        try {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (error) {
            console.error('Error fetching user profile:', error);
          } else {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
      
      fetchUserProfile();
    }
  }, [userId]);

  // Build course hierarchy for display with better categorization
  const courseHierarchy = React.useMemo(() => {
    const assignedCourseIds = new Set(supabaseData.userCourses.map(uc => uc.course_id));
    const assignedCourses = supabaseData.courses.filter(course => 
      assignedCourseIds.has(course.id)
    );
    
    return assignedCourses.map(course => {
      const courseCategories = supabaseData.categories.filter(cat => cat.course_id === course.id);
      
      const categoriesWithPodcasts = courseCategories.map(category => {
        const categoryPodcasts = supabaseData.podcasts.filter(
          podcast => podcast.category_id === category.id
        );
        return {
          ...category,
          podcasts: categoryPodcasts
        };
      });
      
      const uncategorizedPodcasts = supabaseData.podcasts.filter(
        podcast => podcast.course_id === course.id && !podcast.category_id
      );
      
      const coursePDFs = supabaseData.pdfs.filter(pdf => pdf.course_id === course.id);
      
      // Categorize documents by file type
      const documents = coursePDFs.map(pdf => ({
        ...pdf,
        fileType: getFileType(pdf.pdf_url),
        fileExtension: getFileExtension(pdf.pdf_url)
      }));
      
      const pdfDocuments = documents.filter(doc => doc.fileType === 'pdf');
      const imageDocuments = documents.filter(doc => doc.fileType === 'image');
      const templateDocuments = documents.filter(doc => doc.fileType === 'template');
      
      return {
        ...course,
        categories: categoriesWithPodcasts,
        uncategorizedPodcasts,
        coursePDFs: documents,
        pdfDocuments,
        imageDocuments,
        templateDocuments,
        totalPodcasts: categoriesWithPodcasts.reduce(
          (sum, cat) => sum + cat.podcasts.length, 0
        ) + uncategorizedPodcasts.length,
        totalDocuments: documents.length
      };
    });
  }, [supabaseData.courses, supabaseData.categories, supabaseData.podcasts, supabaseData.pdfs, supabaseData.userCourses]);

  // Toggle course expansion
  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Handle course selection
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveModule('dashboard');
  };

  // Generate course image using StabilityAI
  const generateCourseImage = async (course: Course) => {
    if (!stabilityAI.isConfigured()) {
      console.warn('StabilityAI not configured');
      return null;
    }

    // Check if image is already cached
    if (generatedImageCache[course.id]) {
      return generatedImageCache[course.id];
    }

    setIsGeneratingImage(true);
    try {
      const base64Image = await stabilityAI.generateCourseImage(course.title);
      if (base64Image) {
        // Cache the generated image
        setGeneratedImageCache(prev => ({
          ...prev,
          [course.id]: base64Image
        }));
        return base64Image;
      }
      return null;
    } catch (error) {
      console.error('Error generating course image:', error);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Find the selected course in courseHierarchy
  const selectedCourseHierarchy = courseHierarchy.find(c => c.id === selectedCourse?.id);

  // Handle play podcast
  const handlePlayPodcast = (podcast: Podcast) => {
    setCurrentPodcast(podcast);
    setIsPodcastPlayerOpen(true);
    setIsPodcastPlayerMinimized(false);
  };

  // Handle progress update
  const handleProgressUpdate = (progress: number, duration: number, currentTime: number) => {
    if (!userId) return;
    supabaseHelpers.savePodcastProgress(userId, currentPodcast?.id || '', currentTime, duration);
  };

  // Calculate total play time for a course
  const calculateTotalPlayTime = (courseId: string) => {
    const course = courseHierarchy.find(c => c.id === courseId);
    if (!course) return '0h 0m';
    
    const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === courseId);
    let totalSeconds = 0;
    
    coursePodcasts.forEach(podcast => {
      const duration = podcastDurations[podcast.id] || 0;
      totalSeconds += duration;
    });
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Calculate completed podcasts for a course
  const calculateCompletedPodcasts = (courseId: string) => {
    const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === courseId);
    return coursePodcasts.filter(podcast => (podcastProgress[podcast.id] || 0) >= 100).length;
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-700 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no course is selected, show course selection
  if (!selectedCourse) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Select a Course</h1>
            <p className="mt-1 text-sm text-[#a0a0a0]">
              Choose a course to begin your learning journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courseHierarchy.map((course) => (
              <div 
                key={course.id} 
                className="bg-[#1e1e1e] rounded-lg border border-[#333333] overflow-hidden cursor-pointer hover:bg-[#252525]"
                onClick={() => handleSelectCourse(course)}
              >
                {course.image_url ? (
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-full h-48 object-cover"
                  />
                ) : generatedImageCache[course.id] ? (
                  <img 
                    src={`data:image/png;base64,${generatedImageCache[course.id]}`} 
                    alt={course.title} 
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="bg-[#252525] h-48 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-[#a0a0a0]" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-medium text-white">{course.title}</h3>
                  <p className="mt-2 text-sm text-[#a0a0a0] line-clamp-2">
                    {course.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      course.level === 'Basics' 
                        ? 'bg-green-900/30 text-green-400' 
                        : course.level === 'Intermediate' 
                          ? 'bg-yellow-900/30 text-yellow-400' 
                          : 'bg-red-900/30 text-red-400'
                    }`}>
                      {course.level}
                    </span>
                    <span className="text-sm text-[#a0a0a0]">
                      {course.totalPodcasts + course.totalDocuments} items
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {courseHierarchy.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-[#a0a0a0]" />
              <h3 className="mt-2 text-sm font-medium text-white">No courses assigned</h3>
              <p className="mt-1 text-sm text-[#a0a0a0]">
                You don't have any courses assigned yet. Contact your administrator.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Course detail view
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section with Course Image */}
        <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6 mb-8">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/4 mb-4 md:mb-0 md:mr-6">
              {selectedCourse?.image_url ? (
                <img 
                  src={selectedCourse.image_url} 
                  alt={selectedCourse.title} 
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : generatedImageCache[selectedCourse?.id || ''] ? (
                <img 
                  src={`data:image/png;base64,${generatedImageCache[selectedCourse?.id || '']}`} 
                  alt={selectedCourse?.title} 
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="bg-[#252525] h-48 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-[#a0a0a0]" />
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={async () => {
                    if (selectedCourse) {
                      const base64Image = await generateCourseImage(selectedCourse);
                      if (base64Image) {
                        // Update the course with the generated image in Supabase
                        try {
                          const { data, error } = await supabase
                            .from('courses')
                            .update({ image_url: `data:image/png;base64,${base64Image}` })
                            .eq('id', selectedCourse.id);
                          
                          if (error) {
                            console.error('Error updating course image:', error);
                          } else {
                            // Refresh the course data
                            loadUserData();
                          }
                        } catch (error) {
                          console.error('Error saving course image:', error);
                        }
                      }
                    }
                  }}
                  disabled={isGeneratingImage || !stabilityAI.isConfigured()}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingImage ? 'Generating...' : 'Generate Course Image'}
                </button>
                <p className="mt-2 text-xs text-[#a0a0a0]">
                  {stabilityAI.isConfigured() 
                    ? 'Generate a professional image based on course name' 
                    : 'StabilityAI not configured'}
                </p>
              </div>
            </div>
            <div className="md:w-3/4">
              <h1 className="text-3xl font-bold text-white">{selectedCourse?.title}</h1>
              <p className="mt-2 text-lg text-[#a0a0a0]">{selectedCourse?.description}</p>
              <div className="mt-4 flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCourse?.level === 'Basics' 
                    ? 'bg-green-900/30 text-green-400' 
                    : selectedCourse?.level === 'Intermediate' 
                      ? 'bg-yellow-900/30 text-yellow-400' 
                      : 'bg-red-900/30 text-red-400'
                }`}>
                  Level: {selectedCourse?.level}
                </span>
                <span className="inline-flex items-center text-sm text-[#a0a0a0]">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {(selectedCourseHierarchy?.categories.length || 0) + (selectedCourseHierarchy?.uncategorizedPodcasts.length ? 1 : 0)} Modules
                </span>
                <span className="inline-flex items-center text-sm text-[#a0a0a0]">
                  <Clock className="h-4 w-4 mr-1" />
                  {selectedCourse?.id ? calculateTotalPlayTime(selectedCourse.id) : '0h 0m'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] mb-8 overflow-x-auto">
          <div className="flex space-x-1 p-1">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                activeModule === 'dashboard'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => setActiveModule('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                activeModule === 'audios'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => setActiveModule('audios')}
            >
              Audios
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                activeModule === 'videos'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => setActiveModule('videos')}
            >
              Videos
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                activeModule === 'docs'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => setActiveModule('docs')}
            >
              Docs
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                activeModule === 'images'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => setActiveModule('images')}
            >
              Images
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                activeModule === 'templates'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => setActiveModule('templates')}
            >
              Templates
            </button>
          </div>
        </div>

        {/* Module Content */}
        {activeModule === 'dashboard' && (
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6">
            <h2 className="text-xl font-bold text-white mb-6">Course Modules</h2>
            <div className="space-y-4">
              {selectedCourseHierarchy?.categories.map((category) => (
                <div key={category.id} className="border border-[#333333] rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCategoryExpansion(category.id)}
                  >
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedCategories[category.id] ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">{category.name}</h3>
                    </div>
                    <span className="text-sm text-[#a0a0a0]">
                      {category.podcasts.length} items
                    </span>
                  </div>
                  
                  {expandedCategories[category.id] && (
                    <div className="pl-8 pr-4 pb-4">
                      {category.podcasts.map((podcast) => (
                        <div 
                          key={podcast.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg mb-2 hover:bg-[#333333]"
                          onClick={() => handlePlayPodcast(podcast)}
                        >
                          <div className="flex items-center">
                            {podcast.is_youtube_video ? (
                              <Play className="h-4 w-4 text-red-500 mr-3" />
                            ) : (
                              <Headphones className="h-4 w-4 text-[#8b5cf6] mr-3" />
                            )}
                            <div>
                              <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">
                                {podcast.is_youtube_video ? 'YouTube Video' : 'Audio Content'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {podcastProgress[podcast.id] > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8b5cf6]/20 text-[#8b5cf6] mr-2">
                                {Math.round(podcastProgress[podcast.id] || 0)}%
                              </span>
                            )}
                            <Play className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {(selectedCourseHierarchy?.uncategorizedPodcasts?.length || 0) > 0 && (
                <div className="border border-[#333333] rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCategoryExpansion('uncategorized')}
                  >
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedCategories['uncategorized'] ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">Other Content</h3>
                    </div>
                    <span className="text-sm text-[#a0a0a0]">
                      {selectedCourseHierarchy?.uncategorizedPodcasts?.length || 0} items
                    </span>
                  </div>
                  
                  {expandedCategories['uncategorized'] && (
                    <div className="pl-8 pr-4 pb-4">
                      {selectedCourseHierarchy?.uncategorizedPodcasts?.map((podcast) => (
                        <div 
                          key={podcast.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg mb-2 hover:bg-[#333333]"
                          onClick={() => handlePlayPodcast(podcast)}
                        >
                          <div className="flex items-center">
                            {podcast.is_youtube_video ? (
                              <Play className="h-4 w-4 text-red-500 mr-3" />
                            ) : (
                              <Headphones className="h-4 w-4 text-[#8b5cf6] mr-3" />
                            )}
                            <div>
                              <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">
                                {podcast.is_youtube_video ? 'YouTube Video' : 'Audio Content'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {podcastProgress[podcast.id] > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8b5cf6]/20 text-[#8b5cf6] mr-2">
                                {Math.round(podcastProgress[podcast.id] || 0)}%
                              </span>
                            )}
                            <Play className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {(selectedCourseHierarchy?.coursePDFs?.length || 0) > 0 && (
                <div className="border border-[#333333] rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCategoryExpansion('documents')}
                  >
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedCategories['documents'] ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">Documents</h3>
                    </div>
                    <span className="text-sm text-[#a0a0a0]">
                      {selectedCourseHierarchy?.coursePDFs?.length || 0} items
                    </span>
                  </div>
                  
                  {expandedCategories['documents'] && (
                    <div className="pl-8 pr-4 pb-4">
                      {selectedCourseHierarchy?.coursePDFs?.map((pdf) => (
                        <div 
                          key={pdf.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg mb-2 hover:bg-[#333333]"
                          onClick={() => window.open(pdf.pdf_url, '_blank')}
                        >
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-purple-500 mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-white">{pdf.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">PDF Document</p>
                            </div>
                          </div>
                          <File className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeModule === 'audios' && (
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6">
            <h2 className="text-xl font-bold text-white mb-6">Audio Content</h2>
            <div className="space-y-4">
              {selectedCourseHierarchy?.categories.map((category) => (
                <div key={category.id} className="border border-[#333333] rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCategoryExpansion(category.id)}
                  >
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedCategories[category.id] ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">{category.name}</h3>
                    </div>
                    <span className="text-sm text-[#a0a0a0]">
                      {(category.podcasts.filter(p => !p.is_youtube_video)).length} audio files
                    </span>
                  </div>
                  
                  {expandedCategories[category.id] && (
                    <div className="pl-8 pr-4 pb-4">
                      {category.podcasts
                        .filter(podcast => !podcast.is_youtube_video)
                        .map((podcast) => (
                          <div 
                            key={podcast.id} 
                            className="flex items-center justify-between p-3 bg-[#252525] rounded-lg mb-2 hover:bg-[#333333]"
                            onClick={() => handlePlayPodcast(podcast)}
                          >
                            <div className="flex items-center">
                              <Headphones className="h-4 w-4 text-[#8b5cf6] mr-3" />
                              <div>
                                <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                                <p className="text-xs text-[#a0a0a0]">
                                  Audio Content
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {podcastProgress[podcast.id] > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8b5cf6]/20 text-[#8b5cf6] mr-2">
                                  {Math.round(podcastProgress[podcast.id] || 0)}%
                                </span>
                              )}
                              <Play className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
              
              {(selectedCourseHierarchy?.uncategorizedPodcasts?.filter(podcast => !podcast.is_youtube_video).length || 0) > 0 && (
                <div className="border border-[#333333] rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCategoryExpansion('uncategorized-audios')}
                  >
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedCategories['uncategorized-audios'] ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">Other Audio Content</h3>
                    </div>
                    <span className="text-sm text-[#a0a0a0]">
                      {selectedCourseHierarchy?.uncategorizedPodcasts?.filter(p => !p.is_youtube_video).length || 0} items
                    </span>
                  </div>
                  
                  {expandedCategories['uncategorized-audios'] && (
                    <div className="pl-8 pr-4 pb-4">
                      {selectedCourseHierarchy?.uncategorizedPodcasts
                        ?.filter(podcast => !podcast.is_youtube_video)
                        .map((podcast) => (
                          <div 
                            key={podcast.id} 
                            className="flex items-center justify-between p-3 bg-[#252525] rounded-lg mb-2 hover:bg-[#333333]"
                            onClick={() => handlePlayPodcast(podcast)}
                          >
                            <div className="flex items-center">
                              <Headphones className="h-4 w-4 text-[#8b5cf6] mr-3" />
                              <div>
                                <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                                <p className="text-xs text-[#a0a0a0]">
                                  Audio Content
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {podcastProgress[podcast.id] > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8b5cf6]/20 text-[#8b5cf6] mr-2">
                                  {Math.round(podcastProgress[podcast.id] || 0)}%
                                </span>
                              )}
                              <Play className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeModule === 'videos' && (
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6">
            <h2 className="text-xl font-bold text-white mb-6">Video Content</h2>
            <div className="space-y-4">
              {selectedCourseHierarchy?.categories.map((category) => (
                <div key={category.id} className="border border-[#333333] rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCategoryExpansion(category.id)}
                  >
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedCategories[category.id] ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">{category.name}</h3>
                    </div>
                    <span className="text-sm text-[#a0a0a0]">
                      {(category.podcasts.filter(p => p.is_youtube_video)).length} videos
                    </span>
                  </div>
                  
                  {expandedCategories[category.id] && (
                    <div className="pl-8 pr-4 pb-4">
                      {category.podcasts
                        .filter(podcast => podcast.is_youtube_video)
                        .map((podcast) => (
                          <div 
                            key={podcast.id} 
                            className="flex items-center justify-between p-3 bg-[#252525] rounded-lg mb-2 hover:bg-[#333333]"
                            onClick={() => window.open(podcast.video_url || '#', '_blank')}
                          >
                            <div className="flex items-center">
                              <Play className="h-4 w-4 text-red-500 mr-3" />
                              <div>
                                <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                                <p className="text-xs text-[#a0a0a0]">
                                  YouTube Video
                                </p>
                              </div>
                            </div>
                            <Play className="h-4 w-4 text-gray-400" />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
              
              {(selectedCourseHierarchy?.uncategorizedPodcasts?.filter(podcast => podcast.is_youtube_video).length || 0) > 0 && (
                <div className="border border-[#333333] rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCategoryExpansion('uncategorized-videos')}
                  >
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedCategories['uncategorized-videos'] ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">Other Videos</h3>
                    </div>
                    <span className="text-sm text-[#a0a0a0]">
                      {selectedCourseHierarchy?.uncategorizedPodcasts?.filter(p => p.is_youtube_video).length || 0} items
                    </span>
                  </div>
                  
                  {expandedCategories['uncategorized-videos'] && (
                    <div className="pl-8 pr-4 pb-4">
                      {selectedCourseHierarchy?.uncategorizedPodcasts
                        ?.filter(podcast => podcast.is_youtube_video)
                        .map((podcast) => (
                          <div 
                            key={podcast.id} 
                            className="flex items-center justify-between p-3 bg-[#252525] rounded-lg mb-2 hover:bg-[#333333]"
                            onClick={() => window.open(podcast.video_url || '#', '_blank')}
                          >
                            <div className="flex items-center">
                              <Play className="h-4 w-4 text-red-500 mr-3" />
                              <div>
                                <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                                <p className="text-xs text-[#a0a0a0]">
                                  YouTube Video
                                </p>
                              </div>
                            </div>
                            <Play className="h-4 w-4 text-gray-400" />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeModule === 'docs' && (
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6">
            <h2 className="text-xl font-bold text-white mb-6">Documents</h2>
            <div className="space-y-4">
              {(selectedCourseHierarchy?.pdfDocuments?.length || 0) > 0 ? (
                selectedCourseHierarchy?.pdfDocuments?.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-4 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                    onClick={() => window.open(doc.pdf_url, '_blank')}
                  >
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-purple-500 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-white">{doc.title}</h3>
                        <p className="text-sm text-[#a0a0a0]">PDF Document</p>
                      </div>
                    </div>
                    <File className="h-5 w-5 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">No documents available</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">
                    There are no documents in this course.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeModule === 'images' && (
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6">
            <h2 className="text-xl font-bold text-white mb-6">Images & Cheatsheets</h2>
            <div className="space-y-4">
              {(selectedCourseHierarchy?.imageDocuments?.length || 0) > 0 ? (
                selectedCourseHierarchy?.imageDocuments?.map((image) => (
                  <div 
                    key={image.id} 
                    className="flex items-center justify-between p-4 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                    onClick={() => window.open(image.pdf_url, '_blank')}
                  >
                    <div className="flex items-center">
                      <Image className="h-5 w-5 text-blue-500 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-white">{image.title}</h3>
                        <p className="text-sm text-[#a0a0a0]">{image.fileExtension} Image</p>
                      </div>
                    </div>
                    <Image className="h-5 w-5 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">No images available</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">
                    There are no images or cheatsheets in this course.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeModule === 'templates' && (
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333] p-6">
            <h2 className="text-xl font-bold text-white mb-6">Templates</h2>
            <div className="space-y-4">
              {(selectedCourseHierarchy?.templateDocuments?.length || 0) > 0 ? (
                selectedCourseHierarchy?.templateDocuments?.map((template) => (
                  <div 
                    key={template.id} 
                    className="flex items-center justify-between p-4 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                    onClick={() => window.open(template.pdf_url, '_blank')}
                  >
                    <div className="flex items-center">
                      <File className="h-5 w-5 text-yellow-500 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-white">{template.title}</h3>
                        <p className="text-sm text-[#a0a0a0]">{template.fileExtension} Template</p>
                      </div>
                    </div>
                    <File className="h-5 w-5 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <File className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">No templates available</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">
                    There are no templates in this course.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back to Course Selection */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setSelectedCourse(null)}
            className="inline-flex items-center px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#1e1e1e] hover:bg-[#252525]"
          >
            ← Back to Course Selection
          </button>
        </div>
      </div>

      {/* Podcast Player Modal */}
      {isPodcastPlayerOpen && currentPodcast && !isPodcastPlayerMinimized && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-2xl w-full border border-[#333333]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{currentPodcast.title}</h2>
              <button
                onClick={() => setIsPodcastPlayerMinimized(true)}
                className="text-gray-400 hover:text-white"
              >
                <ChevronDown className="h-6 w-6" />
              </button>
            </div>
            <audio
              src={currentPodcast.mp3_url}
              controls
              controlsList="nodownload noplaybackrate"
              className="w-full"
              onTimeUpdate={(e) => {
                const audio = e.currentTarget;
                const progress = Math.round((audio.currentTime / audio.duration) * 100);
                handleProgressUpdate(progress, audio.duration, audio.currentTime);
              }}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setIsPodcastPlayerOpen(false);
                  setCurrentPodcast(null);
                }}
                className="px-4 py-2 bg-[#252525] rounded-md text-white hover:bg-[#333333]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Podcast Player */}
      {isPodcastPlayerOpen && currentPodcast && isPodcastPlayerMinimized && (
        <div className="fixed bottom-0 right-0 bg-[#1e1e1e] shadow-lg rounded-tl-lg p-3 z-50 w-80 border border-[#333333] border-b-0 border-r-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium truncate text-white">{currentPodcast.title}</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsPodcastPlayerMinimized(false)}
                className="text-[#a0a0a0] hover:text-white"
              >
                Expand
              </button>
              <button
                onClick={() => {
                  setIsPodcastPlayerOpen(false);
                  setCurrentPodcast(null);
                }}
                className="text-[#a0a0a0] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <audio
            src={currentPodcast.mp3_url}
            controls
            controlsList="nodownload noplaybackrate"
            className="w-full"
            onTimeUpdate={(e) => {
              const audio = e.currentTarget;
              const progress = Math.round((audio.currentTime / audio.duration) * 100);
              handleProgressUpdate(progress, audio.duration, audio.currentTime);
            }}
          />
        </div>
      )}
    </div>
  );
}