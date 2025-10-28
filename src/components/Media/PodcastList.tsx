import React, { useState, useEffect } from 'react';
import { Building2, BookOpen, Headphones, Users, Clock, X, ChevronRight, BarChart3, PieChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Pie, Cell, Legend, Sector } from 'recharts';
import { supabaseHelpers } from '../hooks/useSupabase';

export default function Analytics() {
  // Supabase data
  const [supabaseData, setSupabaseData] = useState({
    companies: [],
    courses: [],
    podcasts: [],
    pdfs: [],
    users: []
  });
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadSupabaseData();
  }, []);

  const loadSupabaseData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [companiesData, coursesData, podcastsData, pdfsData, usersData] = await Promise.all([
        supabaseHelpers.getCompanies(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getUsers()
      ]);
      
      setSupabaseData({
        companies: companiesData,
        courses: coursesData,
        podcasts: podcastsData,
        pdfs: pdfsData,
        users: usersData
      });
    } catch (error) {
      console.error('Failed to load Supabase data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle KPI card click
  const handleKPICardClick = (kpiType: string) => {
    setSelectedKPI(kpiType);
  };

  // Function to close KPI detail modal
  const closeKPIDetail = () => {
    setSelectedKPI(null);
  };

  // Render KPI detail content based on selected KPI
  const renderKPIDetail = () => {
    if (!selectedKPI) return null;

    switch (selectedKPI) {
      case 'organizations':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Organization Details</h3>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Organizations Overview</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supabaseData.companies.map((company: any, index: number) => (
                      <tr key={company.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {supabaseData.users.filter(u => u.company_id === company.id).length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {supabaseData.courses.filter(c => c.company_id === company.id).length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(company.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Organization Growth</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={companyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="userCount" name="Users" fill="#3B82F6" />
                  <Bar dataKey="courseCount" name="Courses" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'courses':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Course Details</h3>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Course Completion Rates</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="course" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completion" name="Completion %" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Courses by Company</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Items</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supabaseData.courses.map((course: any, index: number) => {
                      const company = supabaseData.companies.find(c => c.id === course.company_id);
                      const podcastCount = supabaseData.podcasts.filter(p => p.course_id === course.id).length;
                      const pdfCount = supabaseData.pdfs.filter(p => p.course_id === course.id).length;
                      
                      return (
                        <tr key={course.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {company?.name || 'No Company'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(course.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {podcastCount + pdfCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      
      case 'podcasts':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Podcast Details</h3>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Podcasts by Category</h4>
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={learningAreasData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ area, percent }) => `${area} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {learningAreasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Podcast List</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supabaseData.podcasts.map((podcast: any, index: number) => {
                      const course = supabaseData.courses.find(c => c.id === podcast.course_id);
                      return (
                        <tr key={podcast.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{podcast.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {podcast.category || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {course?.title || 'No Course'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(podcast.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      
      case 'users':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">User Distribution by Company</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={companyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="userCount" name="Users" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">User List</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supabaseData.users.map((user: any, index: number) => {
                      const company = supabaseData.companies.find(c => c.id === user.company_id);
                      return (
                        <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.role}
                            {user.role === 'super_admin' && <span className="ml-2 text-xs text-red-500">(not counted in totals)</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {company?.name || 'No Company'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      
      case 'hours':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Learning Hours Details</h3>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Learning Hours by Company</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={companyData.map(company => ({
                  name: company.name,
                  hours: supabaseData.users
                    .filter(user => user.company_id === company.id)
                    .reduce((sum, user) => sum + (user.completionHours || 0), 0)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" name="Learning Hours" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Top Users by Learning Hours</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learning Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supabaseData.users
                      .filter((user: any) => user.role === 'user' || user.role === 'admin')
                      .sort((a, b) => (b.completionHours || 0) - (a.completionHours || 0))
                      .slice(0, 10)
                      .map((user: any, index: number) => {
                        const company = supabaseData.companies.find(c => c.id === user.company_id);
                        return (
                          <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {company?.name || 'No Company'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.completionHours || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.completionRate || 0}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading analytics...</p>
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

  // Calculate real metrics from Supabase data only
  const totalOrganizations = supabaseData.companies.length || 0;
  const totalCourses = supabaseData.courses.length || 0;
  const totalPodcasts = supabaseData.podcasts.length || 0;
  // Only count regular users and admins, not super_admin
  const totalUsers = supabaseData.users.filter((user: any) => 
    user.role === 'user' || user.role === 'admin'
  ).length || 0;
  const totalLearningHours = 0; // No learning hours yet

  // Get company data with their actual metrics
  const getCompanyData = () => {
    return supabaseData.companies.map((company: any) => ({
      name: company.name,
      userCount: supabaseData.users.filter((user: any) => user.company_id === company.id).length,
      courseCount: supabaseData.courses.filter((course: any) => course.company_id === company.id).length,
      engagementRate: calculateEngagementRate(company.id),
      completionRate: calculateCompletionRate(company.id)
    }));
  };
  
  // Calculate engagement rate for a company
  const calculateEngagementRate = (companyId: string) => {
    const companyUsers = supabaseData.users.filter((user: any) => user.company_id === companyId);
    return companyUsers.length > 0 ? 100 : 0; // All users are considered engaged (100%) if there are any
  };
  
  // Calculate completion rate for a company
  const calculateCompletionRate = (companyId: string) => {
  };

  const companyData = getCompanyData();

  // Learning areas distribution based on actual podcast categories
  const categoryCount = supabaseData.podcasts.reduce((acc: any, podcast: any) => {
    const category = podcast.category || 'General';
    // Convert enum values to more readable format
    const formattedCategory = category.replace(/_/g, ' ');
    acc[formattedCategory] = (acc[formattedCategory] || 0) + 1;
    return acc;
  }, {});

  // Create data for pie chart, ensuring we have at least some data
  let learningAreasData = Object.entries(categoryCount).map(([name, value]) => ({
    name,
    value: value as number
  }));
  
  // If no data, add placeholder data
  if (learningAreasData.length === 0) {
    learningAreasData = [
      { name: 'No Categories', value: 1 }
    ];
  }

  // Course completion data (would be calculated from actual user progress)
  const courseCompletionData = supabaseData.courses.map((course: any) => ({
    course: course.title.length > 15 ? course.title.substring(0, 15) + '...' : course.title,
    completion: calculateCourseCompletion(course.id)
  }));
  
  // Function to calculate course completion
  function calculateCourseCompletion(courseId: string): number {
    // This would be replaced with actual data when user_courses tracking is implemented
    return 0;
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6'];
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
  
    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-medium">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="text-xs">
          {`${value} podcasts`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-xs">
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Analytics Dashboard
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Real-time insights from Supabase database
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={loadSupabaseData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[
            { id: 'organizations', title: 'Total Organizations', value: totalOrganizations, icon: Building2, color: 'bg-blue-500' },
            { id: 'courses', title: 'Courses', value: totalCourses, icon: BookOpen, color: 'bg-green-500' },
            { id: 'podcasts', title: 'Podcasts', value: totalPodcasts, icon: Headphones, color: 'bg-purple-500' },
            { id: 'users', title: 'Total Users', value: totalUsers, icon: Users, color: 'bg-orange-500' },
            { id: 'hours', title: 'Total Learning Hours', value: totalLearningHours, icon: Clock, color: 'bg-red-500' }
          ].map((card, index) => (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div 
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleKPICardClick(card.id)}
              >
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
                  <div className="ml-auto">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Course Completion Rate */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Course Completion Rate</h3>
            <p className="text-sm text-gray-600 mb-4">Completion rates by course (when tracking is implemented)</p>
            {courseCompletionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="course" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completion" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No course data available
              </div>
            )}
          </div>

          {/* Learning Areas Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Areas Distribution</h3>
            <p className="text-sm text-gray-600 mb-4">Distribution of content by podcast categories</p>
            {learningAreasData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={learningAreasData}
                    cx="50%"
                    cy="50%"
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                  >
                    {learningAreasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No podcast categories available
              </div>
            )}
          </div>
        </div>

        {/* Organization Performance */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companyData.length > 0 ? (
                  companyData.map((company: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.userCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.courseCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${company.engagementRate}%` }}
                            ></div>
                          </div>
                          <span>{company.engagementRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${company.completionRate}%` }}
                            ></div>
                          </div>
                          <span>{company.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No companies found. Add companies to see performance metrics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalOrganizations}</div>
              <div className="text-sm text-blue-700">Organizations</div>
              <div className="text-xs text-gray-500 mt-1">Companies in database</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{totalCourses}</div>
              <div className="text-sm text-green-700">Learning Resources</div>
              <div className="text-xs text-gray-500 mt-1">Total courses available</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{totalPodcasts}</div>
              <div className="text-sm text-purple-700">Podcast Content</div>
              <div className="text-xs text-gray-500 mt-1">Audio learning materials</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{supabaseData.pdfs.length}</div>
              <div className="text-sm text-orange-700">Documents</div>
              <div className="text-xs text-gray-500 mt-1">Document resources</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Detail Modal */}
      {selectedKPI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Detailed Analytics</h2>
              </div>
              <button
                onClick={closeKPIDetail}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {renderKPIDetail()}
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeKPIDetail}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}