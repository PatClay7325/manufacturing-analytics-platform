import React, { useEffect, useRef, useState } from 'react';

interface DashboardEmbedProps {
  dashboardUrl?: string;
  height?: string | number;
  width?: string | number;
  className?: string;
  showLoadingIndicator?: boolean;
}

export const DashboardEmbed: React.FC<DashboardEmbedProps> = ({
  dashboardUrl,
  height = '600px',
  width = '100%',
  className = '',
  showLoadingIndicator = true
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Reset loading state when URL changes
    setIsLoading(true);
    
    // Set up iframe load event
    const iframe = iframeRef?.current;
    if (iframe) {
      const handleLoad = () => {
        setTimeout(() => {
          setIsLoading(false);
          
          // Try to inject styles to hide Analytics UI elements
          try {
            const iframeDoc = iframe?.contentWindow?.document;
            if (iframeDoc) {
              const style = iframeDoc?.createElement('style');
    if (style) {
      style.innerHTML = `
                .navbar,
                .sidemenu,
                .page-toolbar,
                .panel-menu,
                .panel-info-corner,
                .dashboard-settings,
                .panel-loading {
                  display: none !important;
                }
                .main-view {
                  padding: 0 !important;
                }
                .scroll-canvas {
                  padding: 0 !important;
                }
              `;
              iframeDoc?.head.appendChild(style);
            }
          } catch (e) {
            // Cross-origin restrictions may prevent this
            console.debug('Could not inject styles into Analytics iframe');
          }
        }, 500); // Small delay to ensure dashboard is rendered
      };
      
      iframe?.addEventListener('load', handleLoad);
      
      // Also set a safety timeout in case the load event doesn't fire
      const safetyTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 10000);
      
      return () => {
        iframe?.removeEventListener('load', handleLoad);
        clearTimeout(safetyTimeout);
      };
    }
  }, [dashboardUrl]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg shadow-sm ${className}`} 
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height, 
        width: typeof width === 'number' ? `${width}px` : width 
      }}
    >
      {showLoadingIndicator && isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          <div className="mt-4 text-sm font-medium text-gray-600">Loading Manufacturing Dashboard...</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={dashboardUrl}
        title="Analytics Dashboard"
        width="100%"
        height="100%"
        frameBorder="0"
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ border: 'none' }}
        allowFullScreen
      />
    </div>
  );
};

export default DashboardEmbed;