'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from './usePOCData';

export interface LiveProjectData {
  metrics: {
    totalFiles: number;
    totalLines: number;
    todoCount: number;
    testCoverage: number;
    buildStatus: 'passing' | 'failing' | 'unknown';
    typeErrors: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    criticalTasks: number;
    overallProgress: number;
  };
  tasks: Task[];
  recentActivity: {
    commits: any[];
    lastScan: Date;
  };
  issues: any[];
  recommendations: string[];
  isLoading: boolean;
  isLive: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useLiveProjectData(refreshInterval: number = 60000) {
  const [data, setData] = useState<LiveProjectData>({
    metrics: {
      totalFiles: 0,
      totalLines: 0,
      todoCount: 0,
      testCoverage: 0,
      buildStatus: 'unknown',
      typeErrors: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      criticalTasks: 0,
      overallProgress: 0
    },
    tasks: [],
    recentActivity: {
      commits: [],
      lastScan: new Date()
    },
    issues: [],
    recommendations: [],
    isLoading: true,
    isLive: false,
    lastUpdated: null,
    error: null
  });

  const fetchProjectState = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/project-state');
      if (!response.ok) {
        throw new Error(`Failed to fetch project state: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData({
          metrics: result.data.metrics,
          tasks: result.data.tasks,
          recentActivity: result.data.recentActivity,
          issues: result.data.issues,
          recommendations: result.data.recommendations,
          isLoading: false,
          isLive: true,
          lastUpdated: new Date(),
          error: null
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching project state:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        isLive: false,
        error: error instanceof Error ? error.message : 'Failed to fetch project state'
      }));
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    try {
      const response = await fetch('/api/project-state', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to trigger refresh');
      }
      
      // Wait a moment for scan to complete
      setTimeout(() => {
        fetchProjectState();
      }, 2000);
    } catch (error) {
      console.error('Error forcing refresh:', error);
    }
  }, [fetchProjectState]);

  // Initial fetch
  useEffect(() => {
    fetchProjectState();
  }, [fetchProjectState]);

  // Set up auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProjectState();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchProjectState, refreshInterval]);

  // Set up WebSocket for real-time updates (future enhancement)
  useEffect(() => {
    // TODO: Implement WebSocket connection for real-time updates
    // const ws = new WebSocket('ws://localhost:3000/api/project-state/ws');
    // ws.onmessage = (event) => {
    //   const update = JSON.parse(event.data);
    //   // Handle real-time updates
    // };
  }, []);

  return {
    ...data,
    forceRefresh,
    isStale: data.lastUpdated ? Date.now() - data.lastUpdated.getTime() > refreshInterval : true
  };
}