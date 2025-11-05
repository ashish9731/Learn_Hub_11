import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Upload, BookOpen, Headphones, FileText, Play, Clock, BarChart3, Youtube, ArrowLeft, ChevronDown, ChevronRight, Music, Image, RefreshCw } from 'lucide-react';
import { supabaseHelpers } from '../hooks/useSupabase';
import { useRealtimeSync } from '../hooks/useSupabase';
import { supabase, supabaseAdmin } from '../lib/supabase';

// Content Upload Page - Reverted to commit 102f9ff for Vercel deployment
// This comment was added to trigger a new deployment

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
  content_type?: string; // Add content_type field as optional
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
  const [contentType, setContentType] = useState<'audio' | 'video' | 'docs' | 'images' | 'templates' | 'quizzes'>('audio');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState<'Basics' | 'Intermediate' | 'Advanced'>('Basics');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  
  // Editing state variables
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseData, setEditingCourseData] = useState<Partial<Course>>({});
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingContentData, setEditingContentData] = useState<Partial<Podcast | PDF>>({});
  
  // Form visibility state
  const [showAddCourseForm, setShowAddCourseForm] = useState(true);
  const [showContentUploadForm, setShowContentUploadForm] = useState(true);
  
  // Assignment form state
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assignmentSelectedCourse, setAssignmentSelectedCourse] = useState('');
  
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
  
  // Assigned courses state for Super Admin viewing
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
  const [loadingAssignedCourses, setLoadingAssignedCourses] = useState(false);

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
        pdfs: (pdfsData || []).map(pdf => ({
          ...pdf,
          content_type: pdf.content_type || 'docs' // Ensure all PDFs have a content_type
        })),
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

  // Load assigned courses for Super Admin viewing
  useEffect(() => {
    const loadAssignedCourses = async () => {
      try {
        setLoadingAssignedCourses(true);
        // Load assigned courses from the database
        const assignedCoursesData = await supabaseHelpers.getAllUserCourses();
        setAssignedCourses(assignedCoursesData || []);
      } catch (error) {
        console.error('Error loading assigned courses:', error);
      } finally {
        setLoadingAssignedCourses(false);
      }
    };
    
    loadAssignedCourses();
  }, []);

  // Calculate metrics from real Supabase data
  const totalCourses = supabaseData.courses?.length || 0;
  const totalPodcasts = supabaseData.podcasts?.length || 0;
  const totalDocuments = supabaseData.pdfs?.length || 0;
  
  // Build course hierarchy for content selection
  const courseHierarchy = supabaseData.courses.map((course) => {
    // Get podcasts for this course
    const coursePodcasts = supabaseData.podcasts.filter(
      (podcast) => podcast.course_id === course.id
    );
    
    // Get PDFs for this course
    const coursePDFs = supabaseData.pdfs.filter(
      (pdf) => pdf.course_id === course.id
    );
    
    // Calculate total content
    const totalContent = coursePodcasts.length + coursePDFs.length;
    
    return {
      ...course,
      coursePodcasts,
      coursePDFs,
      totalContent
    };
  });

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
      } else if (contentType === 'quizzes') {
        const validQuizTypes = ['.pdf', '.docx', '.pptx', '.xlsx', '.txt'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validQuizTypes.includes(fileExtension)) {
          alert(`Invalid file type for quizzes. Please upload one of: ${validQuizTypes.join(', ')}`);
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
              <p className="text-xs text-[#a0a0a0">MP3, WAV, AAC, M4A files supported</p>
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
      // For docs, images, templates, and quizzes
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
                    : contentType === 'quizzes'
                      ? 'Quiz files (PDF, DOCX, PPTX, XLSX, TXT) supported'
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

    // Check if a course with the same title already exists (case insensitive)
    const existingCourse = supabaseData.courses.find(
      course => course.title.toLowerCase() === newCourseTitle.trim().toLowerCase()
    );
    
    if (existingCourse) {
      alert(`A course with the name "${newCourseTitle}" already exists. Please choose a different name.`);
      return;
    }

    try {
      console.log('Creating course:', {
        title: newCourseTitle,
        level: newCourseLevel,
        description: newCourseDescription // Add this line
      });

      // Create the course (without created_by since it's not in the schema)
      const courseData = {
        title: newCourseTitle,
        level: newCourseLevel,
        description: newCourseDescription // Add this line
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
      setNewCourseDescription(''); // Add this line

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

    // Check if content with the same title already exists in the selected course
    const existingPodcast = supabaseData.podcasts.find(
      podcast => 
        podcast.title.toLowerCase() === contentTitle.trim().toLowerCase() && 
        podcast.course_id === selectedCourse
    );
    
    const existingPDF = supabaseData.pdfs.find(
      pdf => 
        pdf.title.toLowerCase() === contentTitle.trim().toLowerCase() && 
        pdf.course_id === selectedCourse
    );
    
    if (existingPodcast || existingPDF) {
      alert(`Content with the name "${contentTitle}" already exists in this course. Please choose a different name.`);
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

    if ((contentType === 'docs' || contentType === 'images' || contentType === 'templates' || contentType === 'quizzes') && !selectedFile) {
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

      // Try to make mp3_url nullable if it's not already
      // The database schema should already have mp3_url as nullable based on our previous work

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
          course_id: selectedCourse,
          mp3_url: publicUrl,
          video_url: null, // Explicitly set to null for regular podcasts
          created_by: user.id,
          is_youtube_video: false,
          description: contentDescription || null
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
          course_id: selectedCourse,
          video_url: youtubeUrl,
          mp3_url: null, // Explicitly set to null for YouTube videos
          created_by: user.id,
          is_youtube_video: true,
          description: contentDescription || null
        });

        if (podcastError) {
          console.error('YouTube podcast creation error:', podcastError);
          throw podcastError;
        }
        
        console.log('YouTube podcast created successfully:', podcastData);
        alert('YouTube video added successfully!');
      } else if ((contentType === 'docs' || contentType === 'images' || contentType === 'templates' || contentType === 'quizzes') && selectedFile) {
        // Upload document/image/template/quiz file
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
        console.log('Setting content_type to:', contentType);
        
        // Validate content_type is one of the allowed values
        const validContentTypes = ['docs', 'images', 'templates', 'quizzes'];
        if (!validContentTypes.includes(contentType)) {
          throw new Error(`Invalid content type: ${contentType}`);
        }
        
        // Create PDF record with content_type
        const { data: pdfData, error: pdfError } = await supabaseHelpers.createPDF({
          title: contentTitle,
          course_id: selectedCourse,
          pdf_url: publicUrl,
          created_by: user.id,
          content_type: contentType, // Add content_type field
          description: contentDescription || null
        });

        if (pdfError) {
          console.error('PDF creation error:', pdfError);
          throw pdfError;
        }
        
        console.log('PDF created successfully:', pdfData);
        if (pdfData) {
          console.log('PDF content_type in response:', pdfData.content_type);
        } else {
          console.warn('PDF data is undefined');
        }
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

    if (!selectedAdminId) {
      alert('Please select an admin to assign courses to');
      return;
    }

    try {
      console.log('Creating assignment:', {
        title: assignmentTitle,
        companyId: selectedCompanyId,
        adminId: selectedAdminId,
        courses: selectedCourses
      });
      
      // Get the current user (Super Admin)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        alert('You must be logged in to create assignments');
        return;
      }
      
      console.log('Current user (Super Admin):', currentUser.id, currentUser.email);
      
      // Get the admin user - using a more permissive query for Super Admin
      let adminUser = null;
      let adminError = null;
      
      try {
        // First try to get the user directly
        const { data: directUser, error: directError } = await supabase
          .from('users')
          .select('*')
          .eq('id', selectedAdminId)
          .single();
          
        if (directUser && !directError) {
          adminUser = directUser;
        } else {
          // If direct query fails, try to find in the loaded users data
          const allUsers = await supabaseHelpers.getUsers();
          adminUser = allUsers.find((user: any) => user.id === selectedAdminId);
          
          if (!adminUser) {
            adminError = directError || new Error('User not found');
          }
        }
      } catch (queryError) {
        // Fallback to loaded users data
        try {
          const allUsers = await supabaseHelpers.getUsers();
          adminUser = allUsers.find((user: any) => user.id === selectedAdminId);
          if (!adminUser) {
            adminError = queryError;
          }
        } catch (fallbackError) {
          adminError = queryError || fallbackError;
        }
      }
      
      if (adminError || !adminUser) {
        console.error('Error fetching admin user:', adminError);
        alert('Error fetching admin user. Please try again.');
        return;
      }
      
      console.log('Selected admin user:', adminUser);
      
      // Check if admin belongs to the selected company
      if (adminUser.company_id !== selectedCompanyId) {
        alert('Selected admin does not belong to the selected company');
        return;
      }
      
      // Use the selected course directly if one is selected
      const selectedCourseIds = new Set<string>();
      
      if (assignmentSelectedCourse) {
        // If a specific course is selected, use that
        selectedCourseIds.add(assignmentSelectedCourse);
      } else {
        // Otherwise, get course IDs from selected content items
        for (const contentId of selectedCourses) {
          // Check if it's a podcast
          const podcast = supabaseData.podcasts.find(p => p.id === contentId);
          if (podcast) {
            selectedCourseIds.add(podcast.course_id);
            continue;
          }
          
          // Check if it's a PDF
          const pdf = supabaseData.pdfs.find(p => p.id === contentId);
          if (pdf) {
            selectedCourseIds.add(pdf.course_id);
            continue;
          }
        }
      }
      
      console.log('Selected content belongs to courses:', Array.from(selectedCourseIds));
      
      // Create user_courses records for each selected course
      const assignments = Array.from(selectedCourseIds).map(courseId => ({
        user_id: selectedAdminId,
        course_id: courseId,
        assigned_at: new Date().toISOString(),
        assigned_by: currentUser.id // The Super Admin who is making the assignment
      }));
      
      console.log('Creating assignments:', assignments);
      
      // Insert assignments into user_courses table using admin client to bypass RLS
      let insertError = null;
      
      try {
        // Check if we have admin client available
        if (supabaseAdmin) {
          console.log('Using admin client to create assignments');
          const { error: adminError } = await supabaseAdmin
            .from('user_courses')
            .upsert(assignments, {
              onConflict: 'user_id,course_id',
              ignoreDuplicates: false
            });
          
          insertError = adminError;
        } else {
          console.log('Admin client not available, using regular client');
          // Fallback to regular client
          const { error: regularError } = await supabase
            .from('user_courses')
            .upsert(assignments, {
              onConflict: 'user_id,course_id',
              ignoreDuplicates: false
            });
            
          insertError = regularError;
        }
      } catch (upsertError) {
        console.error('Upsert error:', upsertError);
        // If upsert fails, try inserting one by one
        for (const assignment of assignments) {
          try {
            if (supabaseAdmin) {
              const { error: singleError } = await supabaseAdmin
                .from('user_courses')
                .upsert([assignment], {
                  onConflict: 'user_id,course_id',
                  ignoreDuplicates: true
                });
              
              if (singleError) {
                console.error('Single assignment error:', singleError);
                insertError = singleError;
              }
            } else {
              const { error: singleError } = await supabase
                .from('user_courses')
                .upsert([assignment], {
                  onConflict: 'user_id,course_id',
                  ignoreDuplicates: true
                });
              
              if (singleError) {
                console.error('Single assignment error:', singleError);
                insertError = singleError;
              }
            }
          } catch (singleError) {
            console.error('Error creating single assignment:', singleError);
            insertError = singleError;
          }
        }
      }
        
      if (insertError) {
        console.error('Error creating assignments:', insertError);
        
        // Provide more specific error messages
        let errorMessage = 'Error creating assignments. Please try again.';
        
        // Type-safe error checking
        if (typeof insertError === 'object' && insertError !== null) {
          const errorObj = insertError as any;
          if (errorObj.message && typeof errorObj.message === 'string') {
            if (errorObj.message.includes('409')) {
              errorMessage = 'Assignment already exists. The course may already be assigned to this admin.';
            } else {
              errorMessage = `Error creating assignments: ${errorObj.message}`;
            }
          }
        } else if (typeof insertError === 'string') {
          errorMessage = `Error creating assignments: ${insertError}`;
        }
        
        alert(errorMessage);
        return;
      }
      
      console.log('Assignments created successfully');
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

  // Edit course functions
  const startEditingCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditingCourseData({
      title: course.title,
      level: course.level || 'Basics',
      description: course.description || ''
    });
  };

  const cancelEditingCourse = () => {
    setEditingCourseId(null);
    setEditingCourseData({});
  };

  const saveEditingCourse = async () => {
    if (!editingCourseId) return;

    try {
      await supabaseHelpers.updateCourse(editingCourseId, editingCourseData);
      console.log('Course updated successfully');

      // Reset editing state
      setEditingCourseId(null);
      setEditingCourseData({});

      // Reload data to show the updated course
      await loadSupabaseData();

      alert('Course updated successfully!');
    } catch (error) {
      console.error('Failed to update course:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      alert(errorMessage);
    }
  };

  // Edit content functions
  const startEditingContent = (content: Podcast | PDF) => {
    setEditingContentId(content.id);
    setEditingContentData({
      title: content.title,
    });
  };

  const cancelEditingContent = () => {
    setEditingContentId(null);
    setEditingContentData({});
  };

  const saveEditingContent = async () => {
    if (!editingContentId) return;

    try {
      // Determine if it's a podcast or PDF based on properties
      const isPodcast = 'mp3_url' in editingContentData || 'video_url' in editingContentData;
      
      if (isPodcast) {
        await supabaseHelpers.updatePodcast(editingContentId, editingContentData);
      } else {
        await supabaseHelpers.updatePDF(editingContentId, editingContentData);
      }

      console.log('Content updated successfully');

      // Reset editing state
      setEditingContentId(null);
      setEditingContentData({});

      // Reload data to show the updated content
      await loadSupabaseData();

      alert('Content updated successfully!');
    } catch (error) {
      console.error('Failed to update content:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      alert(errorMessage);
    }
  };

  // Function to manually generate course image using Stability AI
  /*
  const generateCourseImage = async (courseId: string, courseTitle: string) => {
    // Check if Stability AI is configured
    if (!stabilityAI.isConfigured()) {
      alert('Stability AI API key is not configured. Please contact administrator.');
      return;
    }

    try {
      // setIsGeneratingImage(prev => ({ ...prev, [courseId]: true }));
      
      console.log('Generating AI image for course:', courseTitle);
      // const base64Image = await stabilityAI.generateCourseImage(courseTitle);
      
      if (base64Image) {
        // Convert base64 to blob and upload to Supabase storage
        const binaryString = atob(base64Image);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });
        
        // Validate blob size (5MB limit)
        if (blob.size > 5 * 1024 * 1024) {
          alert('Generated image is too large. Please try again.');
          // setIsGeneratingImage(prev => ({ ...prev, [courseId]: false }));
          return;
        }
        
        // Upload to Supabase storage - using the correct 'images' bucket
        const fileName = `course-${courseId}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Error uploading AI generated image:', uploadError);
          alert('Failed to upload generated image. Please try again.');
          // setIsGeneratingImage(prev => ({ ...prev, [courseId]: false }));
          return;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);
        
        // Update course with the new image URL
        try {
          await supabaseHelpers.updateCourse(courseId, { image_url: publicUrl });
          console.log('Course image updated successfully');
          alert('Course image generated and saved successfully!');
        } catch (updateError) {
          console.error('Error updating course with image URL:', updateError);
          alert('Failed to save image to course. Please try again.');
        }
      } else {
        alert('Failed to generate course image. Please try again.');
      }
    } catch (error) {
      console.error('Error generating AI course image:', error);
      alert('Error generating course image. Please try again.');
    } finally {
      // setIsGeneratingImage(prev => ({ ...prev, [courseId]: false }));
    }
  };
  */

  // Function to manually upload course image
  const handleCourseImageUpload = async (courseId: string, file: File) => {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPEG, JPG, PNG, GIF, SVG).');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please upload an image smaller than 5MB.');
        return;
      }
      
      // Upload to Supabase storage - using the correct 'images' bucket
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `course-${courseId}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading course image:', uploadError);
        alert('Failed to upload course image. Please try again.');
        return;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      // Update course with the new image URL
      try {
        await supabaseHelpers.updateCourse(courseId, { image_url: publicUrl });
        console.log('Course image updated successfully');
        alert('Course image uploaded and saved successfully!');
        
        // Reload data to show the new image
        await loadSupabaseData();
      } catch (updateError) {
        console.error('Error updating course with image URL:', updateError);
        alert('Failed to save image to course. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading course image:', error);
      alert('Error uploading course image. Please try again.');
    }
  };

  // Function to manually delete course image
  const deleteCourseImage = async (courseId: string) => {
    try {
      // Update course to remove image URL
      await supabaseHelpers.updateCourse(courseId, { image_url: null });
      console.log('Course image deleted successfully');
      
      // Reload data to reflect changes
      await loadSupabaseData();
    } catch (error) {
      console.error('Error deleting course image:', error);
      alert('Error deleting course image. Please try again.');
    }
  };

  // Toggle course expansion
  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const renderCourseLibrary = () => {
    const filteredCourses = supabaseData.courses.filter(course =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Course Library</h2>
          <button
            onClick={() => setShowAddCourseForm(true)}
            className="custom-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <span className="shadow"></span>
            <span className="edge"></span>
            <span className="front">
              <Plus className="h-5 w-5 mr-2" />
              <span>Add New Course</span>
            </span>
          </button>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No courses</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new course.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCourses.map((course) => {
              // Get content for this course
              const coursePodcasts = supabaseData.podcasts.filter(
                (podcast) => podcast.course_id === course.id
              );
              
              const coursePDFs = supabaseData.pdfs.filter(
                (pdf) => pdf.course_id === course.id
              );
              
              const isExpanded = expandedCourses[course.id];
              
              return (
                <div key={course.id} className="bg-[#1e1e1e] rounded-lg shadow-md overflow-hidden border border-[#333333]">
                  {/* Course Header */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-[#252525]"
                    onClick={() => toggleCourseExpansion(course.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4">
                        <div className="aspect-video w-32 bg-gray-200 relative rounded-lg overflow-hidden flex-shrink-0">
                          {course.image_url ? (
                            <img
                              src={course.image_url}
                              alt={course.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <BookOpen className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          {/* Image Upload Button */}
                          <label className="absolute top-2 right-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-md cursor-pointer">
                            <Image className="h-4 w-4" />
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onClick={(e) => e.stopPropagation()} // Prevent card expansion when clicking upload button
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent card expansion when clicking upload button
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleCourseImageUpload(course.id, file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div>
                          <div className="flex items-center mb-2">
                            {editingCourseId === course.id ? (
                              <input
                                type="text"
                                value={editingCourseData.title || course.title}
                                onChange={(e) => setEditingCourseData({...editingCourseData, title: e.target.value})}
                                className="text-lg font-semibold text-white bg-[#1e1e1e] border border-[#333333] rounded px-2 py-1 w-full"
                              />
                            ) : (
                              <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                            )}
                            {editingCourseId === course.id ? (
                              <select
                                value={editingCourseData.level || course.level || 'Basics'}
                                onChange={(e) => setEditingCourseData({...editingCourseData, level: e.target.value as 'Basics' | 'Intermediate' | 'Advanced'})}
                                className="ml-2 px-2 py-1 text-xs rounded bg-[#1e1e1e] border border-[#333333] text-white"
                              >
                                <option value="Basics">Basic</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                              </select>
                            ) : (
                              course.level && (
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                  course.level === 'Basics' 
                                    ? 'bg-green-900/30 text-green-400' 
                                    : course.level === 'Intermediate' 
                                      ? 'bg-yellow-900/30 text-yellow-400' 
                                      : 'bg-red-900/30 text-red-400'
                                }`}>
                                  {course.level}
                                </span>
                              )
                            )}
                          </div>
                          {editingCourseId === course.id ? (
                            <textarea
                              value={editingCourseData.description || course.description || ''}
                              onChange={(e) => setEditingCourseData({...editingCourseData, description: e.target.value})}
                              className="text-sm text-[#a0a0a0] mb-3 w-full bg-[#1e1e1e] border border-[#333333] rounded px-2 py-1"
                              rows={3}
                              placeholder="Course description"
                            />
                          ) : (
                            <p className="text-sm text-[#a0a0a0] mb-3 line-clamp-2">
                              {course.description || 'No description provided'}
                            </p>
                          )}
                          <div className="flex items-center text-xs text-[#8b5cf6]">
                            <span className="mr-4">
                              {coursePodcasts.length} podcast{coursePodcasts.length !== 1 ? 's' : ''}
                            </span>
                            <span className="mr-4">
                              {coursePDFs.filter(pdf => pdf.content_type === 'docs').length} document{coursePDFs.filter(pdf => pdf.content_type === 'docs').length !== 1 ? 's' : ''}
                            </span>
                            <span className="mr-4">
                              {coursePDFs.filter(pdf => pdf.content_type === 'images').length} image{coursePDFs.filter(pdf => pdf.content_type === 'images').length !== 1 ? 's' : ''}
                            </span>
                            <span>
                              {coursePDFs.filter(pdf => pdf.content_type === 'templates').length} template{coursePDFs.filter(pdf => pdf.content_type === 'templates').length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Course Content (Expanded View) */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-[#333333]">
                      <div className="pt-4">
                        {/* Podcasts Section */}
                        {coursePodcasts.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-[#8b5cf6] mb-2 flex items-center">
                              <Headphones className="h-4 w-4 mr-2" />
                              Podcasts ({coursePodcasts.length})
                            </h4>
                            <div className="space-y-2">
                              {coursePodcasts.map((podcast) => (
                                <div key={podcast.id} className="flex items-center p-3 bg-[#252525] rounded-lg">
                                  <Music className="h-4 w-4 text-[#8b5cf6] mr-3" />
                                  <div className="flex-1 min-w-0">
                                    {editingContentId === podcast.id ? (
                                      <input
                                        type="text"
                                        value={editingContentData.title || ''}
                                        onChange={(e) => setEditingContentData({...editingContentData, title: e.target.value})}
                                        className="w-full px-2 py-1 text-sm border border-[#333333] rounded bg-[#1e1e1e] text-white"
                                        placeholder="Content title"
                                      />
                                    ) : (
                                      <p className="text-sm text-white truncate">{podcast.title}</p>
                                    )}
                                    {podcast.is_youtube_video && (
                                      <p className="text-xs text-[#a0a0a0">YouTube Video</p>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    {editingContentId === podcast.id ? (
                                      <>
                                        <button
                                          onClick={() => saveEditingContent()}
                                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEditingContent}
                                          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startEditingContent(podcast)}
                                          className="text-xs text-yellow-400 hover:text-yellow-300"
                                        >
                                          Edit
                                        </button>
                                        {podcast.is_youtube_video ? (
                                          <a 
                                            href={podcast.video_url || '#'} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-400 hover:text-blue-300"
                                          >
                                            View
                                          </a>
                                        ) : (
                                          <a 
                                            href={podcast.mp3_url || '#'} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-400 hover:text-blue-300"
                                          >
                                            Play
                                          </a>
                                        )}
                                        <button
                                          onClick={() => handleDeletePodcast(podcast.id)}
                                          className="text-xs text-red-400 hover:text-red-300"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Documents Section - Separated by content type */}
                        {/* Docs (Documents) */}
                        {coursePDFs.filter(pdf => pdf.content_type === 'docs').length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Documents ({coursePDFs.filter(pdf => pdf.content_type === 'docs').length})
                            </h4>
                            <div className="space-y-2">
                              {coursePDFs.filter(pdf => pdf.content_type === 'docs').map((pdf) => (
                                <div key={pdf.id} className="flex items-center p-3 bg-[#252525] rounded-lg">
                                  <FileText className="h-4 w-4 text-blue-500 mr-3" />
                                  <div className="flex-1 min-w-0">
                                    {editingContentId === pdf.id ? (
                                      <input
                                        type="text"
                                        value={editingContentData.title || ''}
                                        onChange={(e) => setEditingContentData({...editingContentData, title: e.target.value})}
                                        className="w-full px-2 py-1 text-sm border border-[#333333] rounded bg-[#1e1e1e] text-white"
                                        placeholder="Content title"
                                      />
                                    ) : (
                                      <p className="text-sm text-white truncate">
                                        {pdf?.title || 'Untitled Document'}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    {editingContentId === pdf.id ? (
                                      <>
                                        <button
                                          onClick={() => saveEditingContent()}
                                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEditingContent}
                                          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startEditingContent(pdf)}
                                          className="text-xs text-yellow-400 hover:text-yellow-300"
                                        >
                                          Edit
                                        </button>
                                        <a 
                                          href={pdf?.pdf_url || '#'} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-400 hover:text-blue-300"
                                        >
                                          View
                                        </a>
                                        <button
                                          onClick={() => handleDeletePDF(pdf.id)}
                                          className="text-xs text-red-400 hover:text-red-300"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Images */}
                        {coursePDFs.filter(pdf => pdf.content_type === 'images').length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center">
                              <Image className="h-4 w-4 mr-2" />
                              Images ({coursePDFs.filter(pdf => pdf.content_type === 'images').length})
                            </h4>
                            <div className="space-y-2">
                              {coursePDFs.filter(pdf => pdf.content_type === 'images').map((pdf) => (
                                <div key={pdf.id} className="flex items-center p-3 bg-[#252525] rounded-lg">
                                  <Image className="h-4 w-4 text-green-500 mr-3" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">
                                      {pdf?.title || 'Untitled Image'}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <a 
                                      href={pdf?.pdf_url || '#'} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                      View
                                    </a>
                                    <button
                                      onClick={() => handleDeletePDF(pdf.id)}
                                      className="text-xs text-red-400 hover:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Templates */}
                        {coursePDFs.filter(pdf => pdf.content_type === 'templates').length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Templates ({coursePDFs.filter(pdf => pdf.content_type === 'templates').length})
                            </h4>
                            <div className="space-y-2">
                              {coursePDFs.filter(pdf => pdf.content_type === 'templates').map((pdf) => (
                                <div key={pdf.id} className="flex items-center p-3 bg-[#252525] rounded-lg">
                                  <FileText className="h-4 w-4 text-yellow-500 mr-3" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">
                                      {pdf?.title || 'Untitled Template'}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <a 
                                      href={pdf?.pdf_url || '#'} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                      View
                                    </a>
                                    <button
                                      onClick={() => handleDeletePDF(pdf.id)}
                                      className="text-xs text-red-400 hover:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Quizzes */}
                        {coursePDFs.filter(pdf => pdf.content_type === 'quizzes').length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Quizzes ({coursePDFs.filter(pdf => pdf.content_type === 'quizzes').length})
                            </h4>
                            <div className="space-y-2">
                              {coursePDFs.filter(pdf => pdf.content_type === 'quizzes').map((pdf) => (
                                <div key={pdf.id} className="flex items-center p-3 bg-[#252525] rounded-lg">
                                  <FileText className="h-4 w-4 text-purple-500 mr-3" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">
                                      {pdf?.title || 'Untitled Quiz'}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <a 
                                      href={pdf?.pdf_url || '#'} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                      View
                                    </a>
                                    <button
                                      onClick={() => handleDeletePDF(pdf.id)}
                                      className="text-xs text-red-400 hover:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {coursePodcasts.length === 0 && 
                         coursePDFs.filter(pdf => pdf.content_type === 'docs').length === 0 && 
                         coursePDFs.filter(pdf => pdf.content_type === 'images').length === 0 && 
                         coursePDFs.filter(pdf => pdf.content_type === 'templates').length === 0 && 
                         coursePDFs.filter(pdf => pdf.content_type === 'quizzes').length === 0 && (
                          <div className="text-center py-4 text-[#a0a0a0]">
                            <p className="text-sm">No content uploaded yet</p>
                            <button
                              onClick={() => {
                                setSelectedCourse(course.id);
                                setShowContentUploadForm(true);
                              }}
                              className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                            >
                              Upload content
                            </button>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4">
                          {editingCourseId === course.id ? (
                            <>
                              <button
                                onClick={saveEditingCourse}
                                className="custom-button text-green-600 hover:text-green-800 text-sm font-medium"
                              >
                                <span className="shadow"></span>
                                <span className="edge"></span>
                                <span className="front">
                                  <span>Save</span>
                                </span>
                              </button>
                              <button
                                onClick={cancelEditingCourse}
                                className="custom-button text-gray-600 hover:text-gray-800 text-sm font-medium"
                              >
                                <span className="shadow"></span>
                                <span className="edge"></span>
                                <span className="front">
                                  <span>Cancel</span>
                                </span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditingCourse(course)}
                              className="custom-button text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                            >
                              <span className="shadow"></span>
                              <span className="edge"></span>
                              <span className="front">
                                <span>Edit Course</span>
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedCourse(course.id);
                              setShowContentUploadForm(true);
                            }}
                            className="custom-button text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <span className="shadow"></span>
                            <span className="edge"></span>
                            <span className="front">
                              <span>Add Content</span>
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="custom-button text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            <span className="shadow"></span>
                            <span className="edge"></span>
                            <span className="front">
                              <span>Delete Course</span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
              className="custom-button"
            >
              <span className="shadow"></span>
              <span className="edge"></span>
              <span className="front">
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span>Back</span>
              </span>
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

                {/* Add Course Description Field */}
                <div>
                  <label htmlFor="course-description" className="block text-sm font-medium text-white mb-2">
                    Course Description
                  </label>
                  <textarea
                    id="course-description"
                    value={newCourseDescription}
                    onChange={(e) => setNewCourseDescription(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="Enter course description"
                  />
                  <p className="mt-1 text-xs text-[#a0a0a0]">
                    Provide a detailed description of this course
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
          </div>

          {/* Courses List */}
          <div className="lg:col-span-2">
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
                    onChange={(e) => setContentType(e.target.value as 'audio' | 'video' | 'docs' | 'images' | 'templates' | 'quizzes')}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                  >
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="docs">Docs</option>
                    <option value="images">Images</option>
                    <option value="templates">Templates</option>
                    <option value="quizzes">Quizzes</option>
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
                      : contentType === 'quizzes'
                      ? 'Quiz content for courses'
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
                      ((contentType === 'docs' || contentType === 'images' || contentType === 'templates' || contentType === 'quizzes') && !selectedFile)
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
            {renderCourseLibrary()}
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

              {/* Select Course for Assignment */}
              <div>
                <label htmlFor="assignment-course" className="block text-sm font-medium text-white mb-2">
                  Select Course *
                </label>
                <select
                  id="assignment-course"
                  value={assignmentSelectedCourse}
                  onChange={(e) => setAssignmentSelectedCourse(e.target.value)}
                  className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                  disabled={!selectedCompanyId}
                >
                  <option value="">Choose a course...</option>
                  {supabaseData.courses
                    .filter((course: any) => !selectedCompanyId || course.company_id === selectedCompanyId || !course.company_id)
                    .map((course: any) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
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
                  {courseHierarchy.filter(course => !assignmentSelectedCourse || course.id === assignmentSelectedCourse).length > 0 ? (
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
                      {assignmentSelectedCourse ? 'No content available for selected course' : 'No content available. Upload content first.'}
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
                  setAssignmentSelectedCourse('');
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