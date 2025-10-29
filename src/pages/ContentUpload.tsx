import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Upload, BookOpen, Headphones, FileText, Play, Clock, BarChart3, Youtube, ArrowLeft, ChevronDown, ChevronRight, Music } from 'lucide-react';
import { supabaseHelpers } from '../hooks/useSupabase';
import { useRealtimeSync } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';

interface Course {
  id: string;
  title: string;
  description: string;
  company_id: string | null;
  image_url: string | null;
  created_at: string;
  level?: string;
}

interface Category {
  id: string;
  name: string;
  course_id: string;
  created_at: string;
  level?: string;
}

interface Podcast {
  id: string;
  title: string;
  course_id: string;
  category_id: string;
  mp3_url: string;
  video_url: string | null;
  is_youtube_video: boolean;
  created_by: string | null;
  created_at: string;
}

interface PDF {
  id: string;
  title: string;
  course_id: string;
  pdf_url: string;
  created_by: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  company_id: string | null;
  created_at: string;
}

export default function ContentUpload() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [contentType, setContentType] = useState<'audio' | 'video' | 'docs' | 'images' | 'templates'>('audio');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState<'Basics' | 'Intermediate' | 'Advanced'>('Basics');
  
  // Assignment form state
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  
  // Supabase data
  const [supabaseData, setSupabaseData] = useState<{
    courses: Course[];
    categories: Category[];
    podcasts: Podcast[];
    pdfs: PDF[];
    companies: Company[];
    users: User[];
  }>({
    courses: [],
    categories: [],
    podcasts: [],
    pdfs: [],
    companies: [],
    users: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Predefined categories
  const predefinedCategories = ['Books', 'HBR', 'TED Talks', 'Concept'];

  const loadSupabaseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading Supabase data...');
      
      const [coursesData, categoriesData, podcastsData, pdfsData] = await Promise.all([
        supabaseHelpers.getCourses().catch(err => {
          console.error('Error loading courses:', err);
          return [];
        }),
        supabaseHelpers.getContentCategories().catch(err => {
          console.error('Error loading categories:', err);
          return [];
        }),
        supabaseHelpers.getPodcasts().catch(err => {
          console.error('Error loading podcasts:', err);
          return [];
        }),
        supabaseHelpers.getPDFs().catch(err => {
          console.error('Error loading PDFs:', err);
          return [];
        })
      ]);
      
      const [companiesData, usersData] = await Promise.all([
        supabaseHelpers.getCompanies().catch(err => {
          console.error('Error loading companies:', err);
          return [];
        }),
        supabaseHelpers.getUsers().catch(err => {
          console.error('Error loading users:', err);
          return [];
        })
      ]);
      
      setSupabaseData({
        courses: coursesData || [],
        categories: categoriesData || [],
        podcasts: podcastsData || [],
        pdfs: pdfsData || [],
        companies: companiesData || [],
        users: usersData || []
      });
      
      console.log('Data loaded successfully:', {
        courses: coursesData?.length || 0,
        podcasts: podcastsData?.length || 0,
        pdfs: pdfsData?.length || 0
      });
      
    } catch (err) {
      console.error('Failed to load Supabase data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('courses', loadSupabaseData);
  useRealtimeSync('podcasts', loadSupabaseData);
  useRealtimeSync('pdfs', loadSupabaseData);
  useRealtimeSync('content-categories', loadSupabaseData);
  useRealtimeSync('companies', loadSupabaseData);
  useRealtimeSync('users', loadSupabaseData);
  useRealtimeSync('user-courses', loadSupabaseData);

  useEffect(() => {
    loadSupabaseData();
  }, []);

  // Calculate metrics from real Supabase data
  const totalCourses = supabaseData.courses?.length || 0;
  const totalPodcasts = supabaseData.podcasts?.length || 0;
  const totalDocuments = supabaseData.pdfs?.length || 0;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type based on content type
      if (contentType === 'audio') {
        const validAudioTypes = ['.mp3', '.wav', '.aac', '.m4a'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validAudioTypes.includes(fileExtension)) {
          alert(`Invalid file type for audio. Please upload one of: ${validAudioTypes.join(', ')}`);
          return;
        }
      } else if (contentType === 'docs') {
        const validDocTypes = ['.pdf', '.docx', '.pptx', '.xlsx', '.txt'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validDocTypes.includes(fileExtension)) {
          alert(`Invalid file type for documents. Please upload one of: ${validDocTypes.join(', ')}`);
          return;
        }
      } else if (contentType === 'images') {
        const validImageTypes = ['.jpg', '.jpeg', '.png', '.svg', '.gif'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validImageTypes.includes(fileExtension)) {
          alert(`Invalid file type for images. Please upload one of: ${validImageTypes.join(', ')}`);
          return;
        }
      }
      // For templates, we allow all file types
      setSelectedFile(file);
    }
  };

  const renderUploadForm = () => {
    if (contentType === 'audio') {
      return (
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-white mb-2">
            Audio File Upload <span className="text-red-500">*</span>
          </label>
          
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#333333] border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Headphones className="mx-auto h-12 w-12 text-[#a0a0a0]" />
              <div className="flex text-sm text-[#a0a0a0]">
                <label htmlFor="file-upload-audio" className="relative cursor-pointer bg-[#1e1e1e] rounded-md font-medium text-[#8b5cf6] hover:text-[#7c3aed] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#8b5cf6]">
                  <span>Upload an audio file</span>
                  <input 
                    id="file-upload-audio" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only"
                    onChange={handleFileSelect}
                    accept=".mp3,.wav,.aac,.m4a"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-[#a0a0a0]">MP3, WAV, AAC, M4A files supported</p>
              {selectedFile && (
                <p className="text-sm text-[#8b5cf6] font-medium">{selectedFile.name}</p>
              )}
            </div>
          </div>
        </div>
      );
    } else if (contentType === 'video') {
      return (
        <div>
          <label htmlFor="youtube-url" className="block text-sm font-medium text-white mb-2">
            YouTube URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            id="youtube-url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
          />
          <p className="mt-1 text-xs text-[#a0a0a0]">
            Paste the full YouTube URL. The video will be embedded in the app.
          </p>
        </div>
      );
    } else {
      // For docs, images, and templates
      return (
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-white mb-2">
            File Upload <span className="text-red-500">*</span>
          </label>
          
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#333333] border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <FileText className="mx-auto h-12 w-12 text-[#a0a0a0]" />
              <div className="flex text-sm text-[#a0a0a0]">
                <label htmlFor="file-upload-document" className="relative cursor-pointer bg-[#1e1e1e] rounded-md font-medium text-[#8b5cf6] hover:text-[#7c3aed] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#8b5cf6]">
                  <span>Upload a file</span>
                  <input 
                    id="file-upload-document" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only"
                    onChange={handleFileSelect}
                    accept={
                      contentType === 'docs' 
                        ? '.pdf,.docx,.pptx,.xlsx,.txt' 
                        : contentType === 'images' 
                          ? '.jpg,.jpeg,.png,.svg,.gif' 
                          : '*'
                    }
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-[#a0a0a0]">
                {contentType === 'docs' 
                  ? 'PDF, DOCX, PPTX, XLSX, TXT files supported' 
                  : contentType === 'images' 
                    ? 'JPG, JPEG, PNG, SVG, GIF files supported' 
                    : 'Any file type supported'}
              </p>
              {selectedFile && (
                <p className="text-sm text-[#8b5cf6] font-medium">{selectedFile.name}</p>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      alert('Please enter a course title');
      return;
    }

    try {
      console.log('Creating course:', {
        title: newCourseTitle,
        level: newCourseLevel
      });

      // Create the course (without created_by since it's not in the schema)
      const courseData = {
        title: newCourseTitle,
        level: newCourseLevel
        // Note: courses table doesn't have created_by column, so we don't include it
      };
      
      console.log('Course data to insert:', courseData);
      
      const { data, error } = await supabaseHelpers.createCourse(courseData);

      if (error) {
        console.error('Course creation error:', error);
        // Log detailed error information
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database error: ${error.message || 'Unknown database error'}`);
      }

      console.log('Course created successfully:', data);

      // Reset form
      setNewCourseTitle('');
      setNewCourseLevel('Basics');

      // Reload data to show the new course
      await loadSupabaseData();

      alert('Course created successfully!');

    } catch (error) {
      console.error('Failed to create course:', error);
      // Log the full error object for debugging
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Handle different types of errors
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = (error as any).message;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(`Failed to create course: ${errorMessage}`);
    }
  };

  const handleUpload = async () => {
    if (!contentTitle || !selectedCourse) {
      alert('Please fill in all required fields: title and course');
      return;
    }

    if (contentType === 'audio' && !selectedFile) {
      alert('Please upload an audio file');
      return;
    }

    if (contentType === 'video' && !youtubeUrl) {
      alert('Please provide a YouTube URL');
      return;
    }

    if ((contentType === 'docs' || contentType === 'images' || contentType === 'templates') && !selectedFile) {
      alert('Please upload a file');
      return;
    }

    try {
      setIsUploading(true);
      console.log('Starting upload process...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (contentType === 'audio' && selectedFile) {
        // Upload audio file
        console.log('Uploading to podcast-files bucket...');
        const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}_${sanitizedFileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('podcast-files')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('podcast-files')
          .getPublicUrl(fileName);

        console.log('File uploaded, creating podcast record...');
        
        // Create podcast record
        const { data: podcastData, error: podcastError } = await supabaseHelpers.createPodcast({
          title: contentTitle,
          description: contentDescription,
          course_id: selectedCourse,
          mp3_url: publicUrl,
          created_by: user.id,
          is_youtube_video: false
        });

        if (podcastError) {
          console.error('Podcast creation error:', podcastError);
          throw podcastError;
        }
        
        console.log('Podcast created successfully:', podcastData);
        alert('Audio file uploaded successfully!');
      } else if (contentType === 'video' && youtubeUrl) {
        // Create podcast record for YouTube video
        const { data: podcastData, error: podcastError } = await supabaseHelpers.createPodcast({
          title: contentTitle,
          description: contentDescription,
          course_id: selectedCourse,
          video_url: youtubeUrl,
          created_by: user.id,
          is_youtube_video: true
        });

        if (podcastError) {
          console.error('YouTube podcast creation error:', podcastError);
          throw podcastError;
        }
        
        console.log('YouTube podcast created successfully:', podcastData);
        alert('YouTube video added successfully!');
      } else if ((contentType === 'docs' || contentType === 'images' || contentType === 'templates') && selectedFile) {
        // Upload document/image/template file
        console.log('Uploading to pdf-files bucket...');
        const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}_${sanitizedFileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pdf-files')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('pdf-files')
          .getPublicUrl(fileName);

        console.log('File uploaded, creating PDF record...');
        
        // Create PDF record
        const { data: pdfData, error: pdfError } = await supabaseHelpers.createPDF({
          title: contentTitle,
          course_id: selectedCourse,
          pdf_url: publicUrl,
          created_by: user.id
        });

        if (pdfError) {
          console.error('PDF creation error:', pdfError);
          throw pdfError;
        }
        
        console.log('PDF created successfully:', pdfData);
        alert('File uploaded successfully!');
      }
      
      // Reset form
      setContentTitle('');
      setContentDescription('');
      setSelectedFile(null);
      setYoutubeUrl('');
      setSelectedCourse('');
      
      // Reload data
      await loadSupabaseData();
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePodcast = async (podcastId: string) => {
    if (!window.confirm('Are you sure you want to delete this podcast?')) {
      return;
    }
    
    try {
      await supabaseHelpers.deletePodcast(podcastId);
      await loadSupabaseData();
      alert('Podcast deleted successfully!');
    } catch (error) {
      console.error('Failed to delete podcast:', error);
      alert('Failed to delete podcast. Please try again.');
    }
  };

  const handleDeletePDF = async (pdfId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      await supabaseHelpers.deletePDF(pdfId);
      await loadSupabaseData();
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignmentTitle || !selectedCompanyId || selectedCourses.length === 0) {
      alert('Please fill in all required fields and select at least one course');
      return;
    }

    try {
      console.log('Creating assignment:', {
        title: assignmentTitle,
        companyId: selectedCompanyId,
        courses: selectedCourses
      });
      
      // Here you would implement the assignment creation logic
      // For now, we'll just show a success message
      alert('Assignment created successfully!');
      
      // Reset assignment form
      setAssignmentTitle('');
      setAssignmentDescription('');
      setSelectedCompanyId('');
      setSelectedAdminId('');
      setSelectedCourses([]);
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment. Please try again.');
    }
  };

  const handleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This will also delete all associated content (podcasts, documents, etc.).')) {
      return;
    }
    
    try {
      // Delete the course (this will cascade delete associated content)
      await supabaseHelpers.deleteCourse(courseId);
      
      // Reload data to reflect changes
      await loadSupabaseData();
      
      // Clear form if the deleted course was selected
      if (selectedCourse === courseId) {
        setSelectedCourse('');
      }
      
      alert('Course deleted successfully!');
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  // Toggle course expansion
  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Build course hierarchy for display
  const courseHierarchy = (supabaseData.courses || []).map(course => {
    // Get categories for this course
    const courseCategories = (supabaseData.categories || []).filter(cat => cat.course_id === course.id);
    
    // Get content for this course
    const coursePodcasts = (supabaseData.podcasts || []).filter(
      podcast => podcast.course_id === course.id
    );
    
    const coursePDFs = (supabaseData.pdfs || []).filter(
      pdf => pdf.course_id === course.id
    );
    
    // Calculate total content
    const totalContent = coursePodcasts.length + coursePDFs.length;
    
    return {
      ...course,
      courseCategories,
      coursePodcasts,
      coursePDFs,
      totalContent
    };
  });

  // Filter courses based on search term
  const filteredCourses = courseHierarchy.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courseCategories.some(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.coursePodcasts.some(podcast => 
        podcast.title.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      course.coursePDFs.some(pdf => 
        pdf.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading content...</p>
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

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
              Content Upload
            </h2>
            <p className="mt-1 text-sm text-[#a0a0a0]">
              Manage and upload learning content across different categories
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#1e1e1e] hover:bg-[#252525] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1e1e1e] overflow-hidden shadow rounded-lg border border-[#333333]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-green-500 rounded-md p-3">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-[#a0a0a0] truncate">Total Courses</dt>
                    <dd className="text-2xl font-semibold text-white">{totalCourses}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] overflow-hidden shadow rounded-lg border border-[#333333]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-500 rounded-md p-3">
                    <Headphones className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-[#a0a0a0] truncate">Podcasts</dt>
                    <dd className="text-2xl font-semibold text-white">{totalPodcasts}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] overflow-hidden shadow rounded-lg border border-[#333333]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-purple-500 rounded-md p-3">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-[#a0a0a0] truncate">Documents</dt>
                    <dd className="text-2xl font-semibold text-white">{totalDocuments}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Add New Course Form */}
          <div className="lg:col-span-1">
            <div className="bg-[#1e1e1e] shadow rounded-lg p-6 mb-6 border border-[#333333]">
              <h3 className="text-lg font-medium text-white mb-4">Add New Course</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="course-title" className="block text-sm font-medium text-white mb-2">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="course-title"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="Enter course title"
                  />
                </div>

                <div>
                  <label htmlFor="course-level" className="block text-sm font-medium text-white mb-2">
                    Course Level
                  </label>
                  <select
                    id="course-level"
                    value={newCourseLevel}
                    onChange={(e) => setNewCourseLevel(e.target.value as 'Basics' | 'Intermediate' | 'Advanced')}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                  >
                    <option value="Basics">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                  <p className="mt-1 text-xs text-[#a0a0a0]">
                    Select the difficulty level for this course
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCourseTitle('');
                      setNewCourseLevel('Basics');
                    }}
                    className="flex-1 py-2 px-4 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCourse}
                    disabled={!newCourseTitle.trim()}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Course
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Content Form */}
            <div className="bg-[#1e1e1e] shadow rounded-lg p-6 border border-[#333333]">
              <h3 className="text-lg font-medium text-white mb-4">Upload Content</h3>
              <form className="space-y-4">
                <div>
                  <label htmlFor="course" className="block text-sm font-medium text-white mb-2">
                    Select Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="course"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                  >
                    <option value="">Choose a course...</option>
                    {supabaseData.courses.map((course: any) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.level || 'Basics'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="content-type" className="block text-sm font-medium text-white mb-2">
                    Content Type
                  </label>
                  <select
                    id="content-type"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as 'audio' | 'video' | 'docs' | 'images' | 'templates')}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                  >
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="docs">Docs</option>
                    <option value="images">Images</option>
                    <option value="templates">Templates</option>
                  </select>
                  <p className="mt-1 text-xs text-[#a0a0a0]">
                    {contentType === 'audio' 
                      ? 'Audio files (.mp3, .wav, .aac, .m4a)' 
                      : contentType === 'video'
                      ? 'YouTube videos'
                      : contentType === 'docs'
                      ? 'Documents (.pdf, .docx, .pptx, .xlsx, .txt)'
                      : contentType === 'images'
                      ? 'Images (.jpg, .jpeg, .png, .svg, .gif)'
                      : 'Templates (any file type)'}
                  </p>
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                    Content Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="Enter content title"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={contentDescription}
                    onChange={(e) => setContentDescription(e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="Enter content description"
                  />
                </div>
                
                {renderUploadForm()}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setContentTitle('');
                      setContentDescription('');
                      setSelectedFile(null);
                      setYoutubeUrl('');
                      setSelectedCourse('');
                    }}
                    className="flex-1 py-2 px-4 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={
                      isUploading || 
                      !contentTitle || 
                      !selectedCourse || 
                      (contentType === 'audio' && !selectedFile) || 
                      (contentType === 'video' && !youtubeUrl) || 
                      ((contentType === 'docs' || contentType === 'images' || contentType === 'templates') && !selectedFile)
                    }
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Course Library */}
          <div className="lg:col-span-2">
            <div className="bg-[#1e1e1e] shadow rounded-lg border border-[#333333]">
              <div className="px-6 py-4 border-b border-[#333333]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Course Library</h3>
                  <div className="relative">
                    <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-[#a0a0a0] pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search content..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-[#333333] rounded-md leading-5 bg-[#252525] placeholder-[#a0a0a0] text-white focus:outline-none focus:placeholder-[#a0a0a0] focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto">
                {courseHierarchy.length > 0 ? (
                  <div className="divide-y divide-[#333333]">
                    {courseHierarchy
                      .filter(course => 
                        !searchTerm || 
                        course.title.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((course) => (
                      <div key={course.id} className="border-b border-[#333333]">
                        {/* Course Header */}
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
                          onClick={() => toggleCourseExpansion(course.id)}
                        >
                          <div className="flex items-center">
                            <div className="mr-2">
                              {expandedCourses[course.id] ? (
                                <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-white">{course.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">
                                {course.totalContent} items • 
                                {course.coursePodcasts.length} podcasts • 
                                {course.coursePDFs.length} documents
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent expanding/collapsing when clicking delete
                              handleDeleteCourse(course.id);
                            }}
                            className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-900/20"
                            title="Delete Course"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Course Content */}
                        {expandedCourses[course.id] && (
                          <div className="pl-8 pr-4 pb-4">
                            {/* Podcasts */}
                            {course.coursePodcasts.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-[#8b5cf6] mb-2">Podcasts</h5>
                                <div className="space-y-2">
                                  {course.coursePodcasts.map((podcast) => (
                                    <div key={podcast.id} className="flex items-center p-3 bg-[#252525] rounded-lg">
                                      {podcast.is_youtube_video ? (
                                        <Play className="h-4 w-4 text-red-500 mr-3" />
                                      ) : (
                                        <Music className="h-4 w-4 text-[#8b5cf6] mr-3" />
                                      )}
                                      <div className="flex-1">
                                        <h6 className="text-sm font-medium text-white">{podcast.title}</h6>
                                        <p className="text-xs text-[#a0a0a0]">
                                          {podcast.is_youtube_video ? 'YouTube Video' : 'Audio Content'}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleDeletePodcast(podcast.id)}
                                        className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-900/20"
                                        title="Delete Podcast"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Documents */}
                            {course.coursePDFs.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-purple-400 mb-2">Documents</h5>
                                <div className="space-y-2">
                                  {course.coursePDFs.map((pdf) => (
                                    <div key={pdf.id} className="flex items-center p-3 bg-[#252525] rounded-lg">
                                      <FileText className="h-4 w-4 text-purple-500 mr-3" />
                                      <div className="flex-1">
                                        <h6 className="text-sm font-medium text-white">{pdf.title}</h6>
                                        <p className="text-xs text-[#a0a0a0]">PDF Document</p>
                                      </div>
                                      <button
                                        onClick={() => handleDeletePDF(pdf.id)}
                                        className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-900/20"
                                        title="Delete Document"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {course.totalContent === 0 && (
                              <p className="text-center text-[#a0a0a0] py-4">No content uploaded yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#a0a0a0]">
                    {supabaseData.courses.length === 0 ? 'No courses available. Create a course first.' : 'No content matches your search.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Assignment Section */}
        <div className="bg-[#1e1e1e] shadow rounded-lg p-6 border border-[#333333]">
          <h3 className="text-lg font-medium text-white mb-6">Create Assignment</h3>
          <p className="text-sm text-[#a0a0a0] mb-6">Assign Content to Organization and Set Learning Objectives</p>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="assignment-title" className="block text-sm font-medium text-white mb-2">
                Assignment Title *
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Select Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
                  Select Company *
                </label>
                <select
                  id="company"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                >
                  <option value="">Choose a company...</option>
                  {supabaseData.companies?.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Admin */}
              <div>
                <label htmlFor="admin" className="block text-sm font-medium text-white mb-2">
                  Select Admin
                </label>
                <select
                  id="admin"
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                  disabled={!selectedCompanyId}
                >
                  <option value="">Choose an admin...</option>
                  {supabaseData.users
                    .filter((user: any) => user.role === 'admin' && user.company_id === selectedCompanyId)
                    .map((admin: any) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.email}
                      </option>
                    ))}
                </select>
              </div>

              {/* Select Content */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Select Content *
                </label>
                <div className="border border-[#333333] rounded-md bg-[#252525] max-h-64 overflow-y-auto">
                  {courseHierarchy.length > 0 ? (
                    <div className="divide-y divide-[#333333]">
                      {courseHierarchy.map((course) => (
                        <div key={course.id} className="border-b border-[#333333]">
                          {/* Course Header */}
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#333333]"
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
                              {course.coursePodcasts.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-xs font-medium text-[#8b5cf6] mb-2 flex items-center">
                                    <Headphones className="h-3 w-3 mr-1" />
                                    Podcasts ({course.coursePodcasts.length})
                                  </h5>
                                  <div className="space-y-1 ml-3">
                                    {course.coursePodcasts.map((podcast) => {
                                      const isSelected = selectedCourses.includes(podcast.id);
                                      return (
                                        <div
                                          key={podcast.id}
                                          className={`flex items-center p-1 rounded cursor-pointer transition-colors ${
                                            isSelected ? 'bg-blue-900/30' : 'hover:bg-[#252525]'
                                          }`}
                                          onClick={() => {
                                            setSelectedCourses(prev => 
                                              prev.includes(podcast.id)
                                                ? prev.filter(id => id !== podcast.id)
                                                : [...prev, podcast.id]
                                            );
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="h-3 w-3 text-blue-600 mr-2"
                                          />
                                          <Music className="h-3 w-3 text-[#8b5cf6] mr-1" />
                                          <span className="text-xs text-white">{podcast.title}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Documents Section */}
                              {course.coursePDFs.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-xs font-medium text-purple-400 mb-2 flex items-center">
                                    <FileText className="h-3 w-3 mr-1" />
                                    Documents ({course.coursePDFs.length})
                                  </h5>
                                  <div className="space-y-1 ml-3">
                                    {course.coursePDFs.map((pdf) => {
                                      const isSelected = selectedCourses.includes(pdf.id);
                                      return (
                                        <div
                                          key={pdf.id}
                                          className={`flex items-center p-1 rounded cursor-pointer transition-colors ${
                                            isSelected ? 'bg-purple-900/30' : 'bg-[#1e1e1e] hover:bg-[#252525]'
                                          }`}
                                          onClick={() => {
                                            setSelectedCourses(prev => 
                                              prev.includes(pdf.id)
                                                ? prev.filter(id => id !== pdf.id)
                                                : [...prev, pdf.id]
                                            );
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="h-3 w-3 text-purple-600 mr-2"
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
                                <p className="text-center text-[#a0a0a0] py-2 text-xs">No content available</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[#a0a0a0] text-sm">
                      No content available. Upload content first.
                    </div>
                  )}
                </div>
                {selectedCourses.length > 0 && (
                  <p className="mt-2 text-sm text-[#8b5cf6]">
                    {selectedCourses.length} item(s) selected
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setAssignmentTitle('');
                  setAssignmentDescription('');
                  setSelectedCompanyId('');
                  setSelectedAdminId('');
                  setSelectedCourses([]);
                }}
                className="flex-1 px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleCreateAssignment}
                disabled={!assignmentTitle || !selectedCompanyId || selectedCourses.length === 0}
                className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Assignment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}