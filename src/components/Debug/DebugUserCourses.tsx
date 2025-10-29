import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const DebugUserCourses = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          throw new Error(`Auth error: ${authError.message}`);
        }
        
        if (!user) {
          throw new Error('No user authenticated');
        }
        
        console.log('Debug: Current user', user);
        
        // Get user courses
        const { data: userCourses, error: userCoursesError } = await supabase
          .from('user_courses')
          .select(`
            *,
            courses (
              id,
              title
            )
          `)
          .eq('user_id', user.id);
        
        if (userCoursesError) {
          throw new Error(`User courses error: ${userCoursesError.message}`);
        }
        
        console.log('Debug: User courses', userCourses);
        
        // Get all courses
        const { data: allCourses, error: allCoursesError } = await supabase
          .from('courses')
          .select('*');
        
        if (allCoursesError) {
          throw new Error(`All courses error: ${allCoursesError.message}`);
        }
        
        console.log('Debug: All courses', allCourses);
        
        setDebugInfo({
          user,
          userCourses,
          allCourses
        });
      } catch (err) {
        console.error('Debug error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDebugInfo();
  }, []);
  
  if (loading) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        <p>Loading debug information...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>Error: {error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
      <h3 className="font-bold mb-2">Debug Information</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold">User Info:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
          {JSON.stringify(debugInfo?.user, null, 2)}
        </pre>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold">User Course Assignments ({debugInfo?.userCourses?.length || 0}):</h4>
        {debugInfo?.userCourses && debugInfo.userCourses.length > 0 ? (
          <div className="space-y-2">
            {debugInfo.userCourses.map((uc: any, index: number) => (
              <div key={index} className="bg-white p-2 rounded">
                <p><strong>Course ID:</strong> {uc.course_id}</p>
                <p><strong>Course Title:</strong> {uc.courses?.title || 'Unknown'}</p>
                <p><strong>Assigned At:</strong> {uc.assigned_at}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No course assignments found</p>
        )}
      </div>
      
      <div>
        <h4 className="font-semibold">All Courses ({debugInfo?.allCourses?.length || 0}):</h4>
        {debugInfo?.allCourses && debugInfo.allCourses.length > 0 ? (
          <div className="space-y-2">
            {debugInfo.allCourses.map((course: any, index: number) => (
              <div key={index} className="bg-white p-2 rounded">
                <p><strong>ID:</strong> {course.id}</p>
                <p><strong>Title:</strong> {course.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No courses found</p>
        )}
      </div>
    </div>
  );
};

export default DebugUserCourses;