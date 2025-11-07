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

  useEffect(() => {
    // Reset player state when podcast changes
    setIsLoading(true);
  }, [podcast.id, podcast.mp3_url]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setIsLoading(false);
      console.log('Audio loaded successfully:', podcast.title);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 0;
      
      // Call the progress update callback if provided
      if (onProgressUpdate) {
        const progressPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
        onProgressUpdate(progressPercent, duration, currentTime);
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
        onError={(e) => console.error('Audio error:', e)}
        controls
        className="w-full"
        // Add attributes to prevent download
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}