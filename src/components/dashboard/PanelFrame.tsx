'use client';

import React, { useState } from 'react';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Panel } from '@/types/dashboard';
import PanelRenderer from './PanelRenderer';

interface PanelFrameProps {
  panel?: Panel;
  isSelected?: boolean;
  isViewMode?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export default function PanelFrame({
  panel,
  isSelected = false,
  isViewMode = false,
  onClick,
  onDelete,
  onDuplicate
}: PanelFrameProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e?.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e?.stopPropagation();
    onClick();
    setShowMenu(false);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e?.stopPropagation();
    onDuplicate();
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Are you sure you want to delete this panel?')) {
      onDelete();
    }
    setShowMenu(false);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e?.stopPropagation();
    setIsFullscreen(!isFullscreen);
    setShowMenu(false);
  };

  return (
    <div
      className={`
        panel-frame h-full bg-white rounded-lg border transition-all
        ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
        ${!isViewMode ? 'hover:border-gray-300 cursor-pointer' : ''}
        ${hasError ? 'border-red-500' : ''}
        ${isFullscreen ? 'fixed inset-4 z-50' : 'relative'}
      `}
      onClick={!isViewMode ? onClick : undefined}
    >
      {/* Panel Header */}
      <div className="panel-header flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ChartBarIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {panel?.title || 'Untitled Panel'}
          </h3>
        </div>

        {!isViewMode && (
          <div className="relative flex items-center gap-1">
            <button
              onClick={handleFullscreen}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              title="Toggle fullscreen"
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleMenuClick}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
            >
              <EllipsisVerticalIcon className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e?.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Duplicate
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-red-600 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Panel Content */}
      <div className="panel-content h-[calc(100%-48px)] p-3">
        <PanelRenderer
          panel={panel}
          height="100%"
          onError={() => setHasError(true)}
        />
      </div>

      {/* Loading/Error States */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to render panel</p>
            <button
              onClick={(e) => {
                e?.stopPropagation();
                setHasError(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}