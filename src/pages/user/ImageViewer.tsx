import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
  url: string;
  title: string;
}

export default function ImageViewer({ url, title }: ImageViewerProps) {
  useEffect(() => {
    // Prevent right-click and download
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };
    
    // Prevent keyboard shortcuts
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevent Ctrl+S, Ctrl+P, Ctrl+O, etc.
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === 's' || e.key === 'p' || e.key === 'o' || e.key === 'u')) {
        e.preventDefault();
      }
    };
    
    // Prevent drag and drop
    const preventDragStart = (e: Event) => {
      e.preventDefault();
    };
    
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    document.addEventListener('dragstart', preventDragStart);
    
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
      document.removeEventListener('dragstart', preventDragStart);
    };
  }, []);
  
  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold truncate">{title || 'Image Viewer'}</h1>
        <button 
          onClick={() => window.close()}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Image Viewer */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        <img
          src={url}
          alt={title}
          className="max-w-full max-h-full object-contain"
          // Prevent download and right-click
          onContextMenu={(e) => e.preventDefault()}
          // Prevent drag and drop
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
      
      {/* Footer with instructions */}
      <div className="bg-gray-800 text-gray-300 text-xs p-2 text-center">
        Image is view-only. Right-click, drag-and-drop, and download options are disabled.
      </div>
    </div>
  );
}