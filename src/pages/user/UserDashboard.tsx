import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Headphones, 
  FileText, 
  Image, 
  File,
  Play,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { useRealtimeSync } from '../../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';

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
  category: string;
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

interface UserCourse {
  user_id: string;
  course_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  courses: Course;
}

// Add this helper function to determine file type from URL
const getFileType = (url: string): 'pdf' | 'image' | 'template' => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  const pdfExtensions = ['pdf'];
  
  if (imageExtensions.includes(extension)) {
    return 'image';
  } else if (pdfExtensions.includes(extension)) {
    return 'pdf';
  } else {
    return 'template';
  }
};

// Add this helper function to get file extension
const getFileExtension = (url: string): string => {
  return url.split('.').pop()?.toUpperCase() || 'FILE';
};

export default function UserDashboard({ userEmail = '' }: { userEmail?: string }) {
  const [userId, setUserId] = useState<string>('');
  const [podcastProgress, setPodcastProgress] = useState<Record<string, number>>({});
  const [podcastDurations, setPodcastDurations] = useState<Record<string, number>>({});
  const [supabaseData, setSupabaseData] = useState<{
    courses: Course[];
    categories: Category[];
    podcasts: Podcast[];
    pdfs: PDF[];
    userCourses: UserCourse[];
  }>({
    courses: [],
    categories: [],
    podcasts: [],
    pdfs: [],
    userCourses: []
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    audios: true,
    videos: true,
    docs: true,
    images: true,
    templates: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const navigate = useNavigate();

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
        setPodcastProgress({});
        setPodcastDurations({});
        return;
      }
      
      if (data && data.length > 0) {
        const progressMap: Record<string, any> = {};
        const durationMap: Record<string, number> = {};
        
        data.forEach(item => {
          progressMap[item.podcast_id] = item.progress_percent || 0;
          durationMap[item.podcast_id] = typeof item.duration === 'string' ? 
            parseFloat(item.duration) : (item.duration || 0);
        });
        
        setPodcastProgress(progressMap);
        setPodcastDurations(durationMap);
      } else {
        setPodcastProgress({});
        setPodcastDurations({});
      }
    } catch (error) {
      console.error('Exception loading podcast progress:', error);
      setPodcastProgress({});
      setPodcastDurations({});
    }
  };

  // Load user data - only assigned courses
  const loadUserData = async () => {
    try {
      if (!userId) return;
      
      setError(null);
      
      // Load all data in parallel
      const [categoriesData, podcastsData, pdfsData, userCoursesData] = await Promise.all([
        supabaseHelpers.getContentCategories(), 
        supabaseHelpers.getPodcasts(),
        supabaseHelpers.getPDFs(),
        supabaseHelpers.getUserCourses(userId)
      ]);
      
      // Load courses using regular supabase client to respect RLS policies
      let coursesData = [];
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching courses with RLS:', error);
          coursesData = [];
        } else {
          coursesData = data || [];
        }
      } catch (courseError) {
        console.error('Exception fetching courses:', courseError);
        coursesData = [];
      }
      
      // Filter courses to show only courses assigned to this specific user
      const assignedCourseIds = new Set(userCoursesData.map(uc => uc.course_id));
      const assignedCourses = (coursesData || []).filter(course => 
        assignedCourseIds.has(course.id)
      );
      
      setSupabaseData(prev => ({
        ...prev,
        courses: assignedCourses,
        categories: categoriesData || [],
        podcasts: podcastsData,
        pdfs: pdfsData,
        userCourses: userCoursesData || []
      }));
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('user-courses', loadUserData);
  useRealtimeSync('courses', loadUserData);
  useRealtimeSync('podcasts', loadUserData);
  useRealtimeSync('content-categories', loadUserData);
  useRealtimeSync('pdfs', loadUserData);
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

  // Build course hierarchy for display with better categorization
  const courseHierarchy = React.useMemo(() => {
    const assignedCourseIds = new Set(supabaseData.userCourses.map(uc => uc.course_id));
    const assignedCourses = supabaseData.courses.filter(course => 
      assignedCourseIds.has(course.id)
    );
    
    return assignedCourses.map(course => {
      const courseCategories = supabaseData.categories.filter(cat => cat.course_id === course.id);
      
      const categoriesWithPodcasts = courseCategories.map(category => {
        const categoryPodcasts = supabaseData.podcasts.filter(
          podcast => podcast.category_id === category.id
        );
        return {
          ...category,
          podcasts: categoryPodcasts
        };
      });
      
      const uncategorizedPodcasts = supabaseData.podcasts.filter(
        podcast => podcast.course_id === course.id && !podcast.category_id
      );
      
      const coursePDFs = supabaseData.pdfs.filter(pdf => pdf.course_id === course.id);
      
      // Categorize documents by file type
      const documents = coursePDFs.map(pdf => ({
        ...pdf,
        fileType: getFileType(pdf.pdf_url),
        fileExtension: getFileExtension(pdf.pdf_url)
      }));
      
      const pdfDocuments = documents.filter(doc => doc.fileType === 'pdf');
      const imageDocuments = documents.filter(doc => doc.fileType === 'image');
      const templateDocuments = documents.filter(doc => doc.fileType === 'template');
      
      return {
        ...course,
        categories: categoriesWithPodcasts,
        uncategorizedPodcasts,
        coursePDFs: documents,
        pdfDocuments,
        imageDocuments,
        templateDocuments,
        totalPodcasts: categoriesWithPodcasts.reduce(
          (sum, cat) => sum + cat.podcasts.length, 0
        ) + uncategorizedPodcasts.length,
        totalDocuments: documents.length
      };
    });
  }, [supabaseData.courses, supabaseData.categories, supabaseData.podcasts, supabaseData.pdfs, supabaseData.userCourses]);

  // Toggle section expansion
  const toggleSectionExpansion = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate total items for each content type
  const getContentCounts = () => {
    let audioCount = 0;
    let videoCount = 0;
    let docCount = 0;
    let imageCount = 0;
    let templateCount = 0;
    
    courseHierarchy.forEach(course => {
      // Count audio podcasts (not YouTube videos)
      course.categories.forEach(category => {
        audioCount += category.podcasts.filter(p => !p.is_youtube_video).length;
      });
      audioCount += course.uncategorizedPodcasts.filter(p => !p.is_youtube_video).length;
      
      // Count video podcasts (YouTube videos)
      course.categories.forEach(category => {
        videoCount += category.podcasts.filter(p => p.is_youtube_video).length;
      });
      videoCount += course.uncategorizedPodcasts.filter(p => p.is_youtube_video).length;
      
      // Count documents
      docCount += course.pdfDocuments.length;
      imageCount += course.imageDocuments.length;
      templateCount += course.templateDocuments.length;
    });
    
    return { audioCount, videoCount, docCount, imageCount, templateCount };
  };

  const { audioCount, videoCount, docCount, imageCount, templateCount } = getContentCounts();

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
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-700 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view - organized by content type
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Learning Dashboard</h1>
          <p className="mt-1 text-sm text-[#a0a0a0]">
            Access all your assigned courses and content
          </p>
        </div>

        {/* Content Type Sections */}
        <div className="space-y-6">
          {/* Audios Section */}
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333]">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
              onClick={() => toggleSectionExpansion('audios')}
            >
              <div className="flex items-center">
                <Headphones className="h-5 w-5 text-[#8b5cf6] mr-3" />
                <h2 className="text-lg font-medium text-white">Audio Content</h2>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[#a0a0a0] mr-3">{audioCount} items</span>
                {expandedSections.audios ? (
                  <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                )}
              </div>
            </div>
            
            {expandedSections.audios && (
              <div className="px-4 pb-4">
                {courseHierarchy.map(course => (
                  <div key={course.id} className="mb-4">
                    <h3 className="text-md font-medium text-white mb-2">{course.title}</h3>
                    <div className="space-y-2">
                      {course.categories.map(category => (
                        category.podcasts.filter(p => !p.is_youtube_video).map(podcast => (
                          <div 
                            key={podcast.id} 
                            className="flex items-center justify-between p-3 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                            onClick={() => {
                              // Navigate to course detail page with audio tab selected
                              navigate(`/user/courses/${course.id}`, { state: { activeTab: 'audios' } });
                            }}
                          >
                            <div className="flex items-center">
                              <Headphones className="h-4 w-4 text-[#8b5cf6] mr-3" />
                              <div>
                                <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                                <p className="text-xs text-[#a0a0a0]">{category.name}</p>
                              </div>
                            </div>
                            {podcastProgress[podcast.id] > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8b5cf6]/20 text-[#8b5cf6]">
                                {Math.round(podcastProgress[podcast.id] || 0)}%
                              </span>
                            )}
                          </div>
                        ))
                      ))}
                      {course.uncategorizedPodcasts.filter(p => !p.is_youtube_video).map(podcast => (
                        <div 
                          key={podcast.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                          onClick={() => {
                            // Navigate to course detail page with audio tab selected
                            navigate(`/user/courses/${course.id}`, { state: { activeTab: 'audios' } });
                          }}
                        >
                          <div className="flex items-center">
                            <Headphones className="h-4 w-4 text-[#8b5cf6] mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">Uncategorized</p>
                            </div>
                          </div>
                          {podcastProgress[podcast.id] > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8b5cf6]/20 text-[#8b5cf6]">
                              {Math.round(podcastProgress[podcast.id] || 0)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {audioCount === 0 && (
                  <div className="text-center py-8">
                    <Headphones className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-white">No audio content available</h3>
                    <p className="mt-1 text-sm text-[#a0a0a0]">
                      Your assigned courses don't have any audio content yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Videos Section */}
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333]">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
              onClick={() => toggleSectionExpansion('videos')}
            >
              <div className="flex items-center">
                <Play className="h-5 w-5 text-red-500 mr-3" />
                <h2 className="text-lg font-medium text-white">Video Content</h2>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[#a0a0a0] mr-3">{videoCount} items</span>
                {expandedSections.videos ? (
                  <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                )}
              </div>
            </div>
            
            {expandedSections.videos && (
              <div className="px-4 pb-4">
                {courseHierarchy.map(course => (
                  <div key={course.id} className="mb-4">
                    <h3 className="text-md font-medium text-white mb-2">{course.title}</h3>
                    <div className="space-y-2">
                      {course.categories.map(category => (
                        category.podcasts.filter(p => p.is_youtube_video).map(podcast => (
                          <div 
                            key={podcast.id} 
                            className="flex items-center justify-between p-3 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                            onClick={() => {
                              // Navigate to course detail page with videos tab selected
                              navigate(`/user/courses/${course.id}`, { state: { activeTab: 'videos' } });
                            }}
                          >
                            <div className="flex items-center">
                              <Play className="h-4 w-4 text-red-500 mr-3" />
                              <div>
                                <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                                <p className="text-xs text-[#a0a0a0]">{category.name}</p>
                              </div>
                            </div>
                            {podcastProgress[podcast.id] > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500">
                                {Math.round(podcastProgress[podcast.id] || 0)}%
                              </span>
                            )}
                          </div>
                        ))
                      ))}
                      {course.uncategorizedPodcasts.filter(p => p.is_youtube_video).map(podcast => (
                        <div 
                          key={podcast.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                          onClick={() => {
                            // Navigate to course detail page with videos tab selected
                            navigate(`/user/courses/${course.id}`, { state: { activeTab: 'videos' } });
                          }}
                        >
                          <div className="flex items-center">
                            <Play className="h-4 w-4 text-red-500 mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-white">{podcast.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">Uncategorized</p>
                            </div>
                          </div>
                          {podcastProgress[podcast.id] > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500">
                              {Math.round(podcastProgress[podcast.id] || 0)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {videoCount === 0 && (
                  <div className="text-center py-8">
                    <Play className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-white">No video content available</h3>
                    <p className="mt-1 text-sm text-[#a0a0a0]">
                      Your assigned courses don't have any video content yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Docs Section */}
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333]">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
              onClick={() => toggleSectionExpansion('docs')}
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-purple-500 mr-3" />
                <h2 className="text-lg font-medium text-white">Documents</h2>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[#a0a0a0] mr-3">{docCount} items</span>
                {expandedSections.docs ? (
                  <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                )}
              </div>
            </div>
            
            {expandedSections.docs && (
              <div className="px-4 pb-4">
                {courseHierarchy.map(course => (
                  <div key={course.id} className="mb-4">
                    <h3 className="text-md font-medium text-white mb-2">{course.title}</h3>
                    <div className="space-y-2">
                      {course.pdfDocuments.map(doc => (
                        <div 
                          key={doc.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                          onClick={() => window.open(doc.pdf_url, '_blank')}
                        >
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-purple-500 mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-white">{doc.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">PDF Document</p>
                            </div>
                          </div>
                          <File className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {docCount === 0 && (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-white">No documents available</h3>
                    <p className="mt-1 text-sm text-[#a0a0a0]">
                      Your assigned courses don't have any documents yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Images Section */}
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333]">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
              onClick={() => toggleSectionExpansion('images')}
            >
              <div className="flex items-center">
                <Image className="h-5 w-5 text-blue-500 mr-3" />
                <h2 className="text-lg font-medium text-white">Images & Cheatsheets</h2>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[#a0a0a0] mr-3">{imageCount} items</span>
                {expandedSections.images ? (
                  <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                )}
              </div>
            </div>
            
            {expandedSections.images && (
              <div className="px-4 pb-4">
                {courseHierarchy.map(course => (
                  <div key={course.id} className="mb-4">
                    <h3 className="text-md font-medium text-white mb-2">{course.title}</h3>
                    <div className="space-y-2">
                      {course.imageDocuments.map(image => (
                        <div 
                          key={image.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                          onClick={() => window.open(image.pdf_url, '_blank')}
                        >
                          <div className="flex items-center">
                            <Image className="h-4 w-4 text-blue-500 mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-white">{image.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">{image.fileExtension} Image</p>
                            </div>
                          </div>
                          <Image className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {imageCount === 0 && (
                  <div className="text-center py-8">
                    <Image className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-white">No images available</h3>
                    <p className="mt-1 text-sm text-[#a0a0a0]">
                      Your assigned courses don't have any images or cheatsheets yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Templates Section */}
          <div className="bg-[#1e1e1e] rounded-lg border border-[#333333]">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252525]"
              onClick={() => toggleSectionExpansion('templates')}
            >
              <div className="flex items-center">
                <File className="h-5 w-5 text-yellow-500 mr-3" />
                <h2 className="text-lg font-medium text-white">Templates</h2>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[#a0a0a0] mr-3">{templateCount} items</span>
                {expandedSections.templates ? (
                  <ChevronDown className="h-5 w-5 text-[#a0a0a0]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-[#a0a0a0]" />
                )}
              </div>
            </div>
            
            {expandedSections.templates && (
              <div className="px-4 pb-4">
                {courseHierarchy.map(course => (
                  <div key={course.id} className="mb-4">
                    <h3 className="text-md font-medium text-white mb-2">{course.title}</h3>
                    <div className="space-y-2">
                      {course.templateDocuments.map(template => (
                        <div 
                          key={template.id} 
                          className="flex items-center justify-between p-3 bg-[#252525] rounded-lg hover:bg-[#333333] cursor-pointer"
                          onClick={() => window.open(template.pdf_url, '_blank')}
                        >
                          <div className="flex items-center">
                            <File className="h-4 w-4 text-yellow-500 mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-white">{template.title}</h4>
                              <p className="text-xs text-[#a0a0a0]">{template.fileExtension} Template</p>
                            </div>
                          </div>
                          <File className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {templateCount === 0 && (
                  <div className="text-center py-8">
                    <File className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-white">No templates available</h3>
                    <p className="mt-1 text-sm text-[#a0a0a0]">
                      Your assigned courses don't have any templates yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View All Courses Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/user/courses')}
            className="inline-flex items-center px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#1e1e1e] hover:bg-[#252525]"
          >
            View All Courses
          </button>
        </div>
      </div>
    </div>
  );
}