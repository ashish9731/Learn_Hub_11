import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { Folder, Play, Clock, BookOpen, Users, BarChart3, FileText, Download } from 'lucide-react';
import PodcastPlayer from '../../components/Media/PodcastPlayer';
import { useNavigate } from 'react-router-dom';
import DebugUserCourses from '../../components/Debug/DebugUserCourses';
import { stabilityAI } from '../../services/stabilityai';

interface Course {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  company_id?: string;
  created_at?: string;
  level?: string;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // State to store generated course images
  const [courseImages, setCourseImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  
  // Ref to track which courses have had images generated
  const generatedImagesRef = useRef<Record<string, boolean>>({});

  // Generate course images when courses change
  useEffect(() => {
    const generateImages = async () => {
      if (!supabaseData.courses || supabaseData.courses.length === 0) return;
      
      // Generate images for courses that don't have them yet
      for (const course of supabaseData.courses) {
        // Skip if we've already tried to generate an image for this course
        if (generatedImagesRef.current[course.id]) continue;
        
        if (!courseImages[course.id] && !loadingImages[course.id]) {
          setLoadingImages(prev => ({ ...prev, [course.id]: true }));
          await generateCourseImage(course.title, course.id);
          setLoadingImages(prev => ({ ...prev, [course.id]: false }));
          // Mark this course as having had image generation attempted
          generatedImagesRef.current[course.id] = true;
        }
      }
    };
    
    generateImages();
  }, [supabaseData.courses, courseImages, loadingImages]);

  // Get course image based on course title or generated AI image
  const generateCourseImage = async (courseTitle: string, courseId: string) => {
    // If we already have a generated image for this course, return it
    if (courseImages[courseId]) {
      return courseImages[courseId];
    }
    
    // First, try to get the course from our data to check if it has an image_url
    const course = supabaseData.courses.find(c => c.id === courseId);
    
    // If course already has an image_url, use it
    if (course?.image_url) {
      setCourseImages(prev => ({ ...prev, [courseId]: course.image_url! }));
      return course.image_url;
    }
    
    // If no image_url exists, generate one using Stability AI
    try {
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
          const defaultImage = getDefaultImage(courseTitle);
          setCourseImages(prev => ({ ...prev, [courseId]: defaultImage }));
          return defaultImage;
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
        
        setCourseImages(prev => ({ ...prev, [courseId]: publicUrl }));
        return publicUrl;
      }
    } catch (error) {
      console.error('Error generating AI course image:', error);
    }
    
    // Fallback to default images
    const defaultImage = getDefaultImage(courseTitle);
    setCourseImages(prev => ({ ...prev, [courseId]: defaultImage }));
    return defaultImage;
  };

  // Get default placeholder image based on course title
  const getDefaultImage = (courseTitle: string) => {
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

  const getCourseProgress = (courseId: string) => {
    const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === courseId);
    if (coursePodcasts.length === 0) return 0;

    const totalProgress = coursePodcasts.reduce((sum, podcast) => {
      const progress = getProgressForPodcast(podcast.id);
      return sum + (progress?.progress_percent || 0);
    }, 0);

    return Math.round(totalProgress / coursePodcasts.length);
  };

  const getProgressForPodcast = (podcastId: string) => {
    return podcastProgress.find(p => p.podcast_id === podcastId);
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
          const courseImage = courseImages[course.id] || getDefaultImage(course.title);

          return (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/user/courses/${course.id}`)}
            >
              <div className="aspect-video bg-gray-200 relative">
                {loadingImages[course.id] ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <img
                    src={courseImage}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                )}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {course.title}
                  </h3>
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
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.description || `This course contains ${courseCategories.length} categories with ${coursePodcasts.length} podcasts and ${coursePdfs.length} documents to help you master the subject.`}
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
                          onClick={() => handlePlayPodcast(podcast)}
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

  const handlePlayPodcast = (podcast: any) => {
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

  const getFilteredPodcasts = () => {
    if (!activeCategory) return supabaseData.podcasts;
    return supabaseData.podcasts.filter(podcast => podcast.category_id === activeCategory);
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
        // Check if it's an auth error
        if (error.message && error.message.includes('Auth')) {
          setError('Authentication failed. Please log in again.');
          return;
        }
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
        // Load categories, podcasts, and pdfs using supabaseHelpers
        const [categoriesData, podcastsData, pdfsData] = await Promise.all([
          supabaseHelpers.getCategories(),
          supabaseHelpers.getPodcasts(),
          supabaseHelpers.getPDFs()
        ]);
        
        categories = categoriesData || [];
        podcasts = podcastsData || [];
        pdfs = pdfsData || [];
        
        // Load courses using regular supabase client to respect RLS policies
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (coursesError) {
          console.error('Error fetching courses with RLS:', coursesError);
          courses = [];
        } else {
          courses = coursesData || [];
        }
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
        // Check if it's an auth error
        if (error.message && error.message.includes('Auth')) {
          setError('Authentication failed. Please log in again.');
          return;
        }
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
      } catch (error) {
        console.error('Error checking authentication:', error);
        setError('Authentication check failed. Please log in again.');
        setLoading(false);
      }
    };
    
    checkAuthAndUser();
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      console.log('🚀 Initializing MyCourses component');
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔑 Getting user authentication info');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Auth session missing or error:', sessionError);
          setError('Authentication failed. Please log in again.');
          setLoading(false);
          return;
        }
        
        if (session.user) {
          console.log('👤 User authenticated:', session.user.id);
          setUserId(session.user.id);
          setIsAuthenticated(true);
          
          console.log('📊 Loading courses data...');
          // Load all data in parallel
          await Promise.all([
            loadAllSupabaseData().then(() => console.log('✅ Supabase data loaded')),
            loadPodcastProgress().then(() => console.log('✅ Podcast progress loaded')),
            loadUserCourses(session.user.id).then(() => console.log('✅ User courses loaded'))
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
    
    if (isAuthenticated) {
      initializeData();
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    // Reload data when userId changes
    if (userId) {
      loadPodcastProgress();
      loadUserCourses(userId);
    }
  }, [userId]);

  // Get user profile when userId is available
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
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
      
      fetchUserProfile();
    }
  }, [userId]);

  // Create a memoized handler for the custom event
  const handlePlayPodcastEvent = React.useCallback((event: CustomEvent) => {
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
          {error.includes('Authentication') && (
            <button
              onClick={() => {
                // Redirect to login page
                window.location.href = '/login';
              }}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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