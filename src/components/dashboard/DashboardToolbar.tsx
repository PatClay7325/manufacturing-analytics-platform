'use client';

import React, { useState } from 'react';
import {
  ArrowPathIcon,
  ClockIcon,
  ShareIcon,
  StarIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  EllipsisHorizontalIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CodeBracketIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Dashboard, TimeRange } from '@/types/dashboard';
import TimeRangePicker from './TimeRangePicker';
import RefreshPicker from './RefreshPicker';

interface DashboardToolbarProps {
  dashboard?: Dashboard;
  onSave?: () => void;
  onRefresh?: () => void;
  onTimeRangeChange?: (timeRange?: TimeRange) => void;
  isRefreshing?: boolean;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  isViewMode?: boolean;
}

export default function DashboardToolbar({
  dashboard,
  onSave,
  onRefresh,
  onTimeRangeChange,
  isRefreshing = false,
  isSaving = false,
  hasUnsavedChanges = false,
  isViewMode = false
}: DashboardToolbarProps) {
  const [isStarred, setIsStarred] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<string | null>(dashboard?.refresh || null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  const handleToggleAutoRefresh = () => {
    setIsAutoRefreshing(!isAutoRefreshing);
    // TODO: Implement auto-refresh logic
  };

  const handleRefreshIntervalChange = (interval: string | null) => {
    setAutoRefreshInterval(interval);
    // TODO: Update dashboard refresh interval
  };

  const handleExportJSON = () => {
    const dashboardJSON = JSON.stringify(dashboard, null, 2);
    const blob = new Blob([dashboardJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dashboard?.title?.toLowerCase().replace(/\s+/g, '-') || 'dashboard'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleKiosk = () => {
    setIsKioskMode(!isKioskMode);
    // TODO: Implement kiosk mode
  };

  return (
    <div className={`dashboard-toolbar bg-white border-b border-gray-200 ${isKioskMode ? 'hidden' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Back button (if in view mode) */}
          {isViewMode && (
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded hover:bg-gray-100 text-gray-600"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}

          {/* Dashboard Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">
              {dashboard?.title}
            </h1>
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-500 font-medium">
                (Unsaved changes)
              </span>
            )}
          </div>

          {/* Star button */}
          <button
            onClick={() => setIsStarred(!isStarred)}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            title={isStarred ? 'Unstar dashboard' : 'Star dashboard'}
          >
            {isStarred ? (
              <StarIconSolid className="w-5 h-5 text-yellow-500" />
            ) : (
              <StarIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Center Section - Time Controls */}
        <div className="flex items-center gap-2">
          {/* Time Range Picker */}
          <TimeRangePicker
            value={dashboard?.time}
            onChange={onTimeRangeChange}
          />

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`
              p-2 rounded hover:bg-gray-100 text-gray-600
              ${isRefreshing ? 'animate-spin' : ''}
            `}
            title="Refresh dashboard"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>

          {/* Auto Refresh */}
          <RefreshPicker
            value={autoRefreshInterval}
            onChange={handleRefreshIntervalChange}
            isActive={isAutoRefreshing}
            onToggle={handleToggleAutoRefresh}
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* TV/Kiosk Mode */}
          <button
            onClick={handleToggleKiosk}
            className="p-2 rounded hover:bg-gray-100 text-gray-600"
            title="Toggle kiosk mode"
          >
            <PlayIcon className="w-5 h-5" />
          </button>

          {/* Share */}
          <button
            className="p-2 rounded hover:bg-gray-100 text-gray-600"
            title="Share dashboard"
          >
            <ShareIcon className="w-5 h-5" />
          </button>

          {/* Settings (edit mode only) */}
          {!isViewMode && (
            <button
              className="p-2 rounded hover:bg-gray-100 text-gray-600"
              title="Dashboard settings"
            >
              <CogIcon className="w-5 h-5" />
            </button>
          )}

          {/* Save button (edit mode only) */}
          {!isViewMode && (
            <button
              onClick={onSave}
              disabled={isSaving || (!hasUnsavedChanges && !dashboard?.meta?.isNew)}
              className={`
                px-4 py-2 rounded text-sm font-medium transition-colors
                ${hasUnsavedChanges || dashboard?.meta?.isNew
                  ? 'bg-blue-600 hover:bg-blue-700 text-gray-900'
                  : 'bg-gray-100 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded hover:bg-gray-100 text-gray-600"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]">
                  <button
                    onClick={() => {
                      // TODO: Implement duplicate
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Duplicate dashboard
                  </button>
                  <button
                    onClick={() => {
                      handleExportJSON();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Show JSON modal
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                  >
                    <CodeBracketIcon className="w-4 h-4" />
                    View JSON
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={() => {
                      // TODO: Implement delete
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-red-600 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}