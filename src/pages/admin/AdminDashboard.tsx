import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Clock, CheckCircle, BarChart3, TrendingUp } from 'lucide-react';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  company_id: string;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  company_id: string;
  created_at: string;
  level?: string;
}

interface PDF {
  id: string;
  title: string;
  course_id: string;
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

interface PDFAssignment {
  id: string;
  user_id: string;
  pdf_id: string;
  assigned_by: string;
  assigned_at: string;
}

interface PodcastAssignment {
  id: string;
  user_id: string;
  podcast_id: string;
  assigned_by: string;
  assigned_at: string;
}

export default function AdminDashboard({ userEmail = '' }: { userEmail?: string }) {
  const [supabaseData, setSupabaseData] = useState<{
    companies: Company[];
    users: User[];
    courses: Course[];
    pdfs: PDF[];
    podcasts: Podcast[];
    userCourses: UserCourse[];
    pdfAssignments: PDFAssignment[];
    podcastAssignments: PodcastAssignment[];
  }>({
    companies: [],
    users: [],
    courses: [],
    pdfs: [],
    podcasts: [],
    userCourses: [],
    pdfAssignments: [],
    podcastAssignments: []
  });
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [podcastProgress, setPodcastProgress] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalHours: 0,
    activeUsers: 0
  });

  const loadDashboardData = async (adminId: string, companyId: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if admin still exists
      const { data: adminExists, error: adminCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', adminId)
        .eq('role', 'admin')
        .single();
      
      if (adminCheckError || !adminExists) {
        // Admin no longer exists, reset all KPIs to zero
        console.log('Admin not found, resetting KPIs to zero');
        setRealTimeMetrics({
          totalUsers: 0,
          totalCourses: 0,
          totalHours: 0,
          activeUsers: 0
        });
        setSupabaseData({
          companies: [],
          users: [],
          courses: [],
          pdfs: [],
          podcasts: [],
          userCourses: [],
          pdfAssignments: [],
          podcastAssignments: []
        });
        setUserProfiles([]);
        setPodcastProgress([]);
        setAssignedCourses([]);
        setAvailableCourses([]);
        setLoading(false);
        return;
      }
      
      // Load assigned content for this admin
      let pdfAssignmentsData = [];
      let podcastAssignmentsData = [];
      
      if (adminId) {
        // Get PDF assignments assigned TO this admin (by SuperAdmins)
        const { data: pdfAssignments } = await supabase
          .from('pdf_assignments')
          .select('*, pdfs!inner(*)')
          .eq('user_id', adminId);
        
        pdfAssignmentsData = pdfAssignments || [];
        
        // Get podcast assignments assigned TO this admin (by SuperAdmins)
        const { data: podcastAssignments } = await supabase
          .from('podcast_assignments')
          .select('*, podcasts!inner(*)')
          .eq('user_id', adminId);
          
        podcastAssignmentsData = podcastAssignments || [];
      }
      
      const [companiesData, usersData, coursesData, pdfsData, podcastsData, userCoursesData, userProfilesData] = await Promise.all([
        supabaseHelpers.getCompanies(),
        companyId ? supabaseHelpers.getUsersByCompany(companyId) : supabaseHelpers.getUsers(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getAllUserCourses(),
        supabaseHelpers.getAllUserProfiles()
      ]);
      
      // Load podcast progress
      let progressData = [];
      try {
        const { data } = await supabase
          .from('podcast_progress')
          .select('*');
        progressData = data || [];
      } catch (progressError) {
        console.error('Error loading podcast progress:', progressError);
        progressData = [];
      }
      
      setSupabaseData({
        companies: companiesData || [],
        users: usersData || [],
        courses: coursesData || [],
        pdfs: pdfsData || [],
        podcasts: podcastsData || [],
        userCourses: userCoursesData || [],
        pdfAssignments: pdfAssignmentsData || [],
        podcastAssignments: podcastAssignmentsData || []
      });
      
      setUserProfiles(userProfilesData || []);
      setPodcastProgress(progressData || []);
      
      // Show courses that are already assigned to users in admin's company
      const adminUsers = companyId 
        ? (usersData || []).filter((user: User) => user.role === 'user' && user.company_id === companyId)
        : (usersData || []).filter((user: User) => user.role === 'user');
      
      const adminUserIds = adminUsers.map((user: User) => user.id);
      const adminUserCourses = (userCoursesData || []).filter((uc: UserCourse) => 
        adminUserIds.includes(uc.user_id)
      );
      
      const assignedCourseIds = new Set(adminUserCourses.map((uc: UserCourse) => uc.course_id));
      const assignedCourses = (coursesData || []).filter((course: Course) => 
        assignedCourseIds.has(course.id)
      );
      
      // Show only courses that have content assigned to this admin by SuperAdmins
      const adminAssignedCourseIds = new Set([
        ...pdfAssignmentsData.map((assignment: any) => assignment.pdf?.course_id),
        ...podcastAssignmentsData.map((assignment: any) => assignment.podcast?.course_id)
      ].filter(Boolean));
      
      const availableCourses = (coursesData || []).filter((course: Course) => 
        adminAssignedCourseIds.has(course.id)
      );
      
      // Calculate total hours from actual podcast durations - only for assigned content
      let totalHours = 0;
      if (podcastAssignmentsData && podcastAssignmentsData.length > 0) {
        // Sum up durations of only assigned podcasts
        const assignedPodcastIds = new Set(podcastAssignmentsData.map((assignment: any) => assignment.podcast_id));
        const assignedPodcasts = podcastsData.filter((podcast: any) => 
          assignedPodcastIds.has(podcast.id) && podcast.duration && podcast.duration > 0
        );
        
        const totalPodcastSeconds = assignedPodcasts.reduce((total: number, podcast: any) => {
          return total + podcast.duration;
        }, 0);
        
        // Convert to hours
        totalHours = Math.round(totalPodcastSeconds / 3600 * 10) / 10;
      }
      
      // Active users are those who have any course assignments or progress
      const usersWithCourses = new Set(adminUserCourses.map((uc: UserCourse) => uc.user_id));
      const usersWithProgress = new Set(progressData.filter((progress: any) => 
        progress.progress_percent > 0).map((progress: any) => progress.user_id));
      const activeUsers = new Set([...usersWithCourses, ...usersWithProgress]).size;
      
      // Fix KPI calculation - count total course assignments, not unique courses
      const totalCourseAssignments = adminUserCourses.length;
      
      setAssignedCourses(assignedCourses);
      setAvailableCourses(availableCourses);
      setRealTimeMetrics({
        totalUsers: adminUsers.length,
        totalCourses: totalCourseAssignments, // Changed from assignedCourseIds.size
        totalHours: totalHours,
        activeUsers: activeUsers
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('users', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('user-courses', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('courses', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('podcast-progress', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('companies', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('user-profiles', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('podcasts', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('pdfs', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('content-categories', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('podcast-assignments', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('podcast-likes', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('activity-logs', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('logos', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  useRealtimeSync('documents', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  
  useRealtimeSync('pdf_assignments', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });
  
  useRealtimeSync('podcast_assignments', () => {
    if (adminId && companyId) {
      loadDashboardData(adminId, companyId);
    }
  });

  useEffect(() => {
    const getAdminInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAdminId(user.id);
          
          // Get admin's company
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single();
          
        if (!userError && userData) {
          setCompanyId(userData.company_id);
          loadDashboardData(user.id, userData.company_id);
        } else if (userError) {
          // Admin no longer exists in the database
          console.log('Admin not found in database, resetting KPIs to zero');
          setRealTimeMetrics({
            totalUsers: 0,
            totalCourses: 0,
            totalHours: 0,
            activeUsers: 0
          });
          setSupabaseData({
            companies: [],
            users: [],
            courses: [],
            pdfs: [],
            podcasts: [],
            userCourses: [],
            pdfAssignments: [],
            podcastAssignments: []
          });
          setUserProfiles([]);
          setPodcastProgress([]);
          setAssignedCourses([]);
          setAvailableCourses([]);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error getting admin info:', error);
    }
  };
    
    getAdminInfo();
  }, []);

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
              onClick={() => adminId && loadDashboardData(adminId, companyId)}
              className="custom-button mt-2"
            >
              <span className="shadow"></span>
              <span className="edge"></span>
              <span className="front">
                <span className="text-sm text-red-700 hover:text-red-500">Try again</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">Overview of your learning management system.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Users', value: realTimeMetrics.totalUsers, icon: Users, color: 'bg-purple-600' },
            { title: 'Total Courses', value: realTimeMetrics.totalCourses, icon: BookOpen, color: 'bg-purple-600' },
            { title: 'Total Hours', value: realTimeMetrics.totalHours.toFixed(1), icon: Clock, color: 'bg-purple-600' },
            { title: 'Active Users', value: realTimeMetrics.activeUsers, icon: CheckCircle, color: 'bg-purple-600' }
          ].map((card, index) => (
            <div key={index} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-purple-600 rounded-md p-3 dark:bg-purple-700">
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{card.title}</dt>
                      <dd className="text-2xl font-semibold text-black dark:text-white">{card.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* User Progress Overview */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-black dark:text-white">User Progress Overview</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {supabaseData.users.filter((user: any) => user.role === 'user' && (!companyId || user.company_id === companyId)).length > 0 ? (
                supabaseData.users.filter((user: any) => user.role === 'user' && (!companyId || user.company_id === companyId)).slice(0, 5).map((user: any, index: number) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-100 rounded-lg dark:bg-gray-700">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-black dark:text-white">
                          {userProfiles.find(p => p.user_id === user.id)?.full_name || user.email}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {supabaseData.userCourses.filter(uc => uc.user_id === user.id).length} courses enrolled
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {(() => {
                        const userCourseCount = supabaseData.userCourses.filter(uc => uc.user_id === user.id).length;
                        const userProgress = podcastProgress.filter(p => p.user_id === user.id);
                        const avgProgress = userProgress.length > 0 
                          ? Math.round(userProgress.reduce((sum, p) => sum + (p.progress_percent || 0), 0) / userProgress.length)
                          : 0;
                        
                        return (
                          <>
                      <div className="w-24 bg-gray-300 rounded-full h-2 mr-3 dark:bg-gray-600">
                              <div className="bg-purple-600 h-2 rounded-full dark:bg-purple-700" style={{ width: `${avgProgress}%` }}></div>
                      </div>
                            <span className="text-sm font-medium text-black dark:text-white">{avgProgress}%</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4">No users assigned yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Companies Overview */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-black dark:text-white">Companies Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300">
                    Courses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {supabaseData.companies.length > 0 ? (
                  supabaseData.companies.map((company: any, index: number) => (
                    <tr key={company.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-700'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black dark:text-white">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white">
                        {(supabaseData.users || []).filter((u: any) => u.company_id === company.id).length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white">
                        {(() => {
                          const companyUsers = (supabaseData.users || []).filter((u: any) => u.company_id === company.id);
                          const companyUserIds = companyUsers.map(u => u.id);
                          const companyUserCourses = (supabaseData.userCourses || []).filter((uc: any) => 
                            companyUserIds.includes(uc.user_id)
                          );
                          const uniqueCourses = new Set(companyUserCourses.map(uc => uc.course_id));
                          return uniqueCourses.size;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white">
                        {new Date(company.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      No companies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}