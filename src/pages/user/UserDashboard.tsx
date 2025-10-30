import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Headphones, 
  FileText, 
  Image, 
  File,
  Clock,
  CheckCircle,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Course {
  id: string;
  title: string;
  description: string;
  company_id: string | null;
  image_url: string | null;
  created_at: string;
  level?: string;
}

interface UserCourse {
  user_id: string;
  course_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  completed?: boolean;
  completion_date?: string | null;
  courses: Course;
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

export default function UserDashboard({ userEmail = '' }: { userEmail?: string }) {
  const [userId, setUserId] = useState<string>('');
  const [supabaseData, setSupabaseData] = useState<{
    courses: Course[];
    userCourses: UserCourse[];
    podcasts: any[]; // Add podcasts to state
  }>({
    courses: [],
    userCourses: [],
    podcasts: []
  });
  const [podcastProgress, setPodcastProgress] = useState<PodcastProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();

  // Load user data - only assigned courses
  const loadUserData = async () => {
    try {
      if (!userId) return;
      
      setError(null);
      
      // Load user courses
      const userCoursesData = await supabaseHelpers.getUserCourses(userId);
      
      // Load courses using regular supabase client to respect RLS policies
      let coursesData = [];
      let podcastsData = [];
      
      try {
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (coursesError) {
          console.error('Error fetching courses with RLS:', coursesError);
          coursesData = [];
        } else {
          coursesData = courses || [];
        }
        
        // Load podcasts for all courses
        const { data: podcasts, error: podcastsError } = await supabase
          .from('podcasts')
          .select('*');
        
        if (podcastsError) {
          console.error('Error fetching podcasts:', podcastsError);
          podcastsData = [];
        } else {
          podcastsData = podcasts || [];
        }
      } catch (dataError) {
        console.error('Exception fetching data:', dataError);
        coursesData = [];
        podcastsData = [];
      }
      
      // Filter courses to show only courses assigned to this specific user
      const assignedCourseIds = new Set(userCoursesData.map(uc => uc.course_id));
      const assignedCourses = (coursesData || []).filter(course => 
        assignedCourseIds.has(course.id)
      );
      
      setSupabaseData(prev => ({
        ...prev,
        courses: assignedCourses,
        userCourses: userCoursesData || [],
        podcasts: podcastsData || []
      }));
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    }
  };

  // Load podcast progress
  const loadPodcastProgress = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error loading podcast progress:', error);
        setPodcastProgress([]);
        return;
      }
      
      setPodcastProgress(data || []);
    } catch (error) {
      console.error('Exception loading podcast progress:', error);
      setPodcastProgress([]);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('user-courses', loadUserData);
  useRealtimeSync('courses', loadUserData);
  useRealtimeSync('podcasts', loadUserData);
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
    
    if (userId) {
      initializeDashboard();
    }
  }, [userId]);
  
  // Load user data when userId is available
  useEffect(() => {
    if (userId) {
      loadUserData();
      loadPodcastProgress();
    }
  }, [userId]);

  // Load user profile
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

  // Calculate KPIs
  const calculateKPIs = () => {
    const assignedCourses = supabaseData.userCourses.length;
    const completedCourses = supabaseData.userCourses.filter(uc => uc.completed).length;
    
    // Calculate total learning hours based on actual podcast durations
    let totalSeconds = 0;
    let totalProgress = 0;
    let progressCount = 0;
    
    // Get all podcasts for assigned courses
    const assignedCourseIds = new Set(supabaseData.userCourses.map(uc => uc.course_id));
    
    // Filter podcasts that belong to assigned courses
    const assignedPodcasts = supabaseData.podcasts.filter(podcast => 
      assignedCourseIds.has(podcast.course_id)
    );
    
    // Sum up the durations of all assigned podcasts
    assignedPodcasts.forEach(podcast => {
      // For YouTube videos, we might not have exact duration, so we'll estimate
      // For audio files, we should have duration from the upload process
      const duration = podcast.duration || (podcast.is_youtube_video ? 1800 : 1200); // Default 30min for YouTube, 20min for audio
      totalSeconds += duration;
    });
    
    // Convert total seconds to hours
    const totalHours = totalSeconds / 3600;
    
    // Calculate average progress based on podcast progress
    podcastProgress.forEach(progress => {
      // Only count progress for podcasts in assigned courses
      const podcast = assignedPodcasts.find(p => p.id === progress.podcast_id);
      if (podcast) {
        totalProgress += progress.progress_percent || 0;
        progressCount++;
      }
    });
    
    const averageProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;
    
    return {
      assignedCourses,
      completedCourses,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      averageProgress
    };
  };

  // Prepare chart data
  const prepareChartData = () => {
    const courseProgressData = supabaseData.userCourses.map(uc => {
      const coursePodcasts = podcastProgress.filter(p => 
        supabaseData.courses.find(c => c.id === uc.course_id)?.id
      );
      
      const totalProgress = coursePodcasts.reduce((sum, p) => sum + (p.progress_percent || 0), 0);
      const avgProgress = coursePodcasts.length > 0 ? Math.round(totalProgress / coursePodcasts.length) : 0;
      
      return {
        name: uc.courses.title.length > 15 ? `${uc.courses.title.substring(0, 15)}...` : uc.courses.title,
        progress: avgProgress
      };
    });
    
    // Progress distribution data
    const progressDistribution = [
      { name: 'Not Started', value: supabaseData.userCourses.filter(uc => {
        const courseProgress = podcastProgress.filter(p => 
          supabaseData.courses.find(c => c.id === uc.course_id)?.id
        );
        return courseProgress.length === 0 || courseProgress.every(p => (p.progress_percent || 0) === 0);
      }).length },
      { name: 'In Progress', value: supabaseData.userCourses.filter(uc => {
        const courseProgress = podcastProgress.filter(p => 
          supabaseData.courses.find(c => c.id === uc.course_id)?.id
        );
        return courseProgress.some(p => (p.progress_percent || 0) > 0 && (p.progress_percent || 0) < 100);
      }).length },
      { name: 'Completed', value: supabaseData.userCourses.filter(uc => {
        const courseProgress = podcastProgress.filter(p => 
          supabaseData.courses.find(c => c.id === uc.course_id)?.id
        );
        return courseProgress.length > 0 && courseProgress.every(p => (p.progress_percent || 0) >= 100);
      }).length }
    ];
    
    return { courseProgressData, progressDistribution };
  };

  const { assignedCourses, completedCourses, totalHours, averageProgress } = calculateKPIs();
  const { courseProgressData, progressDistribution } = prepareChartData();

  // Colors for pie chart
  const COLORS = ['#8b5cf6', '#f59e0b', '#10b981'];

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

  // Dashboard view - KPIs and charts only
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Learning Dashboard</h1>
          <p className="mt-1 text-sm text-[#a0a0a0]">
            Track your learning progress and course completion
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Assigned Courses', value: assignedCourses, icon: BookOpen, color: 'bg-[#8b5cf6]' },
            { title: 'Completed Courses', value: completedCourses, icon: CheckCircle, color: 'bg-[#10b981]' },
            { title: 'Total Hours', value: totalHours, icon: Clock, color: 'bg-[#f59e0b]' },
            { title: 'Avg. Progress', value: `${averageProgress}%`, icon: TrendingUp, color: 'bg-[#3b82f6]' }
          ].map((card, index) => (
            <div key={index} className="bg-[#1e1e1e] overflow-hidden shadow-sm rounded-lg border border-[#333333]">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${card.color} rounded-md p-3`}>
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-300 truncate">{card.title}</dt>
                      <dd className="text-2xl font-semibold text-white">{card.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Course Progress Chart */}
          <div className="bg-[#1e1e1e] shadow-sm rounded-lg border border-[#333333]">
            <div className="px-6 py-4 border-b border-[#333333]">
              <h3 className="text-lg font-medium text-white">Course Progress</h3>
            </div>
            <div className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis dataKey="name" stroke="#a0a0a0" />
                  <YAxis stroke="#a0a0a0" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333333' }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Bar dataKey="progress" fill="#8b5cf6" name="Progress %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Progress Distribution */}
          <div className="bg-[#1e1e1e] shadow-sm rounded-lg border border-[#333333]">
            <div className="px-6 py-4 border-b border-[#333333]">
              <h3 className="text-lg font-medium text-white">Progress Distribution</h3>
            </div>
            <div className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={progressDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                  >
                    {progressDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333333' }}
                    itemStyle={{ color: 'white' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Assigned Courses */}
        <div className="bg-[#1e1e1e] shadow-sm rounded-lg border border-[#333333]">
          <div className="px-6 py-4 border-b border-[#333333]">
            <h3 className="text-lg font-medium text-white">My Courses</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {supabaseData.userCourses.length > 0 ? (
                supabaseData.userCourses.map((userCourse) => {
                  const course = userCourse.courses;
                  const courseProgress = podcastProgress.filter(p => 
                    supabaseData.courses.find(c => c.id === userCourse.course_id)?.id
                  );
                  const totalProgress = courseProgress.reduce((sum, p) => sum + (p.progress_percent || 0), 0);
                  const avgProgress = courseProgress.length > 0 ? Math.round(totalProgress / courseProgress.length) : 0;
                  
                  return (
                    <div 
                      key={userCourse.course_id} 
                      className="flex items-center justify-between p-4 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                      onClick={() => navigate(`/user/courses/${userCourse.course_id}`)}
                    >
                      <div className="flex items-center">
                        {course.image_url ? (
                          <img 
                            src={course.image_url} 
                            alt={course.title} 
                            className="h-12 w-12 rounded-md object-cover mr-4"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md bg-[#8b5cf6]/20 flex items-center justify-center mr-4">
                            <BookOpen className="h-6 w-6 text-[#8b5cf6]" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-medium text-white">{course.title}</h4>
                          <p className="text-xs text-gray-400">
                            {course.level || 'Not specified'} • Assigned on {new Date(userCourse.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-24 bg-[#333333] rounded-full h-2 mr-3">
                          <div 
                            className="bg-[#8b5cf6] h-2 rounded-full" 
                            style={{ width: `${avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-white">{avgProgress}%</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">No courses assigned</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">
                    Contact your administrator to get access to courses.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}