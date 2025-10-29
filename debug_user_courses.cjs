// Load environment variables
const fs = require('fs');
const path = require('path');

// Simple .env parser
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

// Get Supabase config from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugUserCourses() {
  try {
    console.log('🔍 Debugging user course assignments...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.log('⚠️ No user authenticated');
      return;
    }
    
    console.log('👤 Current user ID:', user.id);
    
    // Check all user courses for this user
    console.log('📚 Checking user_courses table...');
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
      console.error('❌ Error fetching user_courses:', userCoursesError);
    } else {
      console.log('✅ Found', userCourses?.length || 0, 'course assignments:');
      if (userCourses && userCourses.length > 0) {
        userCourses.forEach((uc, index) => {
          console.log(`  ${index + 1}. Course ID: ${uc.course_id}, Title: ${uc.courses?.title || 'Unknown'}`);
        });
      } else {
        console.log('  No course assignments found for this user');
      }
    }
    
    // Also check all courses to see what's available
    console.log('📖 Checking all courses...');
    const { data: allCourses, error: coursesError } = await supabase
      .from('courses')
      .select('*');
    
    if (coursesError) {
      console.error('❌ Error fetching courses:', coursesError);
    } else {
      console.log('✅ Found', allCourses?.length || 0, 'total courses:');
      if (allCourses && allCourses.length > 0) {
        allCourses.forEach((course, index) => {
          console.log(`  ${index + 1}. ID: ${course.id}, Title: ${course.title}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugUserCourses();