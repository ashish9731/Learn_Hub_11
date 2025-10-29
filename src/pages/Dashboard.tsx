import React, { useState, useEffect } from 'react';
import { UserCog, Users, BookOpen, Play, Clock, BarChart3, Headphones, FileText, Building2 } from 'lucide-react';
import { supabaseHelpers } from '../hooks/useSupabase';
import { useRealtimeSync } from '../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  company_id: string | null;
  image_url: string | null;
  created_at: string;
  level?: string;
}

interface PDF {
  id: string;
  title: string;
  course_id: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  company_id: string;
  created_at: string;
}

interface Podcast {
  id: string;
  title: string;
  course_id: string;
  created_at: string;
}

interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  completed: boolean;
  completion_date: string;
}

export default function Dashboard() {
  const [supabaseData, setSupabaseData] = useState<{
    companies: Company[];
    courses: Course[];
    pdfs: PDF[];
    users: User[];
    podcasts: Podcast[];
    userCourses: UserCourse[];
  }>({
    companies: [],
    courses: [],
    pdfs: [],
    users: [],
    podcasts: [],
    userCourses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [podcastProgress, setPodcastProgress] = useState<any[]>([]);
  const [totalCompletedHours, setTotalCompletedHours] = useState(0);
  const navigate = useNavigate();
  const [userMetrics, setUserMetrics] = useState<any[]>([]);
  const [realTimeKPIs, setRealTimeKPIs] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    totalPodcasts: 0,
    totalLearningHours: 0,
    totalCompanies: 0,
    totalCourses: 0,
    activeUsers: 0
  });

  const loadSupabaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading Supabase data...');
      
      const [companiesData, coursesData, pdfsData, usersData, podcastsData, userCoursesData] = await Promise.all([
        supabaseHelpers.getCompanies(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getUsers(),
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getAllUserCourses()
      ]);
      
      setSupabaseData({
        companies: companiesData,
        courses: coursesData,
        pdfs: pdfsData,
        users: usersData,
        podcasts: podcastsData,
        userCourses: userCoursesData
      });
      
      // Load user metrics using the secure RPC function
      try {
        const { data: metricsData, error: metricsError } = await supabase
          .rpc('list_all_user_metrics')
          .select();
        
        if (metricsError) {
          if (metricsError.code !== 'PGRST116') {
            console.error('Error fetching user metrics via RPC:', metricsError);
          }
          // Try fallback method
          try {
            // Use a simple query instead of the view
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('users')
              .select('id, email')
              .eq('role', 'user');
              
            if (!fallbackError) {
              setUserMetrics(fallbackData || []);
              
              // Calculate total learning hours
              const totalHours = (fallbackData || []).reduce((sum: number, metric: any) => 
                sum + (metric.total_hours || 0), 0);
              setTotalCompletedHours(totalHours);
            } else {
              console.error('Fallback error fetching user metrics:', fallbackError);
              setUserMetrics([]);
              setTotalCompletedHours(0);
            }
          } catch (fallbackException) {
            console.error('Exception in fallback user fetch:', fallbackException);
            setUserMetrics([]);
            setTotalCompletedHours(0);
          }
        } else {
          setUserMetrics(metricsData || []);
        }
      } catch (err) {
        console.error('Exception fetching user metrics:', err);
        setUserMetrics([]);
      }

      // Load podcast progress
      loadPodcastProgress();
      
      // Calculate real-time KPIs
      const totalAdmins = usersData.filter((user: User) => user.role === 'admin').length;
      const totalUsers = usersData.filter((user: User) => user.role === 'user').length;
      const totalCourses = coursesData.length;
      const totalPodcasts = podcastsData.length;
      const totalCompanies = companiesData.length;
      
      // Calculate total learning hours from user metrics
      const totalLearningHours = Math.round((userMetrics?.reduce((sum: number, metric: any) => sum + (metric.total_hours || 0), 0) || 0) * 10) / 10;
      
      // Calculate active users (users with course assignments or progress)
      const usersWithAssignments = new Set(userCoursesData?.map((uc: UserCourse) => uc.user_id) || []);
      const usersWithProgress = new Set(podcastProgress?.map((p: any) => p.user_id) || []);
      const activeUsers = new Set([...usersWithAssignments, ...usersWithProgress]).size;
      
      setRealTimeKPIs({
        totalAdmins,
        totalUsers,
        totalPodcasts,
        totalLearningHours,
        totalCompanies,
        totalCourses,
        activeUsers
      });
      
    } catch (error: any) {
      console.error('Failed to load Supabase data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      });
      setError(`Failed to load dashboard data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('companies', loadSupabaseData);
  useRealtimeSync('users', loadSupabaseData);
  useRealtimeSync('courses', loadSupabaseData);
  useRealtimeSync('podcasts', loadSupabaseData);
  useRealtimeSync('pdfs', loadSupabaseData);
  useRealtimeSync('podcast-progress', loadSupabaseData);
  useRealtimeSync('user-courses', loadSupabaseData);
  useRealtimeSync('content-categories', loadSupabaseData);
  useRealtimeSync('podcast-assignments', loadSupabaseData);
  useRealtimeSync('user-profiles', loadSupabaseData);
  useRealtimeSync('podcast-likes', loadSupabaseData);
  useRealtimeSync('logos', loadSupabaseData);
  useRealtimeSync('activity-logs', loadSupabaseData);
  useRealtimeSync('chat-history', loadSupabaseData);
  useRealtimeSync('temp-passwords', loadSupabaseData);
  useRealtimeSync('user-registrations', loadSupabaseData);
  useRealtimeSync('approval-logs', loadSupabaseData);
  useRealtimeSync('audit-logs', loadSupabaseData);
  useRealtimeSync('contact-messages', loadSupabaseData);

  useEffect(() => {
    loadSupabaseData();
  }, []);

  const loadPodcastProgress = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_all_podcast_progress');
        
      if (error) {
        // Try fallback method
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('podcast_progress')
          .select('*');
          
        if (fallbackError) {
          console.error('Fallback error loading podcast progress:', fallbackError);
          setPodcastProgress([]);
          setTotalCompletedHours(0);
          return;
        }
        
        if (fallbackData && fallbackData.length > 0) {
          setPodcastProgress(fallbackData);
          
          // Calculate total learning hours
          const totalSeconds = fallbackData.reduce((total: number, item: any) => {
            // Calculate actual listened time based on progress percentage
            const duration = typeof item.duration === 'string' ? parseFloat(item.duration) : (item.duration || 0);
            const progressPercent = item.progress_percent || 0;
            return total + (duration * (progressPercent / 100));
          }, 0);
          
          // Convert seconds to hours
          setTotalCompletedHours(Math.round(totalSeconds / 3600 * 10) / 10);
        } else {
          setPodcastProgress([]);
          setTotalCompletedHours(0);
        }
        return;
      }
      
      if (data && data.length > 0) {
        setPodcastProgress(data);
        
        // Calculate total learning hours
        const totalSeconds = data.reduce((total: number, item: any) => {
          // Calculate actual listened time based on progress percentage
          const duration = typeof item.duration === 'string' ? parseFloat(item.duration) : (item.duration || 0);
          const progressPercent = item.progress_percent || 0;
          return total + (duration * (progressPercent / 100));
        }, 0);
        
        // Convert seconds to hours
        setTotalCompletedHours(Math.round(totalSeconds / 3600 * 10) / 10);
      } else {
        setPodcastProgress([]);
        setTotalCompletedHours(0);
      }
    } catch (error) {
      console.error('Error loading podcast progress:', error);
      setPodcastProgress([]);
      setTotalCompletedHours(0);
    }
  };

  // Calculate metrics from Supabase data only
  const totalAdmins = supabaseData.users.filter((user: User) => user.role === 'admin').length;
  const totalUsers = supabaseData.users.filter((user: User) => user.role === 'user').length;
  const totalCourses = supabaseData.courses?.length || 0;
  const totalPodcasts = supabaseData.podcasts?.length || 0;
  const totalPDFs = supabaseData.pdfs?.length || 0;
  const totalCompanies = supabaseData.companies?.length || 0;
  
  // Calculate total learning hours from user metrics
  const totalLearningHours = Math.round((userMetrics?.reduce((sum: number, metric: any) => sum + (metric.total_hours || 0), 0) || 0) * 10) / 10;
  
  // Calculate user course assignments
  const totalUserCourses = supabaseData.userCourses?.length || 0;
  const uniqueAssignedCourses = new Set(supabaseData.userCourses?.map((uc: UserCourse) => uc.course_id) || []).size;
  
  // Calculate active users (users with course assignments or progress)
  const usersWithAssignments = new Set(supabaseData.userCourses?.map((uc: UserCourse) => uc.user_id) || []);
  const usersWithProgress = new Set(podcastProgress?.map((p: any) => p.user_id) || []);
  const activeUsers = new Set([...usersWithAssignments, ...usersWithProgress]).size;

  useEffect(() => {
    loadSupabaseData();
  }, []);
  
  // Set up realtime subscription for podcast progress
  useEffect(() => {
    // Real-time subscription is now handled in the main useEffect
  }, []);

  const loadUserMetrics = async () => {
    try {
      const { data, error } = await supabase
        .rpc('list_all_user_metrics');
      
      if (error) {
        console.error('Error fetching user metrics via RPC:', error);
        // Try fallback method
        try {
          const { data: fallbackData, error: metricsError } = await supabase
            .from('user_metrics')
            .select('*');
            
          if (!metricsError) {
            setUserMetrics(fallbackData || []);
            
            // Calculate total learning hours
            const totalHours = fallbackData?.reduce((sum, metric) => 
              sum + (metric.total_hours || 0), 0) || 0;
            setTotalCompletedHours(totalHours);
          } else {
            console.error('Fallback error fetching user metrics:', metricsError);
            setUserMetrics([]);
            setTotalCompletedHours(0);
          }
        } catch (fallbackException) {
          console.error('Exception in fallback metrics fetch:', fallbackException);
          setUserMetrics([]);
          setTotalCompletedHours(0);
        }
      } else {
        setUserMetrics(data || []);
        
        // Calculate total learning hours
        const totalHours = (data || []).reduce((sum: number, metric: any) => 
          sum + (metric.total_hours || 0), 0);
          
        setTotalCompletedHours(totalHours);
      }
    } catch (error) {
      console.error('Error loading user metrics:', error);
      setUserMetrics([]);
      setTotalCompletedHours(0);
    }
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'addAdmin':
        navigate('/admins');
        break;
      case 'addUser':
        navigate('/users');
        break;
      case 'uploadContent':
        navigate('/content');
        break;
      default:
        break;
    }
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
              onClick={loadSupabaseData}
              className="mt-2 text-sm text-red-700 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get unique companies from Supabase data
  const companyData = (supabaseData.companies || []).map((company: any) => ({
    name: company.name,
    userCount: (supabaseData.users || [])
      .filter((user: any) => user.company_id === company.id && user.role === 'user').length,
    courseCount: (supabaseData.courses || []).filter((course: any) => course.company_id === company.id).length,
    adminCount: (supabaseData.users || [])
      .filter((user: any) => user.role === 'admin' && user.company_id === company.id).length
  }));

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">Dashboard</h2>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={loadSupabaseData}
              className="inline-flex items-center px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Companies', value: realTimeKPIs.totalCompanies, icon: Building2, color: 'bg-[#8b5cf6]', route: '/companies' },
            { title: 'Total Admins', value: realTimeKPIs.totalAdmins, icon: UserCog, color: 'bg-[#8b5cf6]', route: '/admins' },
            { title: 'Total Users', value: realTimeKPIs.totalUsers, icon: Users, color: 'bg-[#8b5cf6]', route: '/users' },
            { title: 'Learning Hours', value: realTimeKPIs.totalLearningHours.toFixed(1), icon: Clock, color: 'bg-[#8b5cf6]', route: '/analytics' }
          ].map((card, index) => (
            <div 
              key={index}
              className="bg-[#1e1e1e] overflow-visible shadow-sm rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer transform hover:scale-105 border border-[#333333]"
              onClick={() => navigate(card.route)}
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${card.color} rounded-md p-3`}>
                      <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="card-title text-sm font-medium text-gray-300">
                        {card.title}
                      </dt>
                      <dd className="text-2xl font-semibold text-white">{card.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="bg-[#1e1e1e] shadow-sm rounded-lg border border-[#333333]">
            <div className="px-6 py-4 border-b border-[#333333]">
              <h3 className="text-lg font-medium text-white">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {realTimeKPIs.totalAdmins > 0 && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserCog className="h-5 w-5 text-[#8b5cf6]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-300">
                        {realTimeKPIs.totalAdmins} admin{realTimeKPIs.totalAdmins !== 1 ? 's' : ''} in system
                      </p>
                    </div>
                  </div>
                )}
                
                {realTimeKPIs.totalUsers > 0 && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-[#8b5cf6]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-300">
                        {realTimeKPIs.totalUsers} user{realTimeKPIs.totalUsers !== 1 ? 's' : ''} registered
                      </p>
                    </div>
                  </div>
                )}
                
                {realTimeKPIs.totalCourses > 0 && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-[#8b5cf6]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-300">
                        {realTimeKPIs.totalCourses} course{realTimeKPIs.totalCourses !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                )}

                {realTimeKPIs.totalPodcasts > 0 && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Headphones className="h-5 w-5 text-[#8b5cf6]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-300">
                        {realTimeKPIs.totalPodcasts} podcast{realTimeKPIs.totalPodcasts !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                )}

                {supabaseData.pdfs.length > 0 && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-[#8b5cf6]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-300">
                        {supabaseData.pdfs.length} document{supabaseData.pdfs.length !== 1 ? 's' : ''} uploaded
                      </p>
                    </div>
                  </div>
                )}

                {realTimeKPIs.totalAdmins === 0 && realTimeKPIs.totalUsers === 0 && realTimeKPIs.totalCourses === 0 && realTimeKPIs.totalPodcasts === 0 && supabaseData.pdfs.length === 0 && (
                  <p className="text-center text-gray-400 py-4">No activity yet</p>
                )}
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-[#1e1e1e] shadow-sm rounded-lg border border-[#333333]">
            <div className="px-6 py-4 border-b border-[#333333]">
              <h3 className="text-lg font-medium text-white">System Status</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Admins</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    realTimeKPIs.totalAdmins > 0 ? 'bg-green-900/30 text-green-400' : 'bg-[#252525] text-gray-400'
                  }`}>
                    {realTimeKPIs.totalAdmins > 0 ? 'Active' : 'None'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Users</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    realTimeKPIs.totalUsers > 0 ? 'bg-green-900/30 text-green-400' : 'bg-[#252525] text-gray-400'
                  }`}>
                    {realTimeKPIs.totalUsers > 0 ? 'Active' : 'None'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Content</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    realTimeKPIs.totalCourses > 0 ? 'bg-green-900/30 text-green-400' : 'bg-[#252525] text-gray-400'
                  }`}>
                    {realTimeKPIs.totalCourses > 0 ? 'Available' : 'None'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Podcasts</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    realTimeKPIs.totalPodcasts > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-[#252525] text-gray-400'
                  }`}>
                    {realTimeKPIs.totalPodcasts > 0 ? `${realTimeKPIs.totalPodcasts} Available` : 'None'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Companies</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    realTimeKPIs.totalCompanies > 0 ? 'bg-purple-900/30 text-purple-400' : 'bg-[#252525] text-gray-400'
                  }`}>
                    {realTimeKPIs.totalCompanies > 0 ? `${realTimeKPIs.totalCompanies} Active` : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#1e1e1e] shadow-sm rounded-lg border border-[#333333]">
            <div className="px-6 py-4 border-b border-[#333333]">
              <h3 className="text-lg font-medium text-white">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <button 
                  className="w-full text-left p-3 border border-[#333333] rounded-lg hover:bg-[#252525] transition-colors"
                  onClick={() => handleQuickAction('addAdmin')}
                >
                  <div className="flex items-center">
                    <UserCog className="h-5 w-5 text-[#8b5cf6] mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Add Admin</h4>
                      <p className="text-xs text-[#a0a0a0]">Create new administrator</p>
                    </div>
                  </div>
                </button>
                
                <button 
                  className="w-full text-left p-3 border border-[#333333] rounded-lg hover:bg-[#252525] transition-colors"
                  onClick={() => handleQuickAction('addUser')}
                >
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-[#8b5cf6] mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Add User</h4>
                      <p className="text-xs text-[#a0a0a0]">Create new user account</p>
                    </div>
                  </div>
                </button>
                
                <button 
                  className="w-full text-left p-3 border border-[#333333] rounded-lg hover:bg-[#252525] transition-colors"
                  onClick={() => handleQuickAction('analytics')}
                >
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 text-[#8b5cf6] mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-white">View Analytics</h4>
                      <p className="text-xs text-[#a0a0a0]">Check system performance</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}