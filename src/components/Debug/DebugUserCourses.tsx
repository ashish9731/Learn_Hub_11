import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function DebugUserCourses() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        // Get all courses with RLS (what user can see)
        const { data: userCourses, error: userCoursesError } = await supabase
          .from('courses')
          .select('*');
        
        // Get user's course assignments
        const { data: userCourseAssignments, error: userCourseAssignmentsError } = await supabase
          .from('user_courses')
          .select(`
            *,
            courses (id, title)
          `)
          .eq('user_id', userId);
        
        // Get all courses using admin client for comparison
        const { data: allCourses, error: allCoursesError } = await supabase
          .from('courses')
          .select('*');
        
        setDebugInfo({
          userId,
          userCourses: userCourses || [],
          userCoursesError: userCoursesError?.message,
          userCourseAssignments: userCourseAssignments || [],
          userCourseAssignmentsError: userCourseAssignmentsError?.message,
          allCourses: allCourses || [],
          allCoursesError: allCoursesError?.message,
          session: session || null
        });
      } catch (error: any) {
        console.error('Debug error:', error);
        setDebugInfo({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) {
    return <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">Loading debug info...</div>;
  }

  if (!debugInfo) {
    return <div className="p-4 bg-red-100 border border-red-400 rounded">No debug info available</div>;
  }

  return (
    <div className="p-4 bg-gray-100 border border-gray-400 rounded">
      <h3 className="text-lg font-bold mb-2">Debug Information</h3>
      
      {debugInfo.error ? (
        <div className="text-red-600">Error: {debugInfo.error}</div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="font-bold">User Info</h4>
            <p>User ID: {debugInfo.userId || 'Not logged in'}</p>
          </div>
          
          <div>
            <h4 className="font-bold">Courses User Can See (RLS Applied)</h4>
            <p>Error: {debugInfo.userCoursesError || 'None'}</p>
            <ul className="list-disc pl-5">
              {debugInfo.userCourses.map((course: any) => (
                <li key={course.id}>{course.title} (ID: {course.id})</li>
              ))}
            </ul>
            <p>Total: {debugInfo.userCourses.length}</p>
          </div>
          
          <div>
            <h4 className="font-bold">User's Course Assignments</h4>
            <p>Error: {debugInfo.userCourseAssignmentsError || 'None'}</p>
            <ul className="list-disc pl-5">
              {debugInfo.userCourseAssignments.map((assignment: any) => (
                <li key={assignment.course_id}>
                  {assignment.courses?.title || 'Unknown Course'} (ID: {assignment.course_id})
                </li>
              ))}
            </ul>
            <p>Total: {debugInfo.userCourseAssignments.length}</p>
          </div>
          
          <div>
            <h4 className="font-bold">All Courses (Admin View)</h4>
            <p>Error: {debugInfo.allCoursesError || 'None'}</p>
            <ul className="list-disc pl-5">
              {debugInfo.allCourses.map((course: any) => (
                <li key={course.id}>{course.title} (ID: {course.id})</li>
              ))}
            </ul>
            <p>Total: {debugInfo.allCourses.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}