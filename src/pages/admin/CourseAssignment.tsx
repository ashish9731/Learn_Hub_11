import React, { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Users, CheckCircle, XCircle, Mail, User, Building2, ChevronDown, ChevronRight, Headphones, FileText, Music, Image } from 'lucide-react';
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
  level?: string;
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
  content_type: string;
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
    pdfAssignments: any[];
    podcastAssignments: any[];
    courseAssignments: any[];
  }>({
    users: [],
    courses: [],
    podcasts: [],
    pdfs: [],
    categories: [],
    companies: [],
    userProfiles: [],
    userCourses: [],
    pdfAssignments: [],
    podcastAssignments: [],
    courseAssignments: []
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
      
      // Load assigned content for this admin
      let pdfAssignmentsData: any[] = [];
      let podcastAssignmentsData: any[] = [];
      let courseAssignmentsData: any[] = [];
      
      if (user?.id) {
        console.log('Loading assignments for user ID:', user.id);
        
        // Get PDF assignments assigned TO this admin (by SuperAdmins)
        const { data: pdfAssignments, error: pdfError } = await supabase
          .from('pdf_assignments')
          .select('*, pdfs!inner(*)')
          .eq('user_id', user.id);
        
        if (pdfError) {
          console.error('Error loading PDF assignments:', pdfError);
        }
        
        pdfAssignmentsData = pdfAssignments || [];
        console.log('PDF assignments loaded:', pdfAssignmentsData.length);
        
        // Get podcast assignments assigned TO this admin (by SuperAdmins)
        const { data: podcastAssignments, error: podcastError } = await supabase
          .from('podcast_assignments')
          .select('*, podcasts!inner(*)')
          .eq('user_id', user.id);
          
        if (podcastError) {
          console.error('Error loading podcast assignments:', podcastError);
        }
          
        podcastAssignmentsData = podcastAssignments || [];
        console.log('Podcast assignments loaded:', podcastAssignmentsData.length);
        
        // Get course assignments for this admin
        const { data: courseAssignments, error: courseError } = await supabase
          .from('user_courses')
          .select('*')
          .eq('user_id', user.id);
          
        if (courseError) {
          console.error('Error loading course assignments:', courseError);
        }
          
        courseAssignmentsData = courseAssignments || [];
        console.log('Course assignments loaded:', courseAssignmentsData.length);
        if (courseAssignmentsData.length > 0) {
          console.log('Course assignment details:', courseAssignmentsData);
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
      
      console.log('All courses loaded:', coursesData?.length || 0);
      
      setSupabaseData({
        users: usersData || [],
        courses: coursesData || [],
        podcasts: podcastsData || [],
        pdfs: pdfsData || [],
        categories: categoriesData || [],
        companies: companiesData || [],
        userProfiles: userProfilesData || [],
        userCourses: userCoursesData || [],
        pdfAssignments: pdfAssignmentsData || [],
        podcastAssignments: podcastAssignmentsData || [],
        courseAssignments: courseAssignmentsData || []
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
  // Show only courses and content specifically assigned to this admin by SuperAdmin
  const assignedCourseIds = new Set(
    supabaseData.courseAssignments.map((assignment: any) => assignment.course_id)
  );
  
  console.log('Building course hierarchy...');
  console.log('Total courses in system:', supabaseData.courses.length);
  console.log('Assigned course IDs:', Array.from(assignedCourseIds));
  console.log('Course assignments:', supabaseData.courseAssignments);
  
  // Get content specifically assigned to this admin
  const assignedPodcastIds = new Set(supabaseData.podcastAssignments.map((assignment: any) => assignment.podcast_id));
  const assignedPdfIds = new Set(supabaseData.pdfAssignments.map((assignment: any) => assignment.pdf_id));
  
  console.log('Assigned podcast IDs:', Array.from(assignedPodcastIds));
  console.log('Assigned PDF IDs:', Array.from(assignedPdfIds));
  
  const courseHierarchy = supabaseData.courses
    .filter((course: Course) => {
      const isAssigned = assignedCourseIds.has(course.id);
      console.log(`Course ${course.id} (${course.title}) - Assigned: ${isAssigned}`);
      return isAssigned;
    })
    .map((course: Course) => {
    console.log('Processing course:', course.id, course.title);
    
    // Get categories for this course
    const courseCategories = supabaseData.categories.filter((cat: Category) => cat.course_id === course.id);
    console.log('Course categories:', courseCategories.length);
    
    // For Admins, show ONLY content specifically assigned to them by SuperAdmin
    // Filter podcasts to show only those assigned to this admin
    const assignedPodcasts = supabaseData.podcasts.filter(
      (podcast: Podcast) => podcast.course_id === course.id && assignedPodcastIds.has(podcast.id)
    );
    
    // Get content for each category - show ONLY assigned content
    const categoriesWithContent = courseCategories.map((category: Category) => {
      const categoryPodcasts = assignedPodcasts.filter(
        (podcast: Podcast) => podcast.category_id === category.id
      );
      console.log(`Category ${category.id} (${category.name}) - Podcasts: ${categoryPodcasts.length}`);
      
      return {
        ...category,
        podcasts: categoryPodcasts
      };
    });
    
    // Get uncategorized content (directly assigned to course) - show ONLY assigned content
    const uncategorizedPodcasts = assignedPodcasts.filter(
      (podcast: Podcast) => podcast.course_id === course.id && !podcast.category_id
    );
    console.log('Uncategorized podcasts:', uncategorizedPodcasts.length);
    
    // Get podcasts by predefined categories (Books, HBR, TED Talks, Concept) - show ONLY assigned content
    const predefinedCategories = ['Books', 'HBR', 'TED Talks', 'Concept'];
    const podcastsByCategory = predefinedCategories.map(categoryName => {
      const categoryPodcasts = assignedPodcasts.filter(
        (podcast: Podcast) => podcast.course_id === course.id && podcast.category === categoryName
      );
      console.log(`Predefined category ${categoryName} - Podcasts: ${categoryPodcasts.length}`);
      
      return {
        name: categoryName,
        podcasts: categoryPodcasts,
        id: `${course.id}-${categoryName}`,
        course_id: course.id
      };
    }).filter(cat => cat.podcasts.length > 0);
    
    // Get ONLY PDFs specifically assigned to this admin and separate by content type
    const assignedPdfs = supabaseData.pdfs.filter(
      (pdf: PDF) => pdf.course_id === course.id && assignedPdfIds.has(pdf.id)
    );
    
    const docs = assignedPdfs.filter((pdf: PDF) => pdf.content_type === 'docs');
    const images = assignedPdfs.filter((pdf: PDF) => pdf.content_type === 'images');
    const templates = assignedPdfs.filter((pdf: PDF) => pdf.content_type === 'templates');
    const quizzes = assignedPdfs.filter((pdf: PDF) => pdf.content_type === 'quizzes');
    
    console.log(`Course ${course.id} PDF counts - Total: ${assignedPdfs.length}, Docs: ${docs.length}, Images: ${images.length}, Templates: ${templates.length}, Quizzes: ${quizzes.length}`);
    
    // Calculate total content - show ONLY assigned content
    const totalPodcasts = assignedPodcasts.length;
    
    console.log(`Course ${course.id} content counts - Podcasts: ${totalPodcasts}, PDFs: ${assignedPdfs.length}`);
    
    return {
      ...course,
      categories: categoriesWithContent,
      podcastCategories: podcastsByCategory,
      uncategorizedPodcasts,
      coursePdfs: assignedPdfs,
      docs,
      images,
      templates,
      quizzes,
      totalPodcasts,
      totalContent: totalPodcasts + assignedPdfs.length
    };
  });
  
  console.log('Course hierarchy built:', courseHierarchy.length);

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

      // Create PDF assignments using admin client to bypass RLS
      if (selectedContent.pdfs.length > 0) {
        const pdfAssignments = [];
        
        for (const userId of selectedUsers) {
          for (const pdfId of selectedContent.pdfs) {
            pdfAssignments.push({
              user_id: userId,
              pdf_id: pdfId,
              assigned_by: currentUser.id,
              assigned_at: new Date().toISOString(),
              due_date: null
            });
          }
        }
        
        // Insert PDF assignments using admin client
        const { error: pdfAssignmentError } = await supabaseAdmin
          .from('pdf_assignments')
          .upsert(pdfAssignments, {
            onConflict: 'user_id,pdf_id'
          });

        if (pdfAssignmentError) {
          console.error('PDF assignment error:', pdfAssignmentError);
          throw new Error(`Failed to assign PDFs: ${pdfAssignmentError.message}`);
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
              assigned_at: new Date().toISOString(),
              assigned_by: currentUser.id
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
            <h1 className="text-2xl font-bold text-black dark:text-white">Course Assignment</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
          <div className="bg-white shadow rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-black dark:text-white">Select Users</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose users to assign courses to</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-gray-500 pointer-events-none dark:text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-100 placeholder-gray-500 text-black focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white"
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
                            : 'bg-gray-100 hover:bg-white border border-gray-300 dark:bg-gray-700 dark:hover:bg-gray-800 dark:border-gray-600'
                        }`}
                        onClick={() => handleUserSelection(user.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleUserSelection(user.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-black dark:text-white">{userName}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          {profile?.department && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{profile.department}</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {availableUsers.length === 0 ? 'No users available' : 'No users match your search'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Selection */}
          <div className="bg-white shadow rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-black dark:text-white">Select Content</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose specific content to assign</p>
            </div>
            
            <div className="p-6">
              <div className="max-h-96 overflow-y-auto">
                {/* Debug information */}
                <div className="mb-4 p-3 bg-blue-900/20 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    Debug: Courses loaded: {supabaseData.courses.length}, 
                    Course assignments: {supabaseData.courseAssignments.length}, 
                    Course hierarchy: {courseHierarchy.length}
                  </p>
                  {supabaseData.courseAssignments.length > 0 && (
                    <p className="text-blue-300 text-sm mt-1">
                      Assigned course IDs: {supabaseData.courseAssignments.map((ca: any) => ca.course_id).join(', ')}
                    </p>
                  )}
                </div>
                
                {courseHierarchy.length > 0 ? (
                  <div className="space-y-2">
                    {courseHierarchy.map((course) => (
                      <div key={course.id} className="border border-gray-200 rounded-lg dark:border-gray-700">
                        {/* Course Header */}
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => toggleCourseExpansion(course.id)}
                        >
                          <div className="flex items-center">
                            <div className="mr-2">
                              {expandedCourses[course.id] ? (
                                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              )}
                            </div>
                            <BookOpen className="h-4 w-4 text-purple-600 mr-2" />
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-black dark:text-white">{course.title}</span>
                              {course.level && (
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
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
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {course.totalContent} items
                          </span>
                        </div>
                        
                        {/* Course Content */}
                        {expandedCourses[course.id] && (
                          <div className="pl-6 pr-3 pb-3">
                            {/* Podcasts Section */}
                            {(course.podcastCategories.length > 0 || course.uncategorizedPodcasts.length > 0) && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-purple-600 mb-2 flex items-center">
                                  <Headphones className="h-4 w-4 mr-1" />
                                  Podcasts ({course.totalPodcasts})
                                </h5>
                                <div className="space-y-2 ml-4">
                                  {/* Podcasts by predefined categories */}
                                  {course.podcastCategories.map((category) => (
                                    <div key={category.id} className="bg-gray-100 rounded-lg p-2 dark:bg-gray-700">
                                      <div 
                                        className="flex items-center cursor-pointer mb-1"
                                        onClick={() => toggleCategoryExpansion(category.id)}
                                      >
                                        <div className="mr-1">
                                          {expandedCategories[category.id] ? (
                                            <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                          )}
                                        </div>
                                        <span className="text-xs font-medium text-black dark:text-white">{category.name}</span>
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({category.podcasts.length})</span>
                                      </div>
                                      {expandedCategories[category.id] && (
                                        <div className="space-y-1 ml-4">
                                          {category.podcasts.map((podcast) => {
                                            const isSelected = selectedContent.podcasts.includes(podcast.id);
                                            return (
                                              <div
                                                key={podcast.id}
                                                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                                  isSelected ? 'bg-blue-900/30 border border-blue-600' : 'bg-white hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-800'
                                                }`}
                                                onClick={() => handleContentSelection('podcasts', podcast.id)}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => handleContentSelection('podcasts', podcast.id)}
                                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 dark:border-gray-600"
                                                />
                                                <Music className="h-3 w-3 text-purple-600 mr-1" />
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
                                    <div className="bg-gray-100 rounded-lg p-2 dark:bg-gray-700">
                                      <div className="flex items-center mb-1">
                                        <span className="text-xs font-medium text-black dark:text-white">Other Podcasts</span>
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({course.uncategorizedPodcasts.length})</span>
                                      </div>
                                      <div className="space-y-1 ml-2">
                                        {course.uncategorizedPodcasts.map((podcast) => {
                                          const isSelected = selectedContent.podcasts.includes(podcast.id);
                                          return (
                                            <div
                                              key={podcast.id}
                                              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                                isSelected ? 'bg-blue-900/30 border border-blue-600' : 'bg-white hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-800'
                                              }`}
                                              onClick={() => handleContentSelection('podcasts', podcast.id)}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleContentSelection('podcasts', podcast.id)}
                                                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 dark:border-gray-600"
                                              />
                                              <Music className="h-3 w-3 text-purple-600 mr-1" />
                                              <span className="text-xs text-black dark:text-white">{podcast.title}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Documents Section - Separated by content type */}
                            {(course.docs.length > 0 || course.images.length > 0 || course.templates.length > 0 || course.quizzes.length > 0) && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-purple-400 mb-2 flex items-center">
                                  <FileText className="h-4 w-4 mr-1" />
                                  Documents ({course.docs.length + course.images.length + course.templates.length + course.quizzes.length})
                                </h5>
                                <div className="space-y-1 ml-4">
                                  {/* Docs */}
                                  {course.docs.map((pdf) => {
                                    const isSelected = selectedContent.pdfs.includes(pdf.id);
                                    return (
                                      <div
                                        key={pdf.id}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                          isSelected ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-100 hover:bg-white dark:bg-gray-700 dark:hover:bg-gray-800'
                                        }`}
                                        onClick={() => handleContentSelection('pdfs', pdf.id)}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleContentSelection('pdfs', pdf.id)}
                                          className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 dark:border-gray-600"
                                        />
                                        <FileText className="h-3 w-3 text-blue-500 mr-1" />
                                        <span className="text-xs text-white">{pdf.title}</span>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Images */}
                                  {course.images.map((pdf) => {
                                    const isSelected = selectedContent.pdfs.includes(pdf.id);
                                    return (
                                      <div
                                        key={pdf.id}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                          isSelected ? 'bg-green-900/30 border border-green-600' : 'bg-gray-100 hover:bg-white dark:bg-gray-700 dark:hover:bg-gray-800'
                                        }`}
                                        onClick={() => handleContentSelection('pdfs', pdf.id)}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleContentSelection('pdfs', pdf.id)}
                                          className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-2 dark:border-gray-600"
                                        />
                                        <Image className="h-3 w-3 text-green-500 mr-1" />
                                        <span className="text-xs text-white">{pdf.title}</span>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Templates */}
                                  {course.templates.map((pdf) => {
                                    const isSelected = selectedContent.pdfs.includes(pdf.id);
                                    return (
                                      <div
                                        key={pdf.id}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                          isSelected ? 'bg-purple-900/30 border border-purple-600' : 'bg-gray-100 hover:bg-white dark:bg-gray-700 dark:hover:bg-gray-800'
                                        }`}
                                        onClick={() => handleContentSelection('pdfs', pdf.id)}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleContentSelection('pdfs', pdf.id)}
                                          className="h-3 w-3 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2 dark:border-gray-600"
                                        />
                                        <FileText className="h-3 w-3 text-purple-500 mr-1" />
                                        <span className="text-xs text-white">{pdf.title}</span>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Quizzes */}
                                  {course.quizzes.map((pdf) => {
                                    const isSelected = selectedContent.pdfs.includes(pdf.id);
                                    return (
                                      <div
                                        key={pdf.id}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                          isSelected ? 'bg-yellow-900/30 border border-yellow-600' : 'bg-gray-100 hover:bg-white dark:bg-gray-700 dark:hover:bg-gray-800'
                                        }`}
                                        onClick={() => handleContentSelection('pdfs', pdf.id)}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleContentSelection('pdfs', pdf.id)}
                                          className="h-3 w-3 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded mr-2 dark:border-gray-600"
                                        />
                                        <FileText className="h-3 w-3 text-yellow-500 mr-1" />
                                        <span className="text-xs text-white">{pdf.title} (Quiz)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {course.totalContent === 0 && (
                              <p className="text-center text-gray-500 py-4 text-xs dark:text-gray-400">No content available</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No courses assigned to your users yet. Contact Super Admin to assign courses.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}