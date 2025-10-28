import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';

interface PodcastPlayerProps {
  podcast: {
    id: string;
    title: string; 
    mp3_url: string;
  };
  userId?: string | null;
  onProgressUpdate?: (progress: number, duration: number, currentTime: number) => void;
}

export default function PodcastPlayer({ 
  podcast, 
  userId,
  onProgressUpdate
}: PodcastPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressSaveInterval = useRef<any>(null);
  const [progressSaved, setProgressSaved] = useState(false);

  useEffect(() => {
    // Reset player state when podcast changes
    setIsLoading(true);

    // Load saved progress if available
    if (userId) {
      loadSavedProgress();
    }
    
    // Set up interval to save progress periodically
    if (userId) {
      progressSaveInterval.current = setInterval(() => {
        if (audioRef.current && audioRef.current.currentTime > 0 && !progressSaved) {
          saveProgress();
        }
      }, 10000); // Save every 10 seconds while playing
    }
    
    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      
      // Save progress when component unmounts
      if (userId && audioRef.current && audioRef.current.currentTime > 0.5 && !progressSaved) {
        await saveProgress();
      }
    };
  }, [podcast.id, podcast.mp3_url, userId]);

  const loadSavedProgress = async () => {
    if (!userId || !podcast.id) return;
    
    try {
      const { data, error } = await supabase
        .from('podcast_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('podcast_id', podcast.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading podcast progress:', error);
        return;
      }
      
      if (data) {
        // Only set if audio is loaded and has duration
        if (audioRef.current) {
          audioRef.current.currentTime = data.playback_position || 0;
        }
      }
    } catch (error) {
      console.error('Error loading podcast progress:', error);
    }
  };
  
  const saveProgress = async (): Promise<void> => {
    if (!userId || !podcast.id || !audioRef.current) return;
    
    // Don't save if we haven't played enough (at least 1 second)
    if (audioRef.current.currentTime < 1) return;
    
    try {
      const playbackPosition = audioRef.current.currentTime || 0;
      const duration = audioRef.current.duration || 0;
      
      // Don't save if duration is invalid
      if (duration <= 0) return;
      
      const progressPercent = Math.min(100, Math.round((playbackPosition / duration) * 100));
      
      try {
        // Use the helper function with retry logic
        await supabaseHelpers.savePodcastProgressWithRetry(
          userId,
          podcast.id,
          playbackPosition,
          duration,
          progressPercent
        );
      } catch (rpcError) {
        console.error('Exception in RPC call:', rpcError);
      }

      setProgressSaved(true);
      
      // Call the progress update callback if provided
      if (onProgressUpdate) {
        onProgressUpdate(progressPercent, duration, playbackPosition);
      }
    } catch (error) {
      console.error('Error saving podcast progress:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      // Reset progressSaved flag when time changes significantly
      setProgressSaved(false);
      
      // Call the progress update callback if provided
      if (onProgressUpdate) {
        onProgressUpdate(
          Math.round((audioRef.current.currentTime / audioRef.current.duration) * 100), 
          audioRef.current.duration, 
          audioRef.current.currentTime
        );
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setIsLoading(false);
      console.log('Audio loaded successfully:', podcast.title);
      
      // Load saved progress after audio is loaded
      if (userId) {
        loadSavedProgress();
      }
    }
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <audio
        preload="auto"
        controlsList="nodownload noplaybackrate"
        ref={audioRef}
        src={podcast.mp3_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => saveProgress()}
        onError={(e) => console.error('Audio error:', e)}
        controls
        className="w-full"
      />
    </div>
  );
}