import React, { useState, useEffect } from 'react';
import { Image } from 'lucide-react';
import { supabaseHelpers } from '../../hooks/useSupabase';

interface CompanyLogoProps {
  companyId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CompanyLogo({ companyId, size = 'md', className = '' }: CompanyLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };

  useEffect(() => {
    const fetchLogo = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        
        // Get logos for this company
        const logos = await supabaseHelpers.getLogos(companyId);
        
        // Use the most recent logo
        if (logos && logos.length > 0) {
          setLogoUrl(logos[0].logo_url);
        } else {
          setLogoUrl(null);
        }
      } catch (err) {
        console.error('Error fetching company logo:', err);
        setError(true);
        setLogoUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, [companyId]);

  const handleImageError = () => {
    setError(true);
    setLogoUrl(null);
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="animate-pulse bg-gray-200 h-full w-full rounded-lg"></div>
      </div>
    );
  }

  if (error || !logoUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-gray-100 flex items-center justify-center ${className}`}>
        <Image className="h-1/2 w-1/2 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden ${className}`}>
      <img
        src={logoUrl}
        alt="Company Logo"
        className="w-full h-full object-contain"
        onError={handleImageError}
      />
    </div>
  );
}