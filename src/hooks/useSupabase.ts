import React from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';

// Custom hook for real-time data syncing
export const useRealtimeSync = (tableName: string, callback: () => void) => {
  React.useEffect(() => {
    // Map table names to event names to match what's dispatched in App.tsx
    const eventMap: Record<string, string> = {
      'companies': 'supabase-companies-changed',
      'users': 'supabase-users-changed',
      'courses': 'supabase-courses-changed',
      'user-courses': 'supabase-user-courses-changed',
      'podcasts': 'supabase-podcasts-changed',
      'podcast-progress': 'supabase-podcast-progress-changed',
      'podcast-assignments': 'supabase-podcast-assignments-changed',
      'user-profiles': 'supabase-user-profiles-changed',
      'content-categories': 'supabase-content-categories-changed',
      'pdfs': 'supabase-pdfs-changed',
      'podcast-likes': 'supabase-podcast-likes-changed',
      'logos': 'supabase-logos-changed',
      'activity-logs': 'supabase-activity-logs-changed',
      'chat-history': 'supabase-chat-history-changed',
      'temp-passwords': 'supabase-temp-passwords-changed',
      'user-registrations': 'supabase-user-registrations-changed',
      'approval-logs': 'supabase-approval-logs-changed',
      'audit-logs': 'supabase-audit-logs-changed',
      'contact-messages': 'supabase-contact-messages-changed'
    };
    
    const eventName = eventMap[tableName] || `supabase-${tableName.replace('_', '-')}-changed`;
    
    const handleChange = (event: CustomEvent) => {
      console.log(`🔄 Handling ${tableName} change:`, event.detail);
      callback();
    };
    
    window.addEventListener(eventName, handleChange as EventListener);
    
    return () => {
      window.removeEventListener(eventName, handleChange as EventListener);
    };
  }, [tableName, callback]);
};

// Helper functions for Supabase operations
export const supabaseHelpers = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // User operations
  getUsers: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    console.log('Fetching users with RLS policies');
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        user_profiles (
          full_name,
          phone,
          department
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    console.log('Users fetched successfully:', data);
    return data || [];
  },

  getUsersByCompany: async (companyId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  createUser: async (userData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateUser: async (userId: string, updates: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteUser: async (userId: string) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      // Delete all activity logs for this user
      await supabaseAdmin
        .from('activity_logs')
        .delete()
        .eq('user_id', userId);

      // Delete all podcast likes for this user
      await supabaseAdmin
        .from('podcast_likes')
        .delete()
        .eq('user_id', userId);

      // Delete user profile for this user
      await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      // Delete chat history for this user
      await supabaseAdmin
        .from('chat_history')
        .delete()
        .eq('user_id', userId);

      // Delete podcast progress for this user
      await supabaseAdmin
        .from('podcast_progress')
        .delete()
        .eq('user_id', userId);

      // Delete podcast assignments for this user
      await supabaseAdmin
        .from('podcast_assignments')
        .delete()
        .eq('user_id', userId);

      // Delete user course assignments for this user
      await supabaseAdmin
        .from('user_courses')
        .delete()
        .eq('user_id', userId);

      // Delete temp passwords for this user
      await supabaseAdmin
        .from('temp_passwords')
        .delete()
        .eq('user_id', userId);

      // Finally delete the user itself
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user and dependent records:', error);
      throw error;
    }
  },

  // Company operations
  getCompanies: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    console.log('Fetching companies with RLS policies');
    try {
      // First, get companies
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from('companies')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      
      if (companiesError) {
        console.error('Error fetching companies:', companiesError);
        throw companiesError;
      }
      
      // Then, get user counts for each company separately to avoid RLS issues
      const companiesWithUserCounts = await Promise.all(
        (companies || []).map(async (company) => {
          try {
            if (!supabaseAdmin) {
              throw new Error('Admin client not available');
            }
            
            const { count, error: countError } = await supabaseAdmin
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id);
            
            if (countError) {
              console.warn(`Error fetching user count for company ${company.id}:`, countError);
              return { ...company, users: { count: 0 } };
            }
            
            return { ...company, users: { count: count || 0 } };
          } catch (countError) {
            console.warn(`Error fetching user count for company ${company.id}:`, countError);
            return { ...company, users: { count: 0 } };
          }
        })
      );
      
      console.log('Companies with user counts fetched successfully:', companiesWithUserCounts);
      return companiesWithUserCounts;
    } catch (error) {
      console.error('Error in getCompanies:', error);
      throw error;
    }
  },

  createCompany: async (companyData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert(companyData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateCompany: async (companyId: string, updates: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteCompany: async (companyId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      // First, get all users in this company
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('company_id', companyId);

      if (usersError) throw usersError;

      const userIds = users?.map(user => user.id) || [];

      if (userIds.length > 0) {
        // Delete all activity logs for users in this company
        await supabaseAdmin
          .from('activity_logs')
          .delete()
          .in('user_id', userIds);

        // Delete all podcast likes for users in this company
        await supabaseAdmin
          .from('podcast_likes')
          .delete()
          .in('user_id', userIds);

        // Delete all user profiles for users in this company
        await supabaseAdmin
          .from('user_profiles')
          .delete()
          .in('user_id', userIds);

        // Delete all chat history for users in this company
        await supabaseAdmin
          .from('chat_history')
          .delete()
          .in('user_id', userIds);

        // Delete all podcast progress for users in this company
        await supabaseAdmin
          .from('podcast_progress')
          .delete()
          .in('user_id', userIds);

        // Delete all podcast assignments for users in this company
        await supabaseAdmin
          .from('podcast_assignments')
          .delete()
          .in('user_id', userIds);

        // Delete all user course assignments for users in this company
        await supabaseAdmin
          .from('user_courses')
          .delete()
          .in('user_id', userIds);
      }

      // Delete all users in this company
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('company_id', companyId);

      // Delete all courses for this company
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('company_id', companyId);

      if (courses && courses.length > 0) {
        const courseIds = courses.map(course => course.id);

        // Delete all podcasts for these courses
        await supabaseAdmin
          .from('podcasts')
          .delete()
          .in('course_id', courseIds);

        // Delete all PDFs for these courses
        await supabaseAdmin
          .from('pdfs')
          .delete()
          .in('course_id', courseIds);

        // Delete all user course assignments for these courses
        await supabaseAdmin
          .from('user_courses')
          .delete()
          .in('course_id', courseIds);

        // Delete all courses
        await supabaseAdmin
          .from('courses')
          .delete()
          .eq('company_id', companyId);
      }

      // Delete company logos
      await supabaseAdmin
        .from('logos')
        .delete()
        .eq('company_id', companyId);

      // Finally delete the company itself
      const { error } = await supabaseAdmin
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting company and dependent records:', error);
      throw error;
    }
  },

  // Course operations
  getCourses: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    console.log('Fetching courses with RLS policies');
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        companies (name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
    console.log('Courses fetched successfully:', data);
    return data || [];
  },

  createCourse: async (courseData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert(courseData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateCourse: async (courseId: string, updates: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteCourse: async (courseId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', courseId);
    
    if (error) throw error;
  },

  // Podcast operations
  getPodcasts: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    console.log('Fetching podcasts with RLS policies');
    const { data, error } = await supabaseAdmin
      .from('podcasts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching podcasts:', error);
      throw error;
    }
    console.log('Podcasts fetched successfully:', data);
    return data || [];
  },

  createPodcast: async (podcastData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('podcasts')
      .insert(podcastData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deletePodcast: async (podcastId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { error } = await supabaseAdmin
      .from('podcasts')
      .delete()
      .eq('id', podcastId);
    
    if (error) throw error;
  },

  // PDF operations
  getPDFs: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    console.log('Fetching PDFs with RLS policies');
    const { data, error } = await supabaseAdmin
      .from('pdfs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching PDFs:', error);
      throw error;
    }
    console.log('PDFs fetched successfully:', data);
    return data || [];
  },

  createPDF: async (pdfData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('pdfs')
      .insert(pdfData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deletePDF: async (pdfId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { error } = await supabaseAdmin
      .from('pdfs')
      .delete()
      .eq('id', pdfId);
    
    if (error) throw error;
  },


  // Content category operations
  getContentCategories: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('content_categories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getCategories: async () => {
    return supabaseHelpers.getContentCategories();
  },

  createContentCategory: async (categoryData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('content_categories')
      .insert(categoryData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // User profile operations
  getAllUserProfiles: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getUserProfile: async (userId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  createUserProfile: async (profileData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateUserProfile: async (userId: string, updates: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // User course operations
  getAllUserCourses: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    console.log('Fetching user courses with RLS policies');
    const { data, error } = await supabaseAdmin
      .from('user_courses')
      .select('*')
      .order('assigned_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user courses:', error);
      throw error;
    }
    console.log('User courses fetched successfully:', data);
    return data || [];
  },

  // Podcast assignment operations
  getAllPodcastAssignments: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('podcast_assignments')
      .select('*')
      .order('assigned_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  createPodcastAssignment: async (assignmentData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('podcast_assignments')
      .insert(assignmentData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getUserCourses: async (userId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_courses')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          company_id,
          image_url,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Podcast progress operations
  getAllPodcastProgress: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('podcast_progress')
      .select('*')
      .order('last_played_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  savePodcastProgress: async (userId: string, podcastId: string, currentTime: number, duration: number) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const progressPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
    
    const { error } = await supabaseAdmin
      .from('podcast_progress')
      .upsert({
        user_id: userId,
        podcast_id: podcastId,
        playback_position: currentTime,
        duration: duration,
        progress_percent: progressPercent,
        last_played_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,podcast_id'
      });
    
    if (error) throw error;
  },

  savePodcastProgressWithRetry: async (userId: string, podcastId: string, currentTime: number, duration: number, progressPercent: number, maxRetries = 3) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { error } = await supabaseAdmin
          .from('podcast_progress')
          .upsert({
            user_id: userId,
            podcast_id: podcastId,
            playback_position: currentTime,
            duration: duration,
            progress_percent: progressPercent,
            last_played_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,podcast_id'
          });
        
        if (error) throw error;
        return; // Success, exit retry loop
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  },

  calculateUserLearningMetrics: async (userId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_current_user_metrics');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const metrics = data[0];
        return {
          totalHours: parseFloat(metrics.total_hours) || 0,
          completedCourses: parseInt(metrics.completed_courses) || 0,
          inProgressCourses: parseInt(metrics.in_progress_courses) || 0,
          averageCompletion: parseFloat(metrics.average_completion) || 0
        };
      }
      
      return {
        totalHours: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageCompletion: 0
      };
    } catch (error) {
      console.error('Error calculating user metrics:', error);
      return {
        totalHours: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageCompletion: 0
      };
    }
  },

  // Logo operations
  getLogos: async (companyId?: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    let query = supabaseAdmin
      .from('logos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  createLogo: async (logoData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('logos')
      .insert(logoData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteLogo: async (logoId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { error } = await supabaseAdmin
      .from('logos')
      .delete()
      .eq('id', logoId);
    
    if (error) throw error;
  },

  // File upload operations
  uploadFile: async (bucket: string, fileName: string, file: File) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    console.log(`Uploading file to bucket: ${bucket}, fileName: ${fileName}`);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log(`File uploaded successfully. Public URL: ${publicUrl}`);
    return { data, publicUrl };
  },

  // Temporary passwords operations
  getTempPasswords: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('temp_passwords')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  createTempPassword: async (tempPasswordData: any) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('temp_passwords')
      .insert(tempPasswordData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  markTempPasswordAsUsed: async (tempPasswordId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('temp_passwords')
      .update({ is_used: true })
      .eq('id', tempPasswordId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteTempPassword: async (tempPasswordId: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { error } = await supabaseAdmin
      .from('temp_passwords')
      .delete()
      .eq('id', tempPasswordId);
    
    if (error) throw error;
  },

  // User registration operations
  getUserRegistrations: async () => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  approveUserRegistration: async (registrationId: string, action: string, companyId?: string, notes?: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin.rpc('approve_user_registration', {
      registration_id_param: registrationId,
      action_param: action,
      company_id_param: companyId,
      notes_param: notes
    });
    
    if (error) throw error;
    return data;
  },

  rejectUserRegistration: async (registrationId: string, notes?: string) => {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    const { data, error } = await supabaseAdmin.rpc('reject_user_registration', {
      registration_id_param: registrationId,
      notes_param: notes
    });
    
    if (error) throw error;
    return data;
  }
};