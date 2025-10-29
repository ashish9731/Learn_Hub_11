import React, { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Users, CheckCircle, XCircle, Mail, User, Building2, ChevronDown, ChevronRight, Headphones, FileText, Music } from 'lucide-react';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { sendCourseAssignedEmail } from '../../services/emailService';

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
}

interface Podcast {
  id: string;
  title: string;
  course_id: string;
  category_id: string;
  category: string;
  created_at: string;
}

interface PDF {
  id: string;
  title: string;
  course_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  course_id: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  created_at: string;
}

interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  completed: boolean;
  completion_date: string;
}

export default function CourseAssignment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<{
    podcasts: string[];
    pdfs: string[];
  }>({
    podcasts: [],
    pdfs: []
  });
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isAssigning, setIsAssigning] = useState(false);
  const [supabaseData, setSupabaseData] = useState<{
    users: User[];
    courses: Course[];
    podcasts: Podcast[];
    pdfs: PDF[];
    categories: Category[];
    companies: Company[];
    userProfiles: UserProfile[];
    userCourses: UserCourse[];
  }>({
    users: [],
    courses: [],
    podcasts: [],
    pdfs: [],
    categories: [],
    companies: [],
    userProfiles: [],
    userCourses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminCompanyId, setAdminCompanyId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current admin's company
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminData } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (adminData) {
          setAdminCompanyId(adminData.company_id);
        }
      }
      
      const [usersData, coursesData, podcastsData, pdfsData, categoriesData, companiesData, userProfilesData, userCoursesData] = await Promise.all([
        supabaseHelpers.getUsers(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getContentCategories(),
        supabaseHelpers.getCompanies(),
        supabaseHelpers.getAllUserProfiles(),
        supabaseHelpers.getAllUserCourses()
      ]);
      
      setSupabaseData({
        users: usersData || [],
        courses: coursesData || [],
        podcasts: podcastsData || [],
        pdfs: pdfsData || [],
        categories: categoriesData || [],
        companies: companiesData || [],
        userProfiles: userProfilesData || [],
        userCourses: userCoursesData || []
      });
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync
  useRealtimeSync('users', loadData);
  useRealtimeSync('courses', loadData);
  useRealtimeSync('podcasts', loadData);
  useRealtimeSync('pdfs', loadData);
  useRealtimeSync('content-categories', loadData);
  useRealtimeSync('user-courses', loadData);
  useRealtimeSync('companies', loadData);
  useRealtimeSync('user-profiles', loadData);

  useEffect(() => {
    loadData();
  }, []);

  // Filter users based on admin's company
  const availableUsers = supabaseData.users.filter((user: User) => 
    user.role === 'user' && 
    (!adminCompanyId || user.company_id === adminCompanyId)
  );

  const filteredUsers = availableUsers.filter((user: User) => {
    const profile = supabaseData.userProfiles.find((p: UserProfile) => p.user_id === user.id);
    const userName = profile?.full_name || user.email;
    return userName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleContentSelection = (type: 'podcasts' | 'pdfs', contentId: string) => {
    setSelectedContent(prev => ({
      ...prev,
      [type]: prev[type].includes(contentId)
        ? prev[type].filter(id => id !== contentId)
        : [...prev[type], contentId]
    }));
  };

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Build course hierarchy for content selection
  // Show all courses from Super Admin that are available for assignment
  // Include courses that are either:
  // 1. Not assigned to any company (NULL company_id) - these are available to all admins
  // 2. Assigned to the admin's company
  const courseHierarchy = supabaseData.courses
    .filter((course: Course) => course.company_id === null || course.company_id === adminCompanyId)
    .map((course: Course) => {
    // Get categories for this course
    const courseCategories = supabaseData.categories.filter((cat: Category) => cat.course_id === course.id);
    
    // Get content for each category
    const categoriesWithContent = courseCategories.map((category: Category) => {
      const categoryPodcasts = supabaseData.podcasts.filter(
        (podcast: Podcast) => podcast.category_id === category.id
      );
      
      return {
        ...category,
        podcasts: categoryPodcasts
      };
    });
    
    // Get uncategorized content (directly assigned to course)
    const uncategorizedPodcasts = supabaseData.podcasts.filter(
      (podcast: Podcast) => podcast.course_id === course.id && !podcast.category_id
    );
    
    // Get podcasts by predefined categories (Books, HBR, TED Talks, Concept)
    const predefinedCategories = ['Books', 'HBR', 'TED Talks', 'Concept'];
    const podcastsByCategory = predefinedCategories.map(categoryName => {
      const categoryPodcasts = supabaseData.podcasts.filter(
        (podcast: Podcast) => podcast.course_id === course.id && podcast.category === categoryName
      );
      
      return {
        name: categoryName,
        podcasts: categoryPodcasts,
        id: `${course.id}-${categoryName}`,
        course_id: course.id
      };
    }).filter(cat => cat.podcasts.length > 0);
    
    // Get all PDFs for this course
    const coursePdfs = supabaseData.pdfs.filter((pdf: PDF) => pdf.course_id === course.id);
    
    // Calculate total content
    const totalPodcasts = supabaseData.podcasts.filter(
      (podcast: Podcast) => podcast.course_id === course.id
    ).length;
    
    return {
      ...course,
      categories: categoriesWithContent,
      podcastCategories: podcastsByCategory,
      uncategorizedPodcasts,
      coursePdfs,
      totalPodcasts,
      totalContent: totalPodcasts + coursePdfs.length
    };
  });

  const getTotalSelectedContent = () => {
    return selectedContent.podcasts.length + selectedContent.pdfs.length;
  };

  const handleAssignCourses = async () => {
    const totalSelected = getTotalSelectedContent();
    if (selectedUsers.length === 0 || totalSelected === 0) {
      alert('Please select at least one user and one content item');
      return;
    }

    try {
      setIsAssigning(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Check if we have admin client
      if (!supabaseAdmin) {
        throw new Error('Admin client not available. Please check your environment configuration.');
      }

      // Get admin profile for email
      const adminProfile = supabaseData.userProfiles.find(p => p.user_id === currentUser.id);
      const adminName = adminProfile?.full_name || currentUser.email;

      // Create podcast assignments using admin client to bypass RLS
      if (selectedContent.podcasts.length > 0) {
        const assignments = [];
        
        for (const userId of selectedUsers) {
          for (const podcastId of selectedContent.podcasts) {
            assignments.push({
              user_id: userId,
              podcast_id: podcastId,
              assigned_by: currentUser.id,
              assigned_at: new Date().toISOString(),
              due_date: null
            });
          }
        }
        
        // Insert podcast assignments using admin client
        const { error: podcastAssignmentError } = await supabaseAdmin
          .from('podcast_assignments')
          .upsert(assignments, {
            onConflict: 'user_id,podcast_id'
          });

        if (podcastAssignmentError) {
          console.error('Podcast assignment error:', podcastAssignmentError);
          throw new Error(`Failed to assign podcasts: ${podcastAssignmentError.message}`);
        }
      }

      // Create course assignments for PDFs and courses using admin client
      const courseAssignments = [];
      const allSelectedPdfs = selectedContent.pdfs;
      
      // Get unique course IDs from selected PDFs
      const pdfCourseIds = allSelectedPdfs.map(pdfId => {
        const pdf = supabaseData.pdfs.find((p: PDF) => p.id === pdfId);
        return pdf?.course_id;
      }).filter(Boolean);
      
      // Also get course IDs from selected podcasts
      const podcastCourseIds = selectedContent.podcasts.map(podcastId => {
        const podcast = supabaseData.podcasts.find((p: Podcast) => p.id === podcastId);
        return podcast?.course_id;
      }).filter(Boolean);
      
      // Combine all course IDs and make them unique
      const allCourseIds = [...new Set([...pdfCourseIds, ...podcastCourseIds])];
      
      if (allCourseIds.length > 0) {
        for (const userId of selectedUsers) {
          for (const courseId of allCourseIds) {
            courseAssignments.push({
              user_id: userId,
              course_id: courseId,
              assigned_by: currentUser.id,
              assigned_at: new Date().toISOString(),
              due_date: null
            });
          }
        }
        
        // Insert course assignments using admin client
        const { error: courseAssignmentError } = await supabaseAdmin
          .from('user_courses')
          .upsert(courseAssignments, {
            onConflict: 'user_id,course_id'
          });

        if (courseAssignmentError) {
          console.error('Course assignment error:', courseAssignmentError);
          throw new Error(`Failed to assign courses: ${courseAssignmentError.message}`);
        }
      }

      // Send email notifications to each user
      const company = supabaseData.companies.find((c: Company) => c.id === adminCompanyId);
      const companyName = company?.name || 'Your Organization';
      
      // Get assigned content details for email
      const assignedPodcasts = supabaseData.podcasts.filter((p: Podcast) => selectedContent.podcasts.includes(p.id));
      const assignedPdfs = supabaseData.pdfs.filter((p: PDF) => selectedContent.pdfs.includes(p.id));
      
      const assignedContent = [
        ...assignedPodcasts.map((p: Podcast) => ({ title: p.title, type: 'Podcast' })),
        ...assignedPdfs.map((p: PDF) => ({ title: p.title, type: 'Document' }))
      ];

      let emailsSent = 0;
      let emailsFailed = 0;

      for (const userId of selectedUsers) {
        try {
          const user = supabaseData.users.find((u: User) => u.id === userId);
          const userProfile = supabaseData.userProfiles.find((p: UserProfile) => p.user_id === userId);
          const userName = userProfile?.full_name || user?.email || 'User';
          
          if (user?.email) {
            console.log(`📧 Sending course assignment email to: ${user.email}`);
            
            const emailSent = await sendCourseAssignedEmail(
              user.email,
              userName,
              companyName,
              assignedContent,
              adminName || 'Administrator'
            );
            
            if (emailSent) {
              emailsSent++;
              console.log(`✅ Course assignment email sent to: ${user.email}`);
            } else {
              emailsFailed++;
              console.error(`❌ Failed to send email to: ${user.email}`);
            }
          }
        } catch (emailError) {
          emailsFailed++;
          console.error('Error sending email to user:', emailError);
        }
      }

      // Show success message
      const totalUsers = selectedUsers.length;
      const totalContent = getTotalSelectedContent();
      
      let message = `✅ Successfully assigned ${totalContent} content item(s) to ${totalUsers} user(s)!\n\n`;
      
      if (emailsSent > 0) {
        message += `📧 ${emailsSent} email notification(s) sent successfully\n`;
      }
      
      if (emailsFailed > 0) {
        message += `⚠️ ${emailsFailed} email notification(s) failed to send\n`;
      }
      
      message += `\nUsers will receive email notifications with course details and login instructions.`;
      
      alert(message);

      // Reset selections
      setSelectedUsers([]);
      setSelectedContent({
        podcasts: [],
        pdfs: []
      });
      
      // Reload data
      await loadData();

    } catch (error) {
      console.error('Failed to assign courses:', error);
      alert('Failed to assign courses: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading course assignment...</p>
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
              onClick={loadData}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">Course Assignment</h1>
            <p className="mt-1 text-sm text-[#a0a0a0]">
              Assign courses to users and send email notifications
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={handleAssignCourses}
              disabled={isAssigning || selectedUsers.length === 0 || getTotalSelectedContent() === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Mail className="-ml-1 mr-2 h-5 w-5" />
                  Assign & Email ({selectedUsers.length} users, {getTotalSelectedContent()} items)
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users Selection */}
          <div className="bg-[#1e1e1e] shadow rounded-lg border border-[#333333]">
            <div className="px-6 py-4 border-b border-[#333333]">
              <h3 className="text-lg font-medium text-white">Select Users</h3>
              <p className="text-sm text-[#a0a0a0]">Choose users to assign courses to</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-[#a0a0a0] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-[#333333] rounded-md leading-5 bg-[#252525] placeholder-[#a0a0a0] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user: any) => {
                    const profile = supabaseData.userProfiles.find(p => p.user_id === user.id);
                    const userName = profile?.full_name || user.email;
                    const isSelected = selectedUsers.includes(user.id);
                    
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-900/30 border border-blue-600' 
                            : 'bg-[#252525] hover:bg-[#333333] border border-[#333333]'
                        }`}
                        onClick={() => handleUserSelection(user.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleUserSelection(user.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-[#333333] rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-[#8b5cf6] mr-2" />
                            <span className="text-sm font-medium text-white">{userName}</span>
                          </div>
                          <p className="text-xs text-[#a0a0a0]">{user.email}</p>
                          {profile?.department && (
                            <p className="text-xs text-[#a0a0a0]">{profile.department}</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-[#a0a0a0]">
                    {availableUsers.length === 0 ? 'No users available' : 'No users match your search'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Selection */}
          <div className="bg-[#1e1e1e] shadow rounded-lg border border-[#333333]">
            <div className="px-6 py-4 border-b border-[#333333]">
              <h3 className="text-lg font-medium text-white">Select Content</h3>
              <p className="text-sm text-[#a0a0a0]">Choose specific content to assign</p>
            </div>
            
            <div className="p-6">
              <div className="max-h-96 overflow-y-auto">
                {courseHierarchy.length > 0 ? (
                  <div className="space-y-2">
                    {courseHierarchy.map((course) => (
                      <div key={course.id} className="border border-[#333333] rounded-lg">
                        {/* Course Header */}
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#252525]"
                          onClick={() => toggleCourseExpansion(course.id)}
                        >
                          <div className="flex items-center">
                            <div className="mr-2">
                              {expandedCourses[course.id] ? (
                                <ChevronDown className="h-4 w-4 text-[#a0a0a0]" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-[#a0a0a0]" />
                              )}
                            </div>
                            <BookOpen className="h-4 w-4 text-[#8b5cf6] mr-2" />
                            <span className="text-sm font-medium text-white">{course.title}</span>
                          </div>
                          <span className="text-xs text-[#a0a0a0]">
                            {course.totalContent} items
                          </span>
                        </div>
                        
                        {/* Course Content */}
                        {expandedCourses[course.id] && (
                          <div className="pl-6 pr-3 pb-3">
                            {/* Podcasts Section */}
                            {(course.podcastCategories.length > 0 || course.uncategorizedPodcasts.length > 0) && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-[#8b5cf6] mb-2 flex items-center">
                                  <Headphones className="h-4 w-4 mr-1" />
                                  Podcasts ({course.totalPodcasts})
                                </h5>
                                <div className="space-y-2 ml-4">
                                  {/* Podcasts by predefined categories */}
                                  {course.podcastCategories.map((category) => (
                                    <div key={category.id} className="bg-[#252525] rounded-lg p-2">
                                      <div 
                                        className="flex items-center cursor-pointer mb-1"
                                        onClick={() => toggleCategoryExpansion(category.id)}
                                      >
                                        <div className="mr-1">
                                          {expandedCategories[category.id] ? (
                                            <ChevronDown className="h-3 w-3 text-[#a0a0a0]" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 text-[#a0a0a0]" />
                                          )}
                                        </div>
                                        <span className="text-xs font-medium text-white">{category.name}</span>
                                        <span className="ml-2 text-xs text-[#a0a0a0]">({category.podcasts.length})</span>
                                      </div>
                                      {expandedCategories[category.id] && (
                                        <div className="space-y-1 ml-4">
                                          {category.podcasts.map((podcast) => {
                                            const isSelected = selectedContent.podcasts.includes(podcast.id);
                                            return (
                                              <div
                                                key={podcast.id}
                                                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                                  isSelected ? 'bg-blue-900/30 border border-blue-600' : 'bg-[#1e1e1e] hover:bg-[#333333]'
                                                }`}
                                                onClick={() => handleContentSelection('podcasts', podcast.id)}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => handleContentSelection('podcasts', podcast.id)}
                                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-[#333333] rounded mr-2"
                                                />
                                                <Music className="h-3 w-3 text-[#8b5cf6] mr-1" />
                                                <span className="text-xs text-white">{podcast.title}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  
                                  {/* Uncategorized podcasts */}
                                  {course.uncategorizedPodcasts.length > 0 && (
                                    <div className="bg-[#252525] rounded-lg p-2">
                                      <div className="flex items-center mb-1">
                                        <span className="text-xs font-medium text-white">Other Podcasts</span>
                                        <span className="ml-2 text-xs text-[#a0a0a0]">({course.uncategorizedPodcasts.length})</span>
                                      </div>
                                      <div className="space-y-1 ml-2">
                                        {course.uncategorizedPodcasts.map((podcast) => {
                                          const isSelected = selectedContent.podcasts.includes(podcast.id);
                                          return (
                                            <div
                                              key={podcast.id}
                                              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                                isSelected ? 'bg-blue-900/30 border border-blue-600' : 'bg-[#1e1e1e] hover:bg-[#333333]'
                                              }`}
                                              onClick={() => handleContentSelection('podcasts', podcast.id)}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleContentSelection('podcasts', podcast.id)}
                                                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-[#333333] rounded mr-2"
                                              />
                                              <Music className="h-3 w-3 text-[#8b5cf6] mr-1" />
                                              <span className="text-xs text-white">{podcast.title}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Documents Section */}
                            {course.coursePdfs.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-purple-400 mb-2 flex items-center">
                                  <FileText className="h-4 w-4 mr-1" />
                                  Documents ({course.coursePdfs.length})
                                </h5>
                                <div className="space-y-1 ml-4">
                                  {course.coursePdfs.map((pdf) => {
                                    const isSelected = selectedContent.pdfs.includes(pdf.id);
                                    return (
                                      <div
                                        key={pdf.id}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                          isSelected ? 'bg-purple-900/30 border border-purple-600' : 'bg-[#252525] hover:bg-[#333333]'
                                        }`}
                                        onClick={() => handleContentSelection('pdfs', pdf.id)}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleContentSelection('pdfs', pdf.id)}
                                          className="h-3 w-3 text-purple-600 focus:ring-purple-500 border-[#333333] rounded mr-2"
                                        />
                                        <FileText className="h-3 w-3 text-purple-500 mr-1" />
                                        <span className="text-xs text-white">{pdf.title}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {course.totalContent === 0 && (
                              <p className="text-center text-[#a0a0a0] py-4 text-xs">No content available</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#a0a0a0]">
                    No courses assigned to your users yet. Contact Super Admin to assign courses.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Summary */}
        {(selectedUsers.length > 0 || getTotalSelectedContent() > 0) && (
          <div className="mt-8 bg-[#1e1e1e] shadow rounded-lg border border-[#333333] p-6">
            <h3 className="text-lg font-medium text-white mb-4">Assignment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-[#a0a0a0] mb-2">Selected Users ({selectedUsers.length})</h4>
                <div className="space-y-1">
                  {selectedUsers.slice(0, 5).map(userId => {
                    const user = supabaseData.users.find((u: User) => u.id === userId);
                    const profile = supabaseData.userProfiles.find((p: UserProfile) => p.user_id === userId);
                    const userName = profile?.full_name || user?.email;
                    return (
                      <p key={userId} className="text-sm text-white">• {userName}</p>
                    );
                  })}
                  {selectedUsers.length > 5 && (
                    <p className="text-sm text-[#a0a0a0]">... and {selectedUsers.length - 5} more</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-[#a0a0a0] mb-2">Selected Content ({getTotalSelectedContent()})</h4>
                <div className="space-y-1">
                  {selectedContent.podcasts.slice(0, 3).map(podcastId => {
                    const podcast = supabaseData.podcasts.find((p: Podcast) => p.id === podcastId);
                    return <p key={podcastId} className="text-sm text-white">🎧 {podcast?.title}</p>;
                  })}
                  {selectedContent.pdfs.slice(0, 3).map(pdfId => {
                    const pdf = supabaseData.pdfs.find((p: PDF) => p.id === pdfId);
                    return <p key={pdfId} className="text-sm text-white">📄 {pdf?.title}</p>;
                  })}
                  {getTotalSelectedContent() > 6 && (
                    <p className="text-sm text-[#a0a0a0]">... and {getTotalSelectedContent() - 6} more</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
              <p className="text-sm text-blue-200">
                📧 <strong>Email notifications will be sent</strong> to all selected users with course details and login instructions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}