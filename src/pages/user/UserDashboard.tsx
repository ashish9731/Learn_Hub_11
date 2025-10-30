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
  Users,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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
    podcasts: any[];
  }>({
    courses: [],
    userCourses: [],
    podcasts: []
  });
  const [podcastProgress, setPodcastProgress] = useState<PodcastProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
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
    
    // Calculate total learning hours based on actual podcast durations from progress data
    let totalPossibleSeconds = 0;
    let totalSecondsPlayed = 0;
    let totalProgress = 0;
    let progressCount = 0;
    
    // Get all podcasts for assigned courses
    const assignedCourseIds = new Set(supabaseData.userCourses.map(uc => uc.course_id));
    
    // Filter podcasts that belong to assigned courses
    const assignedPodcasts = supabaseData.podcasts.filter(podcast => 
      assignedCourseIds.has(podcast.course_id)
    );
    
    // Debug: Log assigned podcasts and progress data
    console.log('=== DASHBOARD DEBUG INFO ===');
    console.log('Assigned Courses Count:', assignedCourses);
    console.log('Assigned Podcasts:', assignedPodcasts);
    console.log('Podcast Progress Items:', podcastProgress);
    console.log('Assigned Course IDs:', Array.from(assignedCourseIds));
    
    // Calculate total possible hours and actual time spent
    assignedPodcasts.forEach((podcast, index) => {
      // Find progress for this podcast
      const progress = podcastProgress.find(p => p.podcast_id === podcast.id);
      
      console.log(`Podcast ${index + 1}:`, {
        id: podcast.id,
        title: podcast.title,
        hasProgress: !!progress,
        progress: progress ? {
          duration: progress.duration,
          progress_percent: progress.progress_percent
        } : null
      });
      
      // Only include podcasts that have progress data (meaning they've been interacted with)
      if (progress && progress.duration > 0) {
        // Use actual duration from progress data
        const duration = progress.duration;
        
        // Add to total possible time
        totalPossibleSeconds += duration;
        
        // Calculate actual time spent based on progress percentage
        const timeSpent = duration * (progress.progress_percent / 100);
        totalSecondsPlayed += timeSpent;
        
        totalProgress += progress.progress_percent || 0;
        progressCount++;
        
        console.log(`  -> Added to calculation: duration=${duration}, progress=${progress.progress_percent}%, timeSpent=${timeSpent}`);
      } else {
        console.log(`  -> SKIPPED: no progress or zero duration`);
      }
      // Skip podcasts without progress data or duration
    });
    
    // Convert total seconds to hours with decimal precision
    const totalPossibleHours = totalPossibleSeconds / 3600;
    const totalHoursPlayed = totalSecondsPlayed / 3600;
    const averageProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;
    
    console.log('=== CALCULATION RESULTS ===');
    console.log('Total Seconds Played:', totalSecondsPlayed);
    console.log('Total Hours Played:', totalHoursPlayed);
    console.log('Total Possible Seconds:', totalPossibleSeconds);
    console.log('Total Possible Hours:', totalPossibleHours);
    console.log('Progress Count:', progressCount);
    console.log('Average Progress:', averageProgress);
    
    return {
      assignedCourses,
      completedCourses,
      totalHours: Math.round(totalHoursPlayed * 100) / 100, // Round to 2 decimal places for accuracy
      totalPossibleHours: Math.round(totalPossibleHours * 100) / 100, // Total possible hours
      averageProgress,
      // Add detailed stats for KPI drill-down
      totalMinutes: Math.round(totalSecondsPlayed / 60), // Show total minutes played
      totalSecondsPlayed: Math.round(totalSecondsPlayed) // Show total seconds played
    };
  };

  // Prepare chart data with more details
  const prepareChartData = () => {
    const courseProgressData = supabaseData.userCourses.map(uc => {
      const coursePodcasts = podcastProgress.filter(p => 
        p.podcast_id && supabaseData.podcasts.some(podcast => 
          podcast.id === p.podcast_id && podcast.course_id === uc.course_id
        )
      );
      
      const totalProgress = coursePodcasts.reduce((sum, p) => sum + (p.progress_percent || 0), 0);
      const avgProgress = coursePodcasts.length > 0 ? Math.round(totalProgress / coursePodcasts.length) : 0;
      
      // Calculate time spent on this course using only actual durations
      let courseTimeSeconds = 0;
      coursePodcasts.forEach(progress => {
        // Only count time for podcasts with actual duration data
        if (progress.duration > 0) {
          const timeSpent = progress.duration * (progress.progress_percent / 100);
          courseTimeSeconds += timeSpent;
        }
      });
      
      return {
        name: uc.courses.title.length > 15 ? `${uc.courses.title.substring(0, 15)}...` : uc.courses.title,
        progress: avgProgress,
        timeSpent: Math.round(courseTimeSeconds / 60), // Time spent in minutes
        modulesCompleted: coursePodcasts.filter(p => (p.progress_percent || 0) >= 100).length,
        totalModules: coursePodcasts.length
      };
    });
    
    // Progress distribution data - more accurate identification of in-progress courses
    const progressDistribution = [
      { 
        name: 'Not Started', 
        value: supabaseData.userCourses.filter(uc => {
          const courseProgress = podcastProgress.filter(p => 
            supabaseData.podcasts.some(podcast => 
              podcast.id === p.podcast_id && podcast.course_id === uc.course_id
            )
          );
          return courseProgress.length === 0 || courseProgress.every(p => (p.progress_percent || 0) === 0);
        }).length 
      },
      { 
        name: 'In Progress', 
        value: supabaseData.userCourses.filter(uc => {
          const courseProgress = podcastProgress.filter(p => 
            supabaseData.podcasts.some(podcast => 
              podcast.id === p.podcast_id && podcast.course_id === uc.course_id
            )
          );
          // A course is in progress if at least one podcast has progress > 0 and < 100
          return courseProgress.some(p => (p.progress_percent || 0) > 0 && (p.progress_percent || 0) < 100);
        }).length 
      },
      { 
        name: 'Completed', 
        value: supabaseData.userCourses.filter(uc => {
          const courseProgress = podcastProgress.filter(p => 
            supabaseData.podcasts.some(podcast => 
              podcast.id === p.podcast_id && podcast.course_id === uc.course_id
            )
          );
          // A course is completed if all podcasts have 100% progress
          return courseProgress.length > 0 && courseProgress.every(p => (p.progress_percent || 0) >= 100);
        }).length 
      }
    ];
    
    return { courseProgressData, progressDistribution };
  };

  const { assignedCourses, completedCourses, totalHours, totalPossibleHours, averageProgress, totalMinutes, totalSecondsPlayed } = calculateKPIs();
  const { courseProgressData, progressDistribution } = prepareChartData();

  // Colors for pie chart
  const COLORS = ['#8b5cf6', '#f59e0b', '#10b981'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
              <p className="mt-4 text-gray-300">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
            <div className="text-center py-12">
              <div className="text-red-400 mb-4">Error: {error}</div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600/20 backdrop-blur-lg border border-red-500/30 rounded-lg text-red-300 hover:bg-red-600/30 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view - KPIs and charts only
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Glassmorphism Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Learning Dashboard</h1>
              <p className="text-gray-300 mt-1">Track your learning progress and course completion</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              title: 'Assigned Courses', 
              value: assignedCourses, 
              icon: BookOpen, 
              color: 'bg-[#8b5cf6]',
              subtitle: 'Total courses assigned to you'
            },
            { 
              title: 'Completed Courses', 
              value: completedCourses, 
              icon: CheckCircle, 
              color: 'bg-[#10b981]',
              subtitle: 'Courses finished successfully'
            },
            { 
              title: 'Total Hours', 
              value: totalHours, 
              icon: Clock, 
              color: 'bg-[#f59e0b]',
              subtitle: `${totalMinutes} minutes played`
            },
            { 
              title: 'Avg. Progress', 
              value: `${averageProgress}%`, 
              icon: TrendingUp, 
              color: 'bg-[#3b82f6]',
              subtitle: 'Across all courses'
            }
          ].map((card, index) => (
            <div 
              key={index} 
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
              onClick={() => {
                // Show detailed modal when KPI is clicked
                setSelectedKpi(card.title);
                setShowKpiModal(true);
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">{card.title}</p>
                    <p className="text-3xl font-bold mt-2 text-white">{card.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <card.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Course Progress Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
            <h2 className="text-xl font-bold mb-6 text-white">Course Progress</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                  <YAxis stroke="rgba(255,255,255,0.7)" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.5rem'
                    }}
                    formatter={(value, name) => {
                      if (name === 'progress') {
                        return [`${value}%`, 'Progress'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Course: ${label}`}
                  />
                  <Bar dataKey="progress" fill="#8b5cf6" name="Progress %" radius={[4, 4, 0, 0]}>
                    {courseProgressData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.progress >= 100 ? '#10b981' : entry.progress > 0 ? '#f59e0b' : '#6b7280'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Course Details */}
            <div className="mt-6 space-y-4 max-h-60 overflow-y-auto">
              <h3 className="font-medium text-gray-300">Course Details</h3>
              {courseProgressData.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-white">{course.name}</p>
                    <p className="text-sm text-gray-400">
                      {course.modulesCompleted} of {course.totalModules} modules completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{course.progress}%</p>
                    <p className="text-sm text-gray-400">{course.timeSpent} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Distribution Table */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
            <h2 className="text-xl font-bold mb-6 text-white">Progress Distribution</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Courses</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {progressDistribution.map((item, index) => (
                    <tr key={index} className="hover:bg-white/5">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-white">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-white">
                        {item.value}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-white">
                          {supabaseData.userCourses.length > 0 
                            ? `${Math.round((item.value / supabaseData.userCourses.length) * 100)}%` 
                            : '0%'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-white/5 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-white">{supabaseData.userCourses.length}</p>
                <p className="text-sm text-gray-400">Total Courses</p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-white">
                  {progressDistribution.find(item => item.name === 'Completed')?.value || 0}
                </p>
                <p className="text-sm text-gray-400">Completed</p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-white">
                  {Math.round((progressDistribution.find(item => item.name === 'Completed')?.value || 0) / 
                    Math.max(supabaseData.userCourses.length, 1) * 100)}%
                </p>
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recently Accessed Courses */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-6">
          <h2 className="text-xl font-bold mb-6 text-white">Recently Accessed Courses</h2>
          {supabaseData.userCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-white">No courses assigned</h3>
              <p className="mt-1 text-sm text-gray-300">
                Contact your administrator to get access to courses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {supabaseData.userCourses.slice(0, 3).map((userCourse) => {
                const course = userCourse.courses;
                const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === course.id);
                const courseProgressItems = podcastProgress.filter(p => 
                  coursePodcasts.some(podcast => podcast.id === p.podcast_id)
                );
                
                // Calculate course progress
                const totalProgress = courseProgressItems.reduce((sum, p) => sum + (p.progress_percent || 0), 0);
                const progressPercent = courseProgressItems.length > 0 ? Math.round(totalProgress / courseProgressItems.length) : 0;
                
                // Find last accessed time
                const lastAccessed = courseProgressItems.length > 0 
                  ? new Date(Math.max(...courseProgressItems.map(p => new Date(p.last_played_at || 0).getTime())))
                  : null;
                
                return (
                  <div 
                    key={userCourse.course_id}
                    className="bg-white/5 rounded-xl border border-white/10 p-5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => navigate(`/user/courses/${course.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-white line-clamp-2">{course.title}</h3>
                      {course.level && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          course.level === 'Basics' 
                            ? 'bg-green-500/20 text-green-300' 
                            : course.level === 'Intermediate' 
                              ? 'bg-yellow-500/20 text-yellow-300' 
                              : 'bg-red-500/20 text-red-300'
                        }`}>
                          {course.level}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-medium">{progressPercent}%</span>
                      </div>
                      
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-[#8b5cf6] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{coursePodcasts.length} modules</span>
                        {lastAccessed && (
                          <span>Last accessed: {lastAccessed.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPI Drill-down Modal */}
      {showKpiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {selectedKpi} Details
                </h2>
                <button 
                  onClick={() => setShowKpiModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {selectedKpi === 'Assigned Courses' && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Assigned Courses Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Total Assigned</p>
                      <p className="text-3xl font-bold text-white">{assignedCourses}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Completed</p>
                      <p className="text-3xl font-bold text-green-400">{completedCourses}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">In Progress</p>
                      <p className="text-3xl font-bold text-yellow-400">
                        {supabaseData.userCourses.filter(uc => {
                          const courseProgress = podcastProgress.filter(p => 
                            supabaseData.podcasts.some(podcast => 
                              podcast.id === p.podcast_id && podcast.course_id === uc.course_id
                            )
                          );
                          return courseProgress.some(p => (p.progress_percent || 0) > 0 && (p.progress_percent || 0) < 100);
                        }).length}
                      </p>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-white mb-4">Course List</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Course</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Modules</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Progress</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {supabaseData.userCourses.map((userCourse, index) => {
                          const course = userCourse.courses;
                          const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === course.id);
                          const courseProgressItems = podcastProgress.filter(p => 
                            coursePodcasts.some(podcast => podcast.id === p.podcast_id)
                          );
                          
                          // Calculate course progress
                          const totalProgress = courseProgressItems.reduce((sum, p) => sum + (p.progress_percent || 0), 0);
                          const progressPercent = courseProgressItems.length > 0 ? Math.round(totalProgress / courseProgressItems.length) : 0;
                          
                          const status = progressPercent >= 100 ? 'Completed' : progressPercent > 0 ? 'In Progress' : 'Not Started';
                          const statusColor = progressPercent >= 100 ? 'text-green-400' : progressPercent > 0 ? 'text-yellow-400' : 'text-gray-400';
                          
                          return (
                            <tr key={index} className="hover:bg-white/5">
                              <td className="px-4 py-3 whitespace-nowrap text-white">{course.title}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-white">{coursePodcasts.length}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-white">{progressPercent}%</td>
                              <td className={`px-4 py-3 whitespace-nowrap ${statusColor}`}>{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {selectedKpi === 'Total Hours' && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Learning Time Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Total Hours</p>
                      <p className="text-3xl font-bold text-white">{totalHours}</p>
                      <p className="text-sm text-gray-400">Hours played</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Total Possible Hours</p>
                      <p className="text-3xl font-bold text-white">{totalPossibleHours}</p>
                      <p className="text-sm text-gray-400">If all content completed</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Completion Rate</p>
                      <p className="text-3xl font-bold text-white">
                        {totalPossibleHours > 0 ? Math.round((totalHours / totalPossibleHours) * 100) : 0}%
                      </p>
                      <p className="text-sm text-gray-400">Of total content</p>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-white mb-4">Time Distribution by Course</h4>
                  <div className="h-80 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={courseProgressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '0.5rem'
                          }}
                          formatter={(value) => [`${value} min`, 'Time Spent']}
                        />
                        <Bar dataKey="timeSpent" fill="#f59e0b" name="Time Spent (min)">
                          {courseProgressData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.timeSpent > 0 ? '#f59e0b' : '#6b7280'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-white mb-4">Learning Progression</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={courseProgressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '0.5rem'
                          }}
                          formatter={(value) => [`${value}%`, 'Progress']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="progress" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              {selectedKpi === 'Completed Courses' && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Course Completion Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Completed Courses</p>
                      <p className="text-3xl font-bold text-green-400">{completedCourses}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Completion Rate</p>
                      <p className="text-3xl font-bold text-white">
                        {assignedCourses > 0 ? Math.round((completedCourses / assignedCourses) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-white mb-4">Completed Courses</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Course</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Time Spent</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {supabaseData.userCourses.filter(uc => {
                          const courseProgress = podcastProgress.filter(p => 
                            supabaseData.podcasts.some(podcast => 
                              podcast.id === p.podcast_id && podcast.course_id === uc.course_id
                            )
                          );
                          return courseProgress.length > 0 && courseProgress.every(p => (p.progress_percent || 0) >= 100);
                        }).map((userCourse, index) => {
                          const course = userCourse.courses;
                          const coursePodcasts = supabaseData.podcasts.filter(p => p.course_id === course.id);
                          const courseProgressItems = podcastProgress.filter(p => 
                            coursePodcasts.some(podcast => podcast.id === p.podcast_id)
                          );
                          
                          // Calculate time spent
                          let courseTimeSeconds = 0;
                          courseProgressItems.forEach(progress => {
                            // Only count time for podcasts with actual duration data
                            if (progress.duration > 0) {
                              const timeSpent = progress.duration * (progress.progress_percent / 100);
                              courseTimeSeconds += timeSpent;
                            }
                          });
                          
                          return (
                            <tr key={index} className="hover:bg-white/5">
                              <td className="px-4 py-3 whitespace-nowrap text-white">{course.title}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-white">{Math.round(courseTimeSeconds / 60)} minutes</td>
                              <td className="px-4 py-3 whitespace-nowrap text-green-400">Completed</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {selectedKpi === 'Avg. Progress' && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Average Progress Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Average Progress</p>
                      <p className="text-3xl font-bold text-white">{averageProgress}%</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                      <p className="text-gray-300">Courses with Progress</p>
                      <p className="text-3xl font-bold text-white">
                        {supabaseData.userCourses.filter(uc => {
                          const courseProgress = podcastProgress.filter(p => 
                            supabaseData.podcasts.some(podcast => 
                              podcast.id === p.podcast_id && podcast.course_id === uc.course_id
                            )
                          );
                          return courseProgress.some(p => (p.progress_percent || 0) > 0);
                        }).length}
                      </p>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-white mb-4">Progress Distribution</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={courseProgressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '0.5rem'
                          }}
                          formatter={(value) => [`${value}%`, 'Progress']}
                        />
                        <Bar dataKey="progress" fill="#3b82f6" name="Progress %">
                          {courseProgressData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.progress >= 100 ? '#10b981' : entry.progress > 0 ? '#f59e0b' : '#6b7280'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
