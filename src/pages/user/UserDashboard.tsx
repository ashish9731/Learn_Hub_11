import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Headphones, 
  FileText, 
  Heart, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  ChevronDown, 
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  description: string;
  company_id: string | null;
  image_url: string | null;
  created_at: string;
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
  category: string;
  mp3_url: string;
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
  id: string;
  user_id: string;
  course_id: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  completed: boolean;
  completion_date: string | null;
  courses: Course;
}

export default function UserDashboard({ userEmail = '' }: { userEmail?: string }) {
  const [userId, setUserId] = useState<string>('');
  const [podcastProgress, setPodcastProgress] = useState<Record<string, number>>({});
  const [podcastDurations, setPodcastDurations] = useState<Record<string, number>>({});
  const [learningMetrics, setLearningMetrics] = useState({
    totalHours: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    averageCompletion: 0
  });
  const [supabaseData, setSupabaseData] = useState<{
    courses: Course[];
    categories: Category[];
    podcasts: Podcast[];
    pdfs: PDF[];
    likedPodcasts: string[];
    userCourses: UserCourse[];
  }>({
    courses: [],
    categories: [],
    podcasts: [],
    pdfs: [],
    likedPodcasts: [],
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
  const navigate = useNavigate();

  // Load user liked podcasts
  const loadUserLikedPodcasts = useCallback(async (currentUserId: string | null) => {
    try {
      if (!currentUserId) return [];
      
      const { data, error } = await supabase
        .from('podcast_likes')
        .select('podcast_id')
        .eq('user_id', currentUserId);
      
      if (error) {
        console.error('Error fetching podcast likes:', error);
        return [];
      }
      
      // Return an empty array if data is null or undefined
      return (data || []).map(like => like.podcast_id);
    } catch (error) {
      console.error('Error loading liked podcasts:', error);
      return [];
    }
  }, []);

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
        // Set empty progress if query fails
        setPodcastProgress({});
        setPodcastDurations({});
        return;
      }
      
      if (data && data.length > 0) {
        // Create a map of podcast_id to progress_percent
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
        // Set empty progress if no data
        setPodcastProgress({});
        setPodcastDurations({});
      }
    } catch (error) {
      console.error('Exception loading podcast progress:', error);
      // Set empty progress if exception occurs
      setPodcastProgress({});
      setPodcastDurations({});
    }
  }, [userId]);

  // Load learning metrics fallback
  const loadLearningMetricsFallback = useCallback(async (userId: string) => {
    try {
      // Try to calculate metrics manually
      const { data: progressData } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);

      const { data: coursesData } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', userId);

      const totalHours = (progressData || []).reduce((sum, progress) => {
        const duration = typeof progress.duration === 'string' ? parseFloat(progress.duration) : (progress.duration || 0);
        const progressPercent = progress.progress_percent || 0;
        return sum + ((duration * (progressPercent / 100)) / 3600);
      }, 0);

      setLearningMetrics({
        totalHours: Math.round(totalHours * 10) / 10,
        completedCourses: (coursesData || []).length,
        inProgressCourses: (progressData || []).filter(p => p.progress_percent > 0).length,
        averageCompletion: (progressData || []).length > 0 ? 
          (progressData || []).reduce((sum, p) => sum + (p.progress_percent || 0), 0) / (progressData || []).length : 0
      });
    } catch (fallbackError) {
      console.error('Fallback metrics calculation failed:', fallbackError);
      // Set default metrics as last resort
      setLearningMetrics({
        totalHours: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageCompletion: 0
      });
    }
  }, []);

  // Load learning metrics
  const loadLearningMetrics = useCallback(async (userId: string) => {
    try {
      // Use the current user metrics function (no parameters)
      const { data, error } = await supabase.rpc('get_current_user_metrics');
      
      if (error) {
        console.error('Error fetching current user metrics via RPC:', error);
        // Fallback to manual calculation
        await loadLearningMetricsFallback(userId);
      } else if (data && data.length > 0) {
        const metrics = data[0];
        setLearningMetrics({
          totalHours: parseFloat(metrics.total_hours) || 0,
          completedCourses: parseInt(metrics.completed_courses) || 0,
          inProgressCourses: parseInt(metrics.in_progress_courses) || 0,
          averageCompletion: parseFloat(metrics.average_completion) || 0
        });
      } else {
        await loadLearningMetricsFallback(userId);
      }
    } catch (error) {
      console.error('Error loading learning metrics:', error);
      await loadLearningMetricsFallback(userId);
    }
  }, [loadLearningMetricsFallback]);

  // Function to load user courses
  const loadUserCourses = useCallback(async () => {
    if (!userId) return;
    
    try {
      console.log('Loading user courses for userId:', userId);
      
      // Get user courses with course details
      const { data: userCoursesData, error } = await supabase
        .from('user_courses')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            company_id,
            image_url,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error loading user courses:', error);
        return;
      }

      console.log('User courses loaded:', userCoursesData);
      
      // Update supabaseData with user courses
      setSupabaseData(prev => ({
        ...prev,
        userCourses: userCoursesData || []
      }));

      // Load podcast progress for metrics calculation
      const { data: progressData } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);

      const totalHours = (progressData || []).reduce((sum, progress) => {
        const duration = typeof progress.duration === 'string' ? parseFloat(progress.duration) : (progress.duration || 0);
        const progressPercent = progress.progress_percent || 0;
        return sum + ((duration * (progressPercent / 100)) / 3600);
      }, 0);

      setLearningMetrics({
        totalHours: Math.round(totalHours * 10) / 10,
        completedCourses: (userCoursesData || []).filter(uc => uc.completed).length,
        inProgressCourses: (progressData || []).filter(p => p.progress_percent > 0 && p.progress_percent < 100).length,
        averageCompletion: (progressData || []).length > 0 ? 
          (progressData || []).reduce((sum, p) => sum + (p.progress_percent || 0), 0) / (progressData || []).length : 0
      });
    } catch (fallbackError) {
      console.error('Fallback metrics calculation failed:', fallbackError);
      // Set default metrics as last resort
      setLearningMetrics({
        totalHours: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageCompletion: 0
      });
    }
  }, [userId]);

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      if (!userId) return;
      
      setError(null);
      
      // Load all data first
      const [coursesData, categoriesData, podcastsData, pdfsData, userCoursesData] = await Promise.all([
        supabaseHelpers.getCourses(),
        supabaseHelpers.getContentCategories(), 
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getUserCourses(userId)
      ]);
      
      // Load liked podcasts separately to avoid the error
      const likedPodcastsData = await loadUserLikedPodcasts(userId);
      
      // Filter courses to show only assigned courses
      const assignedCourseIds = new Set(userCoursesData.map(uc => uc.course_id));
      const assignedCourses = (coursesData || []).filter(course => 
        assignedCourseIds.has(course.id)
      );
      
      console.log('Assigned courses for user:', assignedCourses);
      console.log('User courses data:', userCoursesData);
      
      setSupabaseData(prev => ({
        ...prev,
        courses: assignedCourses,
        categories: categoriesData || [],
        podcasts: podcastsData,
        pdfs: pdfsData,
        likedPodcasts: likedPodcastsData,
        userCourses: userCoursesData || []
      }));
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    }
    // Note: We don't set loading state here, it's handled by the main useEffect
  }, [userId, loadUserLikedPodcasts]);

  // Real-time sync for all relevant tables
  useRealtimeSync('user-courses', loadUserCourses);
  useRealtimeSync('courses', loadUserData);
  useRealtimeSync('podcasts', loadUserData);
  useRealtimeSync('content-categories', loadUserData);
  useRealtimeSync('pdfs', loadUserData);
  useRealtimeSync('podcast-progress', loadPodcastProgress);
  useRealtimeSync('podcast-assignments', loadUserCourses);
  useRealtimeSync('user-profiles', loadUserData);
  useRealtimeSync('users', loadUserData);
  useRealtimeSync('companies', loadUserData);
  useRealtimeSync('podcast-likes', loadUserData);
  useRealtimeSync('logos', loadUserData);
  useRealtimeSync('activity-logs', loadUserData);
  useRealtimeSync('temp-passwords', loadUserData);
  useRealtimeSync('user-registrations', loadUserData);
  useRealtimeSync('approval-logs', loadUserData);
  useRealtimeSync('audit-logs', loadUserData);
  useRealtimeSync('chat-history', loadUserData);
  useRealtimeSync('contact-messages', loadUserData);
  useRealtimeSync('documents', loadUserData);

  // Get user ID on component mount
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('🚀 Initializing User Dashboard');
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔑 Getting user authentication info');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ Auth error:', authError);
          throw new Error(`Authentication failed: ${authError.message}`);
        }
        
        if (user) {
          console.log('👤 User authenticated:', user.id);
          setUserId(user.id);
          
          console.log('📊 Loading dashboard data...');
          // Load all data in parallel
          await Promise.all([
            loadUserCourses().then(() => console.log('✅ User courses loaded')),
            loadUserData().then(() => console.log('✅ User data loaded')),
            loadPodcastProgress().then(() => console.log('✅ Podcast progress loaded')),
            loadLearningMetrics(user.id).then(() => console.log('✅ Learning metrics loaded'))
          ]);
          console.log('🎉 All dashboard data loaded successfully');
        } else {
          console.log('⚠️ No user authenticated');
        }
      } catch (error) {
        console.error('💥 Error initializing dashboard:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize dashboard');
      } finally {
        console.log('🏁 Setting loading to false');
        setLoading(false);
      }
    };
    
    initializeDashboard();
  }, []);
  
  // Load user data when userId is available
  useEffect(() => {
    if (userId) {
      loadUserCourses(); // Load user courses first
      loadUserData(); // Load all data
      loadPodcastProgress();
      loadLearningMetrics(userId);
    }
  }, [userId]);
  
  // Load user profile when userId is available
  useEffect(() => {
    if (userId) {
      const fetchUserProfile = async () => {
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
      
      fetchUserProfile();
    }
  }, [userId]);
  
  // Create a memoized handler for the custom event
  const handlePlayPodcastEvent = useCallback((event: CustomEvent) => {
    const { podcastId } = event.detail;
    const podcastToPlay = supabaseData.podcasts.find(p => p.id === podcastId);
    if (podcastToPlay) {
      handlePlayPodcast(podcastToPlay);
    }
  }, [supabaseData.podcasts]);

  // Add event listener for custom play-podcast event
  useEffect(() => {
    window.addEventListener('play-podcast', handlePlayPodcastEvent as EventListener);
    
    return () => {
      window.removeEventListener('play-podcast', handlePlayPodcastEvent as EventListener);
    };
  }, [handlePlayPodcastEvent]);
      
  // Enhance podcasts with category names using useMemo for better performance
  const enhancedPodcasts = React.useMemo(() => {
    return supabaseData.podcasts.map((podcast: any) => {
      const category = supabaseData.categories.find((cat: any) => cat.id === podcast.category_id);
      return {
        ...podcast,
        category_name: category ? category.name : podcast.category || 'Uncategorized'
      };
    });
  }, [supabaseData.podcasts, supabaseData.categories]);

  // Build course hierarchy for display - only for assigned courses
  const courseHierarchy = React.useMemo(() => {
    return supabaseData.courses.map(course => {
      // Get categories for this course
      const courseCategories = supabaseData.categories.filter(cat => cat.course_id === course.id);
      
      // Get podcasts for each category
      const categoriesWithPodcasts = courseCategories.map(category => {
        const categoryPodcasts = supabaseData.podcasts.filter(
          podcast => podcast.category_id === category.id
        );
        return {
          ...category,
          podcasts: categoryPodcasts
        };
      });
      
      // Get uncategorized podcasts (directly assigned to course)
      const uncategorizedPodcasts = supabaseData.podcasts.filter(
        podcast => podcast.course_id === course.id && !podcast.category_id
      );
      
      return {
        ...course,
        categories: categoriesWithPodcasts,
        uncategorizedPodcasts,
        totalPodcasts: categoriesWithPodcasts.reduce(
          (sum, cat) => sum + cat.podcasts.length, 0
        ) + uncategorizedPodcasts.length
      };
    });
  }, [supabaseData.courses, supabaseData.categories, supabaseData.podcasts]);

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

  // Calculate metrics from current data
  const metrics = React.useMemo(() => {
    const assignedCourses = supabaseData.userCourses || [];
    const coursesWithProgress = Object.keys(podcastProgress).length > 0 ? 
      assignedCourses.filter(uc => {
        // Check if any podcasts in this course have progress
        const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === uc.course_id);
        return coursePodcasts.some(podcast => podcastProgress[podcast.id] > 0);
      }).length : 0;

    const completedCourses = assignedCourses.filter(uc => {
      // Check if ALL podcasts in this course are 100% complete
      const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === uc.course_id);
      if (coursePodcasts.length === 0) return false;
      return coursePodcasts.every(podcast => podcastProgress[podcast.id] === 100);
    }).length;

    return {
      totalCoursesAvailable: assignedCourses.length,
      completedCourses: completedCourses,
      coursesInProgress: coursesWithProgress,
      totalHoursCompleted: learningMetrics.totalHours
    };
  }, [supabaseData.userCourses, supabaseData.podcasts, podcastProgress, learningMetrics.totalHours]);

  const handleProgressUpdate = (progress: number, duration: number, currentTime: number) => {
    if (!currentPodcast || !userId) return;
    
    // Save progress to Supabase
    supabaseHelpers.savePodcastProgress(userId, currentPodcast.id, currentTime, duration);
  };

  const handlePlayPodcast = (podcast: any) => {
    console.log("Playing podcast in dashboard:", podcast);
    setCurrentPodcast(podcast);
    setIsPodcastPlayerOpen(true);
    setIsPodcastPlayerMinimized(false); 
    
    // Get related podcasts for this podcast
    const relatedPodcasts = enhancedPodcasts.filter(p => 
      p.id !== podcast.id &&
      (p.course_id === podcast.course_id || 
       p.category_id === podcast.category_id ||
       p.category === podcast.category)
    ).slice(0, 5);
    
    // Update the podcast with related podcasts
    setCurrentPodcast({
      ...podcast, 
      relatedPodcasts
    });
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
              onClick={loadUserData}
              className="mt-2 text-sm text-red-700 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" key="dashboard-header">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-[#a0a0a0]">
            Welcome back! Here's your learning progress overview.
          </p>
        </div>

        {/* Overall Progress Section */}
        <div className="p-6 bg-[#1e1e1e] shadow-lg rounded-lg border border-[#333333] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8b5cf6]">{metrics.totalCoursesAvailable}</div>
              <div className="text-sm text-[#a0a0a0]">Courses Available</div>
              <div className="text-xs text-[#a0a0a0] mt-1">
                {metrics.totalCoursesAvailable} courses assigned
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8b5cf6]">
                {metrics.completedCourses}
              </div>
              <div className="text-sm text-[#a0a0a0]">
                {metrics.completedCourses > 0 ? 'Courses Completed' : 'Courses In Progress'}
              </div>
              <div className="text-xs text-[#a0a0a0] mt-1">
                {metrics.coursesInProgress} in progress
              </div>
              {(metrics.coursesInProgress > 0 || Object.keys(podcastProgress).length > 0) && (
                <div className="mt-2 w-full bg-[#333333] rounded-full h-1.5">
                  <div
                    className="bg-[#8b5cf6] h-1.5 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.min(
                        Object.keys(podcastProgress).length > 0 ? 
                        Math.max(5, (metrics.coursesInProgress / (metrics.totalCoursesAvailable || 1)) * 100) : 0, 
                        100
                      )}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8b5cf6]">{metrics.totalHoursCompleted.toFixed(1)}</div>
              <div className="text-sm text-[#a0a0a0]">Hours Completed</div>
              {(metrics.totalHoursCompleted > 0 || Object.keys(podcastProgress).length > 0) && (
                <div className="mt-2 w-full bg-[#333333] rounded-full h-1.5">
                  <div 
                    className="bg-[#8b5cf6] h-1.5 rounded-full" 
                    style={{ 
                      width: `${Object.keys(podcastProgress).length > 0 ? 
                        Math.max(5, Math.min(metrics.totalHoursCompleted * 10, 100)) : 0}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Weekly Progress Charts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Progress Comparison */}
          <div className="bg-[#1e1e1e] shadow-lg rounded-lg border border-[#333333] p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 text-[#8b5cf6] mr-2" />
              Weekly Learning Progress
            </h3>
            <div className="h-64 flex items-center justify-center text-[#a0a0a0]">
              <p>Progress data will appear here as you complete courses</p>
            </div>
          </div>
          
          {/* Learning Engagement Trend */}
          <div className="bg-[#1e1e1e] shadow-lg rounded-lg border border-[#333333] p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-[#8b5cf6] mr-2" />
              Learning Engagement Trend
            </h3>
            <div className="h-64 flex items-center justify-center text-[#a0a0a0]">
              <p>Engagement data will appear here as you interact with courses</p>
            </div>
          </div>
        </div>
      </div>

        {/* Podcast Player Modal */}
        {isPodcastPlayerOpen && currentPodcast && !isPodcastPlayerMinimized && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-2xl w-full border border-[#333333]">
              <h2 className="text-xl font-bold mb-4 text-white">{currentPodcast.title}</h2>
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
              <button
                onClick={() => setIsPodcastPlayerMinimized(false)}
                className="text-[#a0a0a0] hover:text-white"
              >
                Expand
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
          </div>
        )}
    </div>
  );
}