import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title: string;
}

export default function PDFViewer({ url, title }: PDFViewerProps) {
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
    
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);
  
  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold truncate">{title || 'Document Viewer'}</h1>
        <button 
          onClick={() => window.close()}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="w-full h-full border-0"
          title={title}
          // Prevent download and right-click
          onContextMenu={(e) => e.preventDefault()}
          // Additional security measures
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      
      {/* Footer with instructions */}
      <div className="bg-gray-800 text-gray-300 text-xs p-2 text-center">
        Document is view-only. Right-click and download options are disabled.
      </div>
    </div>
  );
}