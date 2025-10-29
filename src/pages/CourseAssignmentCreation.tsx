import React, { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Users, CheckCircle, XCircle, Mail, User, Building2, ChevronDown, ChevronRight, Headphones, FileText, Music } from 'lucide-react';
import { supabaseHelpers } from '../hooks/useSupabase';
import { useRealtimeSync } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  role: string;
  company_id: string | null;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  company_id: string | null;
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

interface Admin {
  id: string;
  email: string;
  role: string;
  company_id: string | null;
  created_at: string;
}

export default function CourseAssignmentCreation() {
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedContent, setSelectedContent] = useState<{
    courses: string[];
    podcasts: string[];
    pdfs: string[];
  }>({
    courses: [],
    podcasts: [],
    pdfs: []
  });
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [supabaseData, setSupabaseData] = useState<{
    users: User[];
    courses: Course[];
    podcasts: Podcast[];
    pdfs: PDF[];
    categories: Category[];
    companies: Company[];
    admins: Admin[];
  }>({
    users: [],
    courses: [],
    podcasts: [],
    pdfs: [],
    categories: [],
    companies: [],
    admins: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersData, coursesData, podcastsData, pdfsData, categoriesData, companiesData, adminsData] = await Promise.all([
        supabaseHelpers.getUsers(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getContentCategories(),
        supabaseHelpers.getCompanies(),
        supabaseHelpers.getUsers() // Get all users to filter admins
      ]);
      
      // Filter admins from users
      const admins = (adminsData || []).filter((user: User) => user.role === 'admin');
      
      setSupabaseData({
        users: usersData || [],
        courses: coursesData || [],
        podcasts: podcastsData || [],
        pdfs: pdfsData || [],
        categories: categoriesData || [],
        companies: companiesData || [],
        admins: admins || []
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
  useRealtimeSync('companies', loadData);

  useEffect(() => {
    loadData();
  }, []);

  const handleContentSelection = (type: 'courses' | 'podcasts' | 'pdfs', contentId: string) => {
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
  const courseHierarchy = supabaseData.courses.map((course: Course) => {
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
    return selectedContent.courses.length + selectedContent.podcasts.length + selectedContent.pdfs.length;
  };

  const handleCreateAssignment = async () => {
    if (!assignmentTitle.trim() || !selectedCompanyId || !selectedAdminId || getTotalSelectedContent() === 0) {
      alert('Please fill in all required fields and select at least one content item');
      return;
    }

    try {
      setIsCreating(true);
      
      // For now, we'll just show a success message as the actual assignment logic
      // would be implemented in the backend or in a separate service
      alert(`Assignment "${assignmentTitle}" created successfully!

Company: ${supabaseData.companies.find(c => c.id === selectedCompanyId)?.name}
Admin: ${supabaseData.admins.find(a => a.id === selectedAdminId)?.email}
Content items: ${getTotalSelectedContent()}`);
      
      // Reset form
      setAssignmentTitle('');
      setAssignmentDescription('');
      setSelectedCompanyId('');
      setSelectedAdminId('');
      setSelectedContent({
        courses: [],
        podcasts: [],
        pdfs: []
      });

    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  // Filter admins by selected company
  const filteredAdmins = selectedCompanyId 
    ? supabaseData.admins.filter((admin: Admin) => admin.company_id === selectedCompanyId)
    : [];

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading assignment creation...</p>
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
            <h1 className="text-2xl font-bold text-white">Create Course Assignment</h1>
            <p className="mt-1 text-sm text-[#a0a0a0]">
              Assign courses to admins and companies
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={handleCreateAssignment}
              disabled={isCreating || !assignmentTitle.trim() || !selectedCompanyId || !selectedAdminId || getTotalSelectedContent() === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Create Assignment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Assignment Details Form */}
        <div className="bg-[#1e1e1e] shadow rounded-lg border border-[#333333] mb-8">
          <div className="px-6 py-4 border-b border-[#333333]">
            <h3 className="text-lg font-medium text-white">Assignment Details</h3>
            <p className="text-sm text-[#a0a0a0]">Enter assignment title and description</p>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="assignment-title" className="block text-sm font-medium text-white mb-2">
                Assignment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="assignment-title"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                placeholder="Enter assignment title"
              />
            </div>

            <div>
              <label htmlFor="assignment-description" className="block text-sm font-medium text-white mb-2">
                Assignment Description
              </label>
              <textarea
                id="assignment-description"
                rows={3}
                value={assignmentDescription}
                onChange={(e) => setAssignmentDescription(e.target.value)}
                className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                placeholder="Enter assignment description and learning objectives"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
                Select Company <span className="text-red-500">*</span>
              </label>
              <select
                id="company"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedAdminId(''); // Reset admin selection when company changes
                }}
                className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
              >
                <option value="">Choose a company...</option>
                {supabaseData.companies.map((company: Company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="admin" className="block text-sm font-medium text-white mb-2">
                Select Admin <span className="text-red-500">*</span>
              </label>
              <select
                id="admin"
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                disabled={!selectedCompanyId}
              >
                <option value="">Choose an admin...</option>
                {filteredAdmins.map((admin: Admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.email}
                  </option>
                ))}
              </select>
              {!selectedCompanyId && (
                <p className="mt-1 text-xs text-[#a0a0a0]">
                  Please select a company first
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content Selection */}
        <div className="bg-[#1e1e1e] shadow rounded-lg border border-[#333333]">
          <div className="px-6 py-4 border-b border-[#333333]">
            <h3 className="text-lg font-medium text-white">Select Content</h3>
            <p className="text-sm text-[#a0a0a0]">Choose courses and specific content to assign</p>
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
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-white">{course.title}</span>
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
                        <span className="text-xs text-[#a0a0a0]">
                          {course.totalContent} items
                        </span>
                      </div>
                      
                      {/* Course Content */}
                      {expandedCourses[course.id] && (
                        <div className="pl-6 pr-3 pb-3">
                          {/* Course Selection */}
                          <div className="mb-3">
                            <div
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                selectedContent.courses.includes(course.id) 
                                  ? 'bg-blue-900/30 border border-blue-600' 
                                  : 'bg-[#252525] hover:bg-[#333333]'
                              }`}
                              onClick={() => handleContentSelection('courses', course.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedContent.courses.includes(course.id)}
                                onChange={() => handleContentSelection('courses', course.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-[#333333] rounded mr-2"
                              />
                              <span className="text-sm font-medium text-white">Assign entire course</span>
                            </div>
                          </div>
                          
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
                  No courses available. Please create courses first.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Summary */}
        {(assignmentTitle || selectedCompanyId || selectedAdminId || getTotalSelectedContent() > 0) && (
          <div className="mt-8 bg-[#1e1e1e] shadow rounded-lg border border-[#333333] p-6">
            <h3 className="text-lg font-medium text-white mb-4">Assignment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-[#a0a0a0] mb-2">Details</h4>
                <div className="space-y-1">
                  {assignmentTitle && (
                    <p className="text-sm text-white">📋 Title: {assignmentTitle}</p>
                  )}
                  {assignmentDescription && (
                    <p className="text-sm text-white">📝 Description: {assignmentDescription}</p>
                  )}
                  {selectedCompanyId && (
                    <p className="text-sm text-white">
                      🏢 Company: {supabaseData.companies.find(c => c.id === selectedCompanyId)?.name}
                    </p>
                  )}
                  {selectedAdminId && (
                    <p className="text-sm text-white">
                      👤 Admin: {supabaseData.admins.find(a => a.id === selectedAdminId)?.email}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-[#a0a0a0] mb-2">Selected Content ({getTotalSelectedContent()})</h4>
                <div className="space-y-1">
                  {selectedContent.courses.slice(0, 2).map(courseId => {
                    const course = supabaseData.courses.find((c: Course) => c.id === courseId);
                    return <p key={courseId} className="text-sm text-white">📚 {course?.title} (Entire Course)</p>;
                  })}
                  {selectedContent.podcasts.slice(0, 2).map(podcastId => {
                    const podcast = supabaseData.podcasts.find((p: Podcast) => p.id === podcastId);
                    return <p key={podcastId} className="text-sm text-white">🎧 {podcast?.title}</p>;
                  })}
                  {selectedContent.pdfs.slice(0, 2).map(pdfId => {
                    const pdf = supabaseData.pdfs.find((p: PDF) => p.id === pdfId);
                    return <p key={pdfId} className="text-sm text-white">📄 {pdf?.title}</p>;
                  })}
                  {getTotalSelectedContent() > 6 && (
                    <p className="text-sm text-[#a0a0a0]">... and {getTotalSelectedContent() - 6} more</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}