import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  bio?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  profile_picture_url?: string;
  created_at?: string;
  updated_at?: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Try to fetch the profile
      const { data: profileData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        // Create basic profile from auth metadata
        setProfile({
          user_id: user.id,
          first_name: user.user_metadata?.first_name || user.email?.split('@')[0] || '',
          last_name: user.user_metadata?.last_name || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        });
        setLoading(false);
        return;
      }

      if (!profileData) {
        // Create profile if it doesn't exist
        const newProfile = {
          user_id: user.id,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          full_name: user.user_metadata?.full_name || '',
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
            .maybeSingle();

        if (createError || !createdProfile) {
          console.error('Error creating profile:', createError);
          // Set basic profile from user metadata if creation fails
          setProfile({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          });
        } else {
          setProfile(createdProfile || {
            user_id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          });
        }
      } else {
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      // Set basic profile from auth user as fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          user_id: user.id,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        });
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking profile existence:', checkError);
        throw checkError;
      }
      
      let data;
      
      if (existingProfile) {
        // Update existing profile
        const { data: updatedData, error } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();
          
        if (error) throw error;
        data = updatedData;
      } else {
        // Create new profile with updates
        const { data: newProfile, error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            ...updates
          })
          .select()
          .single();
          
        if (error) throw error;
        data = newProfile;
      }


      setProfile(data);
      return data;
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const uploadProfilePicture = async (file: File) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create unique filename without timestamp to avoid orphaned files
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      // Upload file to storage with upsert to replace existing file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '0', // No caching
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      console.log('Uploaded profile picture to:', publicUrl);

      // Update profile with new picture URL
      const updatedProfile = await updateProfile({
        profile_picture_url: publicUrl
      });

      return updatedProfile;
    } catch (err) {
      console.error('Profile picture upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteProfilePicture = async () => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      if (profile?.profile_picture_url) {
        // Extract the full file path from the URL
        const url = new URL(profile.profile_picture_url);
        const pathParts = url.pathname.split('/');
        // The file path is everything after '/storage/v1/object/public/profile-pictures/'
        const bucketIndex = pathParts.indexOf('profile-pictures');
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          
          // Delete from storage using the correct file path
          const { error: deleteError } = await supabase.storage
            .from('profile-pictures')
            .remove([filePath]);

          if (deleteError) {
            console.error('Error deleting file from storage:', deleteError);
            // Continue anyway to update the database record
          }
        }
      }

      // Update profile to remove picture URL
      const updatedProfile = await updateProfile({
        profile_picture_url: null
      });

      return updatedProfile;
    } catch (err) {
      console.error('Profile picture delete error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    refetchProfile: fetchProfile
  };
}