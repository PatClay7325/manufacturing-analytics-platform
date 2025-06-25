'use client';

import React from 'react';

import { Fullscreen } from 'lucide-react';

export default function FullscreenButton() {
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <button
      onClick={handleFullscreen}
      className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      aria-label="Toggle fullscreen"
    >
      <Fullscreen className="h-5 w-5" />
    </button>
  );
}