import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, BookOpen, User, ChevronLeft, Play, FileText, MessageSquare, Headphones, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import DebugUserCourses from '../../components/Debug/DebugUserCourses';

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('podcasts');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<any>(null);
  const [currentPdf, setCurrentPdf] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [podcastProgress, setPodcastProgress] = useState<Record<string, number>>({});
  const [isUserAssignedToCourse, setIsUserAssignedToCourse] = useState<boolean>(false);
  const [assignmentChecked, setAssignmentChecked] = useState<boolean>(false);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error:', error);
          return;
        }
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error getting user ID:', err);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    console.log('CourseId changed:', courseId);
    if (courseId && userId) {
      checkUserCourseAssignment();
    }
  }, [courseId, userId]);

  useEffect(() => {
    console.log('User assignment status changed or dependencies updated:', { 
      courseId, 
      userId, 
      isUserAssignedToCourse,
      assignmentChecked
    });
    // Only load course data after we've checked the assignment
    if (courseId && userId && assignmentChecked) {
      loadCourseData();
    }
  }, [courseId, userId, isUserAssignedToCourse, assignmentChecked]);

  useEffect(() => {
    if (userId) {
      loadPodcastProgress();
    }
  }, [userId]);

  const checkUserCourseAssignment = async () => {
    // Reset states
    setIsUserAssignedToCourse(false);
    setAssignmentChecked(false);
    
    if (!userId || !courseId) {
      console.log('Missing userId or courseId for assignment check');
      setAssignmentChecked(true);
      return;
    }
    
    try {
      console.log('Checking if user', userId, 'is assigned to course', courseId);
      
      // First, try to get all user courses to see what's available
      const { data: allUserCourses, error: allCoursesError } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', userId);
      
      if (allCoursesError) {
        console.error('Error fetching all user courses:', allCoursesError);
      } else {
        console.log('All user courses:', allUserCourses);
      }
      
      // Check if user is assigned to this specific course
      // Note: user_courses table doesn't have an 'id' column, only user_id and course_id
      const { data, error } = await supabase
        .from('user_courses')
        .select('user_id, course_id, assigned_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking course assignment:', error);
        console.log('Setting isUserAssignedToCourse to false due to error');
        setIsUserAssignedToCourse(false);
        setAssignmentChecked(true);
        return;
      }
      
      const isAssigned = !!data;
      console.log('User course assignment result:', isAssigned, 'Data:', data);
      setIsUserAssignedToCourse(isAssigned);
      setAssignmentChecked(true);
      
      // Additional debugging - check if course exists at all
      if (!isAssigned) {
        console.log('User is not assigned to course. Checking if course exists...');
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', courseId)
          .maybeSingle();
        
        if (courseError) {
          console.error('Error checking if course exists:', courseError);
        } else {
          console.log('Course exists:', courseData);
        }
      }
    } catch (err) {
      console.error('Error checking course assignment:', err);
      console.log('Setting isUserAssignedToCourse to false due to exception');
      setIsUserAssignedToCourse(false);
      setAssignmentChecked(true);
    }
  };

  const loadPodcastProgress = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error loading podcast progress:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Create a map of podcast_id to progress_percent
        const progressMap: Record<string, number> = {};
        
        data.forEach(item => {
          progressMap[item.podcast_id] = item.progress_percent || 0;
        });
        
        setPodcastProgress(progressMap);
        console.log('Loaded podcast progress:', progressMap);
      }
    } catch (error) {
      console.error('Error loading podcast progress:', error);
    }
  };

  const loadCourseData = async () => {
    try {
      console.log('Loading course data for courseId:', courseId);
      console.log('User ID:', userId);
      console.log('Is user assigned to course:', isUserAssignedToCourse);
      setLoading(true);
      setError(null);

      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('Timeout reached, setting loading to false');
        setLoading(false);
        setError('Timeout loading course data. Please try again.');
      }, 10000); // 10 second timeout

      // Check if user is assigned to this course
      if (!isUserAssignedToCourse) {
        clearTimeout(timeoutId);
        console.log('User is not assigned to this course, showing error');
        setError('You are not assigned to this course. Please contact your administrator.');
        setLoading(false);
        return;
      }

      console.log('User is assigned, proceeding to load course data...');
      // Get course details and related data including documents
      console.log('Fetching course data...');
      const [courseData, categoriesData, podcastsData, pdfsData] = await Promise.all([
        supabase
        .from('courses')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq('id', courseId)
        .single()
        .then(res => {
          console.log('Course data result:', res);
          if (res.error) throw res.error;
          return res.data;
        }),
        supabase
        .from('content_categories')
        .select('*')
        .eq('course_id', courseId)
        .order('name')
        .then(res => {
          console.log('Categories data result:', res);
          return res.data || [];
        }),
        supabase
        .from('podcasts')
        .select('*')
        .eq('course_id', courseId)
        .then(res => {
          console.log('Podcasts data result:', res);
          return res.data || [];
        }),
        supabase
        .from('pdfs')
        .select('*')
        .eq('course_id', courseId)
        .then(res => {
          console.log('PDFs data result:', res);
          return res.data || [];
        })
      ]);
      
      // Clear the timeout since we've successfully loaded
      clearTimeout(timeoutId);
      
      console.log('All data loaded successfully');
      setCourse(courseData);
      setCategories(categoriesData);
      setPodcasts(podcastsData);
      setPdfs(pdfsData);

      // Set first category as active if categories exist
      if (categoriesData && categoriesData.length > 0) {
        setActiveCategory(categoriesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load course data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPodcast = (podcast: any) => {
    console.log("Playing podcast:", podcast);
    setCurrentPodcast(podcast);
  };

  const getCourseImage = (courseTitle: string) => {
    const title = courseTitle?.toLowerCase() || '';
    
    if (title.includes('communication')) {
      return 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('listen')) {
      return 'https://images.pexels.com/photos/7176319/pexels-photo-7176319.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('time') || title.includes('management')) {
      return 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('leadership')) {
      return 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else if (title.includes('question')) {
      return 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    } else {
      return 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
  };

  const getFilteredPodcasts = () => {
    if (!activeCategory) return podcasts;
    return podcasts.filter(podcast => podcast.category_id === activeCategory);
  };

  if (loading) {
    console.log('CourseDetail: Showing loading spinner');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    console.log('CourseDetail: Showing error message:', error);
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600">Error loading course: {error}</div>
          <button
            onClick={() => navigate('/user/courses')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Courses
          </button>
        </div>
        
        {/* Debug component for troubleshooting */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      </div>
    );
  }

  if (!course) {
    console.log('CourseDetail: Showing course not found message');
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Course not found</div>
        </div>
        
        {/* Debug component for troubleshooting */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/user/courses')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <ChevronLeft className="h-5 w-5 mr-1" />
        Back to Courses
      </button>

      {/* Debug component for troubleshooting - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Debug Information</h3>
          <DebugUserCourses />
        </div>
      )}

      {/* Course Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="flex flex-col md:flex-row">
          {/* Course Image */}
          <div className="md:w-1/3 h-64 bg-gray-200">
            <img
              src={getCourseImage(course.title)}
              alt={course.title}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
          
          {/* Course Info */}
          <div className="md:w-2/3 p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-gray-600 mb-4">
                {course.description || `Master the art of ${course.title.toLowerCase()}. This course contains various modules to help you develop your skills.`}
              </p>
              
              <div className="flex flex-wrap items-center text-sm text-gray-500 mb-4">
                <div className="flex items-center mr-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{podcasts.length > 0 ? `${Math.ceil(podcasts.length * 0.25)} hours` : 'No content yet'}</span>
                </div>
                <div className="flex items-center mr-4">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>{categories.length} modules</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('podcasts')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'podcasts' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Headphones className="h-5 w-5 mr-2" />
          Podcasts
        </button>
        <button
          onClick={() => setActiveTab('downloads')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'downloads' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="h-5 w-5 mr-2" />
          Downloads
        </button>
        <button
          onClick={() => setActiveTab('ai-chat')}
          className={`py-3 px-4 rounded-lg flex justify-center items-center font-medium ${
            activeTab === 'ai-chat' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          AI Chat Bot
        </button>
      </div>

      {activeTab === 'podcasts' && (
        <>
          {/* Category Filters */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`py-3 px-4 rounded-lg text-center font-medium ${
                  activeCategory === category.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Podcast List */}
            <div className="md:w-1/3 bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-4">Podcasts</h2>
              <div className="space-y-3">
                {getFilteredPodcasts().length > 0 ? 
                  getFilteredPodcasts().map(podcast => (
                    <div key={podcast.id} className={`p-3 rounded-lg cursor-pointer transition-colors ${currentPodcast?.id === podcast.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`} onClick={() => handlePlayPodcast(podcast)}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Headphones className="h-5 w-5 text-blue-600" />
                          </div>
                        </div> 
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{podcast.title}</h3>
                            <p className="text-xs text-gray-500">Audio content</p>
                            {podcastProgress[podcast.id] > 0 && (
                              <div className="ml-2 flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${podcastProgress[podcast.id]}%` }}></div>
                                </div>
                              </div>
                            )}
                         </div>
                       </div>
                     </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      No podcasts found for this category
                    </div>
                  )}
              </div>
            </div>

            {/* Media Player */}
            <div className="md:w-2/3 bg-white rounded-lg shadow-md p-6">
              {currentPodcast ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{currentPodcast.title}</h2>
                  <audio
                    src={currentPodcast.mp3_url}
                    controls
                    controlsList="nodownload noplaybackrate"
                    className="w-full"
                    onTimeUpdate={async (e) => {
                      const audio = e.currentTarget;
                      const progress = Math.round((audio.currentTime / audio.duration) * 100);
                      setPodcastProgress(prev => ({
                        ...prev,
                        [currentPodcast.id]: progress
                      }));
                      
                      // Save progress to Supabase
                      if (userId && progress > 0) {
                        try {
                          await supabase
                            .from('podcast_progress')
                            .upsert({
                              user_id: userId,
                              podcast_id: currentPodcast.id,
                              playback_position: audio.currentTime,
                              duration: audio.duration,
                              progress_percent: progress,
                              last_played_at: new Date().toISOString()
                            }, {
                              onConflict: 'user_id,podcast_id'
                            });
                          console.log('Progress saved');
                        } catch (error) {
                          console.error('Error saving progress:', error);
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Headphones className="h-12 w-12 mb-4" />
                  <p>Select a podcast to start listening</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}


      {activeTab === 'downloads' && pdfs.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* PDFs */}
            {pdfs.map(pdf => (
              <div key={pdf.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">{pdf.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">PDF Document</p>
                    <a 
                      href={pdf.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPdf(pdf);
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      View Document
                    </a>
                  </div>
                </div>
              </div>
            ))}
            
          </div>
          
          {/* PDF Viewer Modal */}
          {currentPdf && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{currentPdf.title}</h2>
                  <div className="flex space-x-2">
                    <a 
                      href={currentPdf.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </a>
                    <button
                      onClick={() => setCurrentPdf(null)}
                      className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300"
                    >
                     Close
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {currentPdf.pdf_url.toLowerCase().endsWith('.pdf') || currentPdf.pdf_url.toLowerCase().endsWith('.txt') ? (
                    <iframe 
                      src={currentPdf.pdf_url} 
                      className="w-full h-full border-0"
                      title={currentPdf.title}
                    ></iframe>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8 text-center">
                      <FileText className="h-16 w-16 text-blue-500 mb-4" />
                      <h3 className="text-xl font-medium text-gray-800 mb-2">Document Download Required</h3>
                      <p className="text-gray-600 mb-6">This file type ({currentPdf.pdf_url.split('.').pop()?.toUpperCase()}) requires download to view.</p>
                      <a 
                        href={currentPdf.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        download
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-5 w-5 inline mr-2" />
                        Download to View
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'downloads' && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Documents Available</h2>
          <p className="text-gray-500">
            There are no downloadable resources for this course yet.
          </p>
        </div>
      )}

      {activeTab === 'ai-chat' && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">AI Chat Bot Coming Soon</h2>
          <p className="text-gray-500">
            Our AI assistant is being trained on this course content and will be available soon to answer your questions!
          </p>
        </div>
      )}
    </div>
  );
}