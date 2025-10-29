import { createClient } from '@supabase/supabase-js'

// Validate and get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `Missing Supabase environment variables. Please:
1. Check your .env file in your project root
2. Add your Supabase URL and anon key (see .env.example)
3. Get these values from your Supabase project dashboard

Missing variables:
- VITE_SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Set' : 'Missing'}`;
  
  console.error(errorMessage);
  throw new Error(errorMessage);
}

try {
  new URL(supabaseUrl);
} catch (error) {
  const errorMessage = `Invalid VITE_SUPABASE_URL format: "${supabaseUrl}". Please check your .env file and ensure the URL is valid.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Create admin client with service role key for admin operations
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim();

export const supabaseAdmin = supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
}) : null;

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test with a simple database query
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (error) {
      console.warn('Database query failed, trying auth check:', error.message);
      
      // Fallback to auth check
      const { error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth check also failed:', authError.message);
        return false;
      }
      return true;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error, 'URL:', supabaseUrl);
    return false;
  }
};

// Database types based on the updated SQL schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'super_admin' | 'admin' | 'user'
          company_id: string | null
          profile_picture_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: 'super_admin' | 'admin' | 'user'
          company_id?: string | null
          profile_picture_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'super_admin' | 'admin' | 'user'
          company_id?: string | null
          profile_picture_url?: string | null
          created_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          company_id: string | null
          image_url: string | null
          created_at: string
          level: string | null
        }
        Insert: {
          id?: string
          title: string
          company_id?: string | null
          image_url?: string | null
          created_at?: string
          level?: string | null
        }
        Update: {
          id?: string
          title?: string
          company_id?: string | null
          image_url?: string | null
          created_at?: string
          level?: string | null
        }
      }
      user_courses: {
        Row: {
          user_id: string
          course_id: string
          assigned_by: string | null
          assigned_at: string
          due_date: string | null
        }
        Insert: {
          user_id: string
          course_id: string
          assigned_by?: string | null
          assigned_at?: string
          due_date?: string | null
        }
        Update: {
          user_id?: string
          course_id?: string
          assigned_by?: string | null
          assigned_at?: string
          due_date?: string | null
        }
      }
      podcasts: {
        Row: {
          id: string
          title: string
          course_id: string
          category: 'Books' | 'HBR' | 'TED Talks' | 'Concept' | 'Role Play' | null
          category_id: string | null
          mp3_url: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          course_id: string
          category?: 'Books' | 'HBR' | 'TED Talks' | 'Concept' | 'Role Play' | null
          category_id?: string | null
          mp3_url: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          course_id?: string
          category?: 'Books' | 'HBR' | 'TED Talks' | 'Concept' | 'Role Play' | null
          category_id?: string | null
          mp3_url?: string
          created_at?: string
          created_by?: string | null
        }
      }
      pdfs: {
        Row: {
          id: string
          title: string
          course_id: string
          pdf_url: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          course_id: string
          pdf_url: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          course_id?: string
          pdf_url?: string
          created_at?: string
          created_by?: string | null
        }
      }
      chat_history: {
        Row: {
          id: string
          user_id: string
          message: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: any
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: any | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          phone: string | null
          bio: string | null
          department: string | null
          position: string | null
          employee_id: string | null
          profile_picture_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          phone?: string | null
          bio?: string | null
          department?: string | null
          position?: string | null
          employee_id?: string | null
          profile_picture_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          phone?: string | null
          bio?: string | null
          department?: string | null
          position?: string | null
          employee_id?: string | null
          profile_picture_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}