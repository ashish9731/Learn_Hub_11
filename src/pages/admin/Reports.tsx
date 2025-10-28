import React, { useState } from 'react';
import { BarChart3, Users, BookOpen, Clock, Download, Filter, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function Reports() {
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [userCourses, setUserCourses] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [timeFilter, setTimeFilter] = useState('last30days');
  const [podcastProgress, setPodcastProgress] = useState<any[]>([]);
  const [userMetrics, setUserMetrics] = useState<any[]>([]);
  const [totalCompletedHours, setTotalCompletedHours] = useState(0);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersData, coursesData, companiesData, podcastsData] = await Promise.all([
        supabaseHelpers.getUsers(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getCompanies(),
        supabaseHelpers.getPodcasts()
      ]);
      
      // Get userCourses data separately with error handling
      let userCoursesResult = [];
      try {
        userCoursesResult = await supabaseHelpers.getAllUserCourses();
      } catch (userCoursesError) {
        console.error('Error loading user courses:', userCoursesError);
        userCoursesResult = [];
      }
      
      setUsers(usersData || []);
      setCourses(coursesData || []);
      setPodcasts(podcastsData || []);
      setCompanies(companiesData || []);
      setUserCourses(userCoursesResult || []);
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const loadPodcastProgress = async () => {
    try {
      // Prepare date filter
      let dateFilter = '';
      const now = new Date();
      
      if (timeFilter === 'last7days') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        dateFilter = sevenDaysAgo.toISOString().split('T')[0];
      } else if (timeFilter === 'last30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        dateFilter = thirtyDaysAgo.toISOString().split('T')[0];
      } else if (timeFilter === 'last90days') {
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        dateFilter = ninetyDaysAgo.toISOString().split('T')[0];
      } else if (timeFilter === 'last1year') {
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        dateFilter = oneYearAgo.toISOString().split('T')[0];
      }
      
      // Build query with date filter if needed
      let query = supabase
        .from('podcast_progress')
        .select(`
          *,
          podcasts (
            id,
            title,
            course_id
          ),
          users (
            id,
            email,
            role,
            company_id
          )
        `)
        .order('last_played_at', { ascending: false });
      
      if (dateFilter !== '') {
        query = query.gte('last_played_at', dateFilter + 'T00:00:00');
      }
      
      const { data, error } = await query;
        
      if (error) {
        console.error('Error loading podcast progress:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setPodcastProgress(data);
        
        // Calculate user metrics
        const userMap: Record<string, any> = {};
        
        data.forEach(progress => {
          const userId = progress.user_id;
          if (!userMap[userId]) {
            userMap[userId] = {
              userId,
              email: progress.users?.email || 'Unknown',
              totalTime: 0,
              podcastsListened: new Set(),
              coursesAccessed: new Set(),
              lastActivity: progress.last_played_at
            };
          }
          
          // Add podcast to set
          userMap[userId].podcastsListened.add(progress.podcast_id);
          
          // Add course to set if available
          if (progress.podcasts?.course_id) {
            userMap[userId].coursesAccessed.add(progress.podcasts.course_id);
          }
          
          // Calculate time spent
          const duration = progress.duration || 0;
          const progressPercent = progress.progress_percent || 0;
          userMap[userId].totalTime += (duration * (progressPercent / 100));
          
          // Update last activity if more recent
          if (new Date(progress.last_played_at) > new Date(userMap[userId].lastActivity)) {
            userMap[userId].lastActivity = progress.last_played_at;
          }
        });
        
        // Convert to array and format for display
        const userMetricsArray = Object.values(userMap).map((user: any) => ({
          ...user,
          totalHours: Math.round((user.totalTime / 3600) * 10) / 10, // Convert seconds to hours
          podcastsListened: user.podcastsListened.size,
          coursesAccessed: user.coursesAccessed.size,
          lastActivity: new Date(user.lastActivity).toLocaleDateString()
        }));
        
        setUserMetrics(userMetricsArray);
        
        // Calculate total learning hours
        const totalSeconds = data.reduce((total: number, item: any) => {
          // Calculate actual listened time based on progress percentage
          const duration = typeof item.duration === 'string' ? parseFloat(item.duration) : (item.duration || 0);
          const progressPercent = item.progress_percent || 0;
          return total + (duration * (progressPercent / 100));
        }, 0);
        
        // Convert seconds to hours
        setTotalCompletedHours(Math.round(totalSeconds / 3600 * 10) / 10);
      }
    } catch (error) {
      console.error('Error loading podcast progress:', error);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('podcast-progress', () => {
    loadPodcastProgress();
  });
  useRealtimeSync('users', loadReportData);
  useRealtimeSync('courses', loadReportData);
  useRealtimeSync('podcasts', loadReportData);
  useRealtimeSync('user-courses', loadReportData);
  useRealtimeSync('companies', loadReportData);
  useRealtimeSync('user-profiles', loadReportData);
  useRealtimeSync('pdfs', loadReportData);
  useRealtimeSync('content-categories', loadReportData);
  useRealtimeSync('podcast-assignments', loadReportData);
  useRealtimeSync('podcast-likes', loadReportData);
  useRealtimeSync('logos', loadReportData);
  useRealtimeSync('activity-logs', loadReportData);
  useRealtimeSync('temp-passwords', loadReportData);
  useRealtimeSync('user-registrations', loadReportData);
  useRealtimeSync('approval-logs', loadReportData);
  useRealtimeSync('audit-logs', loadReportData);
  useRealtimeSync('chat-history', loadReportData);
  useRealtimeSync('contact-messages', loadReportData);

  React.useEffect(() => {
    loadReportData();
  }, []);
  
  React.useEffect(() => {
    loadPodcastProgress();
  }, [timeFilter]);

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'user-performance', name: 'User Performance', icon: Users },
    { id: 'course-analytics', name: 'Course Analytics', icon: BookOpen },
    { id: 'engagement', name: 'Engagement', icon: TrendingUp }
  ];

  // Filter data for current admin's company
  const adminAssignments = userCourses;

  // Get users assigned to this admin
  const adminUsers = (users || []).filter((user: any) => user.role === 'user');

  // Calculate real metrics
  const totalUsers = adminUsers.length;
  const activeUsers = adminUsers.length; // All users are considered active
  const avgCompletionRate = (podcastProgress || []).length > 0 ? 
    Math.round((podcastProgress || []).reduce((sum, item) => sum + (item.progress_percent || 0), 0) / (podcastProgress || []).length) : 0;
  // Course completion rates from real data
  const courseCompletionData = (courses || []).map((course: any) => {
    // Get all podcasts for this course
    const coursePodcasts = (podcasts || []).filter((p: any) => p.course_id === course.id);
    
    // Get progress for these podcasts
    const podcastIds = coursePodcasts.map((p: any) => p.id);
    const courseProgress = (podcastProgress || []).filter((p: any) => podcastIds.includes(p.podcast_id));
    
    // Calculate completion rate
    const completionRate = courseProgress.length > 0 ? 
      Math.round(courseProgress.reduce((sum, item) => sum + (item.progress_percent || 0), 0) / courseProgress.length) : 0;
    
    return {
      course: course.title,
      enrollment: adminUsers.length,
      completion: Math.round(completionRate * adminUsers.length / 100),
      completionRate
    };
  });

  // User performance data from real users
  const userPerformanceData = adminUsers.map((user: any) => ({
    user: user.email,
    coursesAssigned: (courses || []).length,
    completion: (userMetrics || []).find(u => u.email === user.email)?.podcastsListened || 0,
    hours: (podcastProgress || [])
      .filter(p => p.user_id === user.id)
      .reduce((total, item) => {
        const duration = typeof item.duration === 'string' ? parseFloat(item.duration) : (item.duration || 0);
        const progressPercent = item.progress_percent || 0; 
        return total + ((duration * (progressPercent / 100)) / 3600); // Convert to hours
      }, 0)
  }));

  // Course progress distribution
  const courseProgressData: any[] = []; // Would be populated from actual course data

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const handleExportReport = () => {
    const reportData = {
      reportType: selectedReport,
      timeFilter: timeFilter,
      generatedAt: new Date().toISOString(),
      data: {
        totalUsers,
        activeUsers,
        totalCompletionHours: totalCompletedHours,
        avgCompletionRate,
        userPerformance: userPerformanceData,
        courseAnalytics: courseCompletionData
      }
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading reports...</p>
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
              onClick={loadReportData}
              className="mt-2 text-sm text-red-700 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Total Users', value: totalUsers, icon: Users, color: 'bg-blue-500' },
          { title: 'Active Users', value: activeUsers, icon: Users, color: 'bg-green-500' },
          { title: 'Completion %', value: `${avgCompletionRate}%`, icon: BarChart3, color: 'bg-purple-500' },
          { title: 'Total Hours', value: Math.round(totalCompletedHours), icon: Clock, color: 'bg-orange-500' }
        ].map((card, index) => (
          <div key={index} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${card.color} rounded-md p-3`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{card.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Completion Rates */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Completion Rates</h3>
          {adminUsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userPerformanceData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completion" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No user data available
            </div>
          )}
        </div>

        {/* Course Progress Distribution */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Course Progress Distribution</h3>
          {courses.length > 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No progress data available
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No course data available
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderUserPerformance = () => (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Detailed User Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Courses Assigned
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completion %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {userPerformanceData.length > 0 ? (
              userPerformanceData.map((user, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.coursesAssigned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${user.completion}%` }}
                        ></div>
                      </div>
                      <span>{user.completion}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.hours.toFixed(1)}h
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No user performance data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCourseAnalytics = () => (
    <div className="space-y-6">
      {/* Course Analytics Chart */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Course Enrollment vs Completion</h3>
        {courseCompletionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={courseCompletionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="course" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="enrollment" fill="#3B82F6" name="Enrolled" />
              <Bar dataKey="completion" fill="#10B981" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No course analytics data available
          </div>
        )}
      </div>

      {/* Course Analytics Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Course Analytics Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courseCompletionData.length > 0 ? (
                courseCompletionData.map((course, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {course.course}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.enrollment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.completion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${course.completionRate}%` }}
                          ></div>
                        </div>
                        <span>{course.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No course analytics data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEngagement = () => (
    <div className="space-y-6">
      {/* Learning Hours Trend */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Hours Trend</h3>
        {adminUsers.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={adminUsers.map((user: any, index: number) => ({
              user: user.userName,
              hours: user.completionHours || 0,
              engagement: user.completionRate || 0
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="user" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No engagement data available
          </div>
        )}
      </div>

      {/* User Engagement Insights */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Engagement Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {adminUsers.filter(u => (u.completionRate || 0) >= 80).length}
            </div>
            <div className="text-sm text-green-700">High Performers</div>
            <div className="text-xs text-gray-500">≥80% completion</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {adminUsers.filter(u => (u.completionRate || 0) >= 50 && (u.completionRate || 0) < 80).length}
            </div>
            <div className="text-sm text-yellow-700">Needs Attention</div>
            <div className="text-xs text-gray-500">50-79% completion</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {adminUsers.filter(u => (u.completionRate || 0) < 50).length}
            </div>
            <div className="text-sm text-red-700">Active Learners</div>
            <div className="text-xs text-gray-500">&lt;50% completion</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReport = () => {
    switch (selectedReport) {
      case 'overview':
        return renderOverview();
      case 'user-performance':
        return renderUserPerformance();
      case 'course-analytics':
        return renderCourseAnalytics();
      case 'engagement':
        return renderEngagement();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive insights into learning performance & engagement
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <option value="last7days">Last 7 days</option>
              <option value="last30days">Last 30 days</option>
              <option value="last90days">Last 90 days</option>
              <option value="last1year">Last 1 year</option>
            </select>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Select Report Type</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedReport === report.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <report.icon className={`h-6 w-6 mr-3 ${
                      selectedReport === report.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <span className="text-sm font-medium">{report.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Content */}
        {renderReport()}
      </div>
    </div>
  );
}