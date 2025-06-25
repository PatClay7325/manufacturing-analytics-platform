'use client';

import React from 'react';
import { PanelProps } from '@/types/dashboard';

export const StateTimelinePanel: React.FC<PanelProps> = ({ panel, data, height, width }) => {
  return (
    <div
      className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg"
      style={{ height, width }}
    >
      <div className="text-center p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">State Timeline Panel</h3>
        <p className="text-sm text-gray-500">This panel type is not yet implemented</p>
        <p className="text-xs text-gray-400 mt-2">Panel ID: {panel.id}</p>
      </div>
    </div>
  );
};

export default StateTimelinePanel;