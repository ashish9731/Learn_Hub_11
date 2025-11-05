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
  const lastSaveTime = useRef<number>(0);
  const [lastValidTime, setLastValidTime] = useState<number>(0);
  const [maxAllowedTime, setMaxAllowedTime] = useState<number>(0); // Track maximum allowed time
  const [hasPlayed, setHasPlayed] = useState(false); // Track if user has actually played the audio
  const [playbackStarted, setPlaybackStarted] = useState(false); // Track if playback has actually started

  useEffect(() => {
    // Reset player state when podcast changes
    setIsLoading(true);
    setLastValidTime(0);
    setMaxAllowedTime(0);
    setHasPlayed(false);
    setPlaybackStarted(false);

    // Load saved progress if available
    if (userId) {
      loadSavedProgress();
    }
    
    // Set up interval to save progress every 40 seconds
    if (userId) {
      progressSaveInterval.current = setInterval(() => {
        if (audioRef.current && audioRef.current.currentTime > 0 && !progressSaved && hasPlayed) {
          const currentTime = Date.now();
          // Save progress every 40 seconds as per requirement
          if (currentTime - lastSaveTime.current > 40000) {
            saveProgress();
            lastSaveTime.current = currentTime;
          }
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      
      // Save progress when component unmounts
      if (userId && audioRef.current && audioRef.current.currentTime > 0.5 && !progressSaved && hasPlayed) {
        saveProgress();
      }
    };
  }, [podcast.id, podcast.mp3_url, userId, hasPlayed]);

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
      
      if (data && audioRef.current) {
        // Only set if audio is loaded and has duration
        const savedTime = data.playback_position || 0;
        audioRef.current.currentTime = savedTime;
        setLastValidTime(savedTime);
        setMaxAllowedTime(savedTime); // User can only go forward from saved position
      }
    } catch (error) {
      console.error('Error loading podcast progress:', error);
    }
  };
  
  const saveProgress = async (): Promise<void> => {
    if (!userId || !podcast.id || !audioRef.current || !hasPlayed) return;
    
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
        
        // Dispatch a custom event to trigger real-time updates
        const event = new CustomEvent('supabase-podcast-progress-changed', {
          detail: { userId, podcastId: podcast.id, progressPercent }
        });
        window.dispatchEvent(event);
      } catch (rpcError) {
        console.error('Exception in RPC call:', rpcError);
      }

      setProgressSaved(true);
      
      // Update max allowed time
      setMaxAllowedTime(playbackPosition);
      
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
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 0;
      
      // Allow full skipping - user can jump to any position
      // Remove all time restrictions to ensure full playback
      setLastValidTime(currentTime);
      setMaxAllowedTime(duration || currentTime); // Allow full duration
      
      // Reset progressSaved flag when time changes significantly
      setProgressSaved(false);
      
      // Call the progress update callback if provided
      if (onProgressUpdate) {
        const progressPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
        onProgressUpdate(progressPercent, duration, currentTime);
      }
      
      // Save progress periodically and dispatch real-time event
      const currentTimeMs = Date.now();
      if (currentTimeMs - lastSaveTime.current > 30000 && hasPlayed) { // Save every 30 seconds
        saveProgress();
        lastSaveTime.current = currentTimeMs;
      }
    }
  };

  const handleSeeking = () => {
    // Allow seeking - user can jump to any position in the audio
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      
      // Remove all time restrictions to ensure full playback
      setLastValidTime(currentTime);
      setMaxAllowedTime(audioRef.current.duration || currentTime); // Allow full duration
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

  const handlePlay = () => {
    // Mark that the user has actually played the audio
    setHasPlayed(true);
    setPlaybackStarted(true);
  };

  const handleEnded = () => {
    // When audio ends, mark as 100% complete
    if (userId && audioRef.current && hasPlayed) {
      saveProgress();
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
        onSeeking={handleSeeking}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onEnded={handleEnded}
        onError={(e) => console.error('Audio error:', e)}
        controls
        className="w-full"
        // Add attributes to prevent download
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}