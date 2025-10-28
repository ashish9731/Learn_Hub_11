import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Image, X } from 'lucide-react';
import { supabaseHelpers } from '../../hooks/useSupabase';

interface LogoUploadProps {
  companyId: string;
  currentLogoUrl?: string | null;
  onUploadComplete?: (logoUrl: string) => void;
  onDelete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function LogoUpload({
  companyId,
  currentLogoUrl,
  onUploadComplete,
  onDelete,
  size = 'md'
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoName, setLogoName] = useState('');
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-24 w-24',
    md: 'h-32 w-32',
    lg: 'h-40 w-40'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error state
    setUploadError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size must be less than 2MB');
      return;
    }

    if (!logoName.trim()) {
      setUploadError('Please enter a logo name');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}_${logoName.replace(/\s+/g, '_')}.${fileExt}`;
      
      // Upload to logo-pictures bucket
      const uploadResult = await supabaseHelpers.uploadFile('logo-pictures', fileName, file);
      
      // Create logo record in database
      const logoData = await supabaseHelpers.createLogo({
        name: logoName,
        company_id: companyId,
        logo_url: uploadResult.publicUrl
      });
      
      // Call the callback with the new logo URL
      if (onUploadComplete) {
        onUploadComplete(logoData.logo_url);
      }
      
      setShowModal(false);
      setLogoName('');
      setImageError(false);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      await onDelete();
      setShowModal(false);
      setImageError(false);
    } catch (error) {
      console.error('Delete error:', error);
      setUploadError('Failed to delete logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageError = () => {
    console.error('Image failed to load:', currentLogoUrl);
    setImageError(true);
  };

  return (
    <>
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200`}>
          {currentLogoUrl && !imageError ? (
            <img
              src={`${currentLogoUrl}${currentLogoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
              alt="Company Logo"
              className="w-full h-full object-contain"
              onError={handleImageError}
            />
          ) : (
            <Image className="h-10 w-10 text-gray-400" />
          )}
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors"
          title="Change logo"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Upload Company Logo</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setUploadError(null);
                  setLogoName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Current Logo Preview */}
                {currentLogoUrl && !imageError && (
                  <div className="flex justify-center mb-4">
                    <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                      <img
                        src={`${currentLogoUrl}${currentLogoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
                        alt="Current logo"
                        className="w-full h-full object-contain"
                        onError={handleImageError}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{uploadError}</p>
                  </div>
                )}

                {/* Logo Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo Name *
                  </label>
                  <input
                    type="text"
                    value={logoName}
                    onChange={(e) => setLogoName(e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                    placeholder="Enter logo name"
                  />
                </div>

                {/* Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo Image *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only"
                            onChange={handleFileSelect}
                            accept="image/*"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                    </div>
                  </div>
                </div>

                {/* Delete Option */}
                {currentLogoUrl && onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center px-4 py-3 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Logo
                      </>
                    )}
                  </button>
                )}

                {/* Guidelines */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Image must be less than 2MB</p>
                  <p>• Supported formats: JPG, PNG, GIF</p>
                  <p>• Square images work best</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}