import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { Folder, Play, Clock, BookOpen, Users, BarChart3, FileText, Download } from 'lucide-react';
import PodcastPlayer from '../../components/Media/PodcastPlayer';
import { useNavigate } from 'react-router-dom';
import DebugUserCourses from '../../components/Debug/DebugUserCourses';

interface Course {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  company_id?: string;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  course_id: string;
  created_at?: string;
  created_by?: string;
}

interface Podcast {
  id: string;
  title: string;
  course_id?: string;
  category_id?: string;
  mp3_url: string;
  created_at?: string;
  created_by?: string;
  relatedPodcasts?: Podcast[];
}

interface PodcastProgress {
  id: string;
  user_id: string;
  podcast_id: string;
  playback_position: number;
  duration: number;
  progress_percent: number;
  last_played_at?: string;
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

export default function MyCourses() {
  const navigate = useNavigate();
  const [supabaseData, setSupabaseData] = useState({
    courses: [] as Course[],
    categories: [] as Category[],
    podcasts: [] as Podcast[],
    pdfs: [] as any[],
    userCourses: [] as UserCourse[]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPodcastPlayerOpen, setIsPodcastPlayerOpen] = useState(false);
  const [isPodcastPlayerMinimized, setIsPodcastPlayerMinimized] = useState(false);
  const [podcastProgress, setPodcastProgress] = useState<PodcastProgress[]>([]);
  const [userId, setUserId] = useState<string>('');

  // Function declarations (hoisted)
  async function loadUserCourses(userId: string) {
    try {
      console.log('Loading user courses for userId:', userId);
      
      const { data: userCourses, error } = await supabase
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
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user courses:', error);
        setSupabaseData(prev => ({
          ...prev,
          userCourses: []
        }));
      } else {
        console.log('User courses loaded:', userCourses);
        setSupabaseData(prev => ({
          ...prev,
          userCourses: userCourses || []
        }));
      }
    } catch (err) {
      console.error('Error in loadUserCourses:', err);
      setSupabaseData(prev => ({
        ...prev,
        userCourses: []
      }));
    }
  }

  async function loadAllSupabaseData() {
    try {
      // Load basic data that doesn't require user-specific permissions
      let courses = [], categories = [], podcasts = [], pdfs = [], documents = [];
      
      try {
        const [coursesData, categoriesData, podcastsData, pdfsData] = await Promise.all([
          supabaseHelpers.getCourses(),
          supabaseHelpers.getCategories(),
          supabaseHelpers.getPodcasts(),
          supabaseHelpers.getPDFs()
        ]);
        
        courses = coursesData || [];
        categories = categoriesData || [];
        podcasts = podcastsData || [];
        pdfs = pdfsData || [];
      } catch (dataError) {
        console.error('Error loading basic data:', dataError);
        // Continue with empty arrays
      }
      
      setSupabaseData(prev => ({
        ...prev,
        courses,
        categories,
        podcasts,
        pdfs
      }));
    } catch (err) {
      console.error('Error in loadAllSupabaseData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
    // Note: We don't set loading to false here anymore, it's handled in the useEffect
  }

  async function loadPodcastProgress() {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching podcast progress:', error);
        setPodcastProgress([]);
      } else {
        setPodcastProgress(data || []);
      }
    } catch (error) {
      console.error('Exception fetching podcast progress:', error);
      setPodcastProgress([]);
    }
  }

  // Real-time sync for all relevant tables
  useRealtimeSync('user-courses', () => {
    if (userId) {
      loadUserCourses(userId);
    }
    loadAllSupabaseData();
  });
  useRealtimeSync('courses', loadAllSupabaseData);
  useRealtimeSync('podcasts', loadAllSupabaseData);
  useRealtimeSync('content-categories', loadAllSupabaseData);
  useRealtimeSync('pdfs', loadAllSupabaseData);
  useRealtimeSync('podcast-progress', () => {
    if (userId) {
      loadPodcastProgress();
    }
  });
  useRealtimeSync('podcast-assignments', () => {
    if (userId) {
      loadUserCourses(userId);
    }
    loadAllSupabaseData();
  });
  useRealtimeSync('users', loadAllSupabaseData);
  useRealtimeSync('companies', loadAllSupabaseData);
  useRealtimeSync('user-profiles', loadAllSupabaseData);
  useRealtimeSync('podcast-likes', loadAllSupabaseData);
  useRealtimeSync('logos', loadAllSupabaseData);
  useRealtimeSync('activity-logs', loadAllSupabaseData);
  useRealtimeSync('temp-passwords', loadAllSupabaseData);
  useRealtimeSync('user-registrations', loadAllSupabaseData);
  useRealtimeSync('approval-logs', loadAllSupabaseData);
  useRealtimeSync('audit-logs', loadAllSupabaseData);
  useRealtimeSync('chat-history', loadAllSupabaseData);
  useRealtimeSync('contact-messages', loadAllSupabaseData);

  useEffect(() => {
    loadAllSupabaseData();
  }, []);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      console.log('🚀 Initializing MyCourses component');
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
          
          console.log('📊 Loading courses data...');
          // Load all data in parallel
          await Promise.all([
            loadAllSupabaseData().then(() => console.log('✅ Supabase data loaded')),
            loadPodcastProgress().then(() => console.log('✅ Podcast progress loaded')),
            loadUserCourses(user.id).then(() => console.log('✅ User courses loaded'))
          ]);
          console.log('🎉 All courses data loaded successfully');
        } else {
          console.log('⚠️ No user authenticated, loading general data only');
          await loadAllSupabaseData();
        }
      } catch (err) {
        console.error('💥 Error initializing courses data:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize courses data');
      } finally {
        console.log('🏁 Setting loading to false');
        setLoading(false);
      }
    };
    
    initializeData();
  }, []);
  
  useEffect(() => {
    // Reload data when userId changes
    if (userId) {
      loadPodcastProgress();
      loadUserCourses(userId);
    }
  }, [userId]);

  // Get course image based on course title
  const getCourseImage = (courseTitle: string, index: number) => {
    const title = courseTitle.toLowerCase();

    if (title.includes('question')) {
      return 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('listen')) {
      return 'https://images.pexels.com/photos/7176319/pexels-photo-7176319.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('time') || title.includes('management')) {
      return 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('leadership')) {
      return 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('communication')) {
      return 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else {
      return 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
  };

  const handleProgressUpdate = async (podcastId: string, position: number, duration: number) => {
    if (!userId) return;

    const progressPercent = duration > 0 ? Math.round((position / duration) * 100) : 0;

    const { error } = await supabase
      .from('podcast_progress')
      .upsert({
        user_id: userId,
        podcast_id: podcastId,
        playback_position: position,
        duration: duration,
        progress_percent: progressPercent,
        last_played_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,podcast_id'
      });

    if (error) {
      console.error('Error updating podcast progress:', error);
    } else {
      // Update local state
      setPodcastProgress(prev => {
        const existing = prev.find(p => p.podcast_id === podcastId);
        if (existing) {
          return prev.map(p => 
            p.podcast_id === podcastId 
              ? { ...p, playback_position: position, duration, progress_percent: progressPercent }
              : p
          );
        } else {
          return [...prev, {
            id: `temp-${Date.now()}`,
            user_id: userId,
            podcast_id: podcastId,
            playback_position: position,
            duration,
            progress_percent: progressPercent
          }];
        }
      });
    }
  };

  const getProgressForPodcast = (podcastId: string) => {
    return podcastProgress.find(p => p.podcast_id === podcastId);
  };

  const getCourseProgress = (courseId: string) => {
    const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === courseId);
    if (coursePodcasts.length === 0) return 0;

    const totalProgress = coursePodcasts.reduce((sum, podcast) => {
      const progress = getProgressForPodcast(podcast.id);
      return sum + (progress?.progress_percent || 0);
    }, 0);

    return Math.round(totalProgress / coursePodcasts.length);
  };

  // Build course hierarchy for display - only for assigned courses
  const courseHierarchy = React.useMemo(() => {
    // Get assigned course IDs
    const assignedCourseIds = new Set(supabaseData.userCourses.map(uc => uc.course_id));
    
    // Filter courses to show only assigned courses
    const assignedCourses = supabaseData.courses.filter(course => 
      assignedCourseIds.has(course.id)
    );
    
    return assignedCourses.map(course => ({
      ...course,
      categories: supabaseData.categories
        .filter(cat => cat.course_id === course.id)
        .map(category => ({
          ...category,
          podcasts: supabaseData.podcasts.filter(podcast => podcast.category_id === category.id)
        }))
    }));
  }, [supabaseData.courses, supabaseData.categories, supabaseData.podcasts, supabaseData.userCourses]);

  const handlePodcastPlay = (podcast: Podcast) => {
    const relatedPodcasts = supabaseData.podcasts.filter(p => 
      p.course_id === podcast.course_id && p.id !== podcast.id
    );
    
    setCurrentPodcast({
      ...podcast,
      relatedPodcasts
    });
    setIsPodcastPlayerOpen(true);
    setIsPodcastPlayerMinimized(false);
  };

  const renderCourseCards = () => {
    // Check if user has any assigned courses
    const userCourseIds = supabaseData.userCourses?.map(uc => uc.course_id) || [];
    const assignedCourses = supabaseData.courses.filter(course => 
      userCourseIds.includes(course.id)
    );
    
    console.log('Rendering course cards. User course IDs:', userCourseIds);
    console.log('Assigned courses:', assignedCourses);
    
    if (!assignedCourses || assignedCourses.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No courses assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            Contact your administrator to get access to courses.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedCourses.map((course, index) => {
          const courseCategories = supabaseData.categories.filter(cat => cat.course_id === course.id);
          const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === course.id);
          const coursePdfs = supabaseData.pdfs.filter(p => p.course_id === course.id);
          const progress = getCourseProgress(course.id);

          return (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/user/courses/${course.id}`)}
            >
              <div className="aspect-video bg-gray-200">
                <img
                  src={getCourseImage(course.title, index)}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {course.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.description || `This course contains ${courseCategories.length} categories and ${coursePodcasts.length} podcasts to help you master the subject.`}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 mr-1" />
                      <span>{courseCategories.length} categories</span>
                    </div>
                    <div className="flex items-center">
                      <Play className="h-4 w-4 mr-1" />
                      <span>{coursePodcasts.length} podcasts</span>
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      <span>{coursePdfs.length} documents</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCategoryCards = () => {
    if (!selectedCourse) return null;

    const courseCategories = supabaseData.categories.filter(cat => cat.course_id === selectedCourse.id);

    if (courseCategories.length === 0) {
      return (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
          <p className="mt-1 text-sm text-gray-500">
            This course doesn't have any categories yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedCourse(null)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Courses
          </button>
          <h2 className="text-xl font-semibold text-gray-900">{selectedCourse.title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courseCategories.map((category) => {
            const categoryPodcasts = supabaseData.podcasts.filter(p => p.category_id === category.id);
            
            return (
              <div key={category.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                  <div className="flex items-center">
                    <Folder className="h-8 w-8 text-white mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                      <p className="text-blue-100 text-sm">{categoryPodcasts.length} podcasts</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {category.description && (
                    <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                  )}

                  <div className="space-y-2">
                    {categoryPodcasts.map((podcast) => {
                      const progress = getProgressForPodcast(podcast.id);
                      
                      return (
                        <div
                          key={podcast.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => handlePodcastPlay(podcast)}
                        >
                          <div className="flex items-center flex-1">
                            <Play className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {podcast.title}
                            </span>
                          </div>
                          
                          {progress && progress.progress_percent > 0 && (
                            <div className="flex items-center ml-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5 mr-2">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${progress.progress_percent}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {progress.progress_percent}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600">Error loading courses: {error}</div>
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
      {/* Debug component for troubleshooting - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      )}
      
      {selectedCourse ? renderCategoryCards() : renderCourseCards()}

      {/* Full-screen Podcast Player */}
      {isPodcastPlayerOpen && currentPodcast && !isPodcastPlayerMinimized && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{currentPodcast.title}</h2>
              <audio
                src={currentPodcast.mp3_url}
                controls
                controlsList="nodownload"
                className="w-full"
                onTimeUpdate={(e) => {
                  const audio = e.currentTarget;
                  const progress = Math.round((audio.currentTime / audio.duration) * 100);
                  handleProgressUpdate(currentPodcast.id, progress, audio.duration);
                }}
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setCurrentPodcast(null);
                    setIsPodcastPlayerOpen(false);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Podcast Player */}
      {isPodcastPlayerOpen && currentPodcast && isPodcastPlayerMinimized ? (
        <div className="fixed bottom-0 right-0 bg-white shadow-lg rounded-tl-lg p-3 z-50 w-80">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium truncate">{currentPodcast.title}</h3>
            <button
              onClick={() => setIsPodcastPlayerMinimized(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Expand
            </button>
          </div>
          <audio
            src={currentPodcast.mp3_url}
            controls
            controlsList="nodownload"
            className="w-full"
            onTimeUpdate={(e) => {
              const audio = e.currentTarget;
              const progress = Math.round((audio.currentTime / audio.duration) * 100);
              handleProgressUpdate(currentPodcast.id, progress, audio.duration);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}