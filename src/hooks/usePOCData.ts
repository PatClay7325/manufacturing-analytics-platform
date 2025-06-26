'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Task {
  id: string;
  name: string;
  category: 'Core Platform' | 'Manufacturing Intelligence' | 'AI & Analytics' | 'Integrations' | 'UI/UX';
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'at-risk';
  progress: number;
  startDate: string;
  endDate: string;
  assignee: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  blockers: string[];
  estimatedHours: number;
  actualHours: number;
  criticalPath: boolean;
  description?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
  status: 'upcoming' | 'on-track' | 'at-risk' | 'completed';
  progress: number;
  tasks?: string[]; // Task IDs associated with this milestone
}

export interface POCMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overallProgress: number;
  daysRemaining: number;
  criticalPathBlocked: boolean;
  atRiskTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  estimatedCompletion: string;
}

const STORAGE_KEY = 'poc-management-data';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Default data
const getDefaultTasks = (): Task[] => [
  {
    id: '1',
    name: 'ERP Integration Framework',
    category: 'Integrations',
    status: 'not-started',
    progress: 0,
    startDate: '2025-06-25',
    endDate: '2025-07-08',
    assignee: 'Developer',
    priority: 'critical',
    dependencies: [],
    blockers: ['Need SAP payload structure'],
    estimatedHours: 40,
    actualHours: 0,
    criticalPath: true,
    description: 'Build comprehensive ERP integration framework supporting SAP Business One',
    tags: ['integration', 'sap', 'erp'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Drill-down Navigation',
    category: 'UI/UX',
    status: 'in-progress',
    progress: 25,
    startDate: '2025-06-25',
    endDate: '2025-07-01',
    assignee: 'Developer',
    priority: 'critical',
    dependencies: [],
    blockers: [],
    estimatedHours: 24,
    actualHours: 6,
    criticalPath: true,
    description: 'Implement hierarchical drill-down navigation for manufacturing data',
    tags: ['ui', 'navigation', 'dashboard'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Demo Dataset Creation',
    category: 'Core Platform',
    status: 'not-started',
    progress: 0,
    startDate: '2025-07-02',
    endDate: '2025-07-15',
    assignee: 'Developer',
    priority: 'high',
    dependencies: ['1'],
    blockers: [],
    estimatedHours: 32,
    actualHours: 0,
    criticalPath: true,
    description: 'Create comprehensive 30-day manufacturing demo dataset',
    tags: ['data', 'demo', 'manufacturing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Chat Performance Optimization',
    category: 'AI & Analytics',
    status: 'completed',
    progress: 100,
    startDate: '2025-06-20',
    endDate: '2025-06-24',
    assignee: 'Developer',
    priority: 'high',
    dependencies: [],
    blockers: [],
    estimatedHours: 16,
    actualHours: 18,
    criticalPath: false,
    description: 'Optimize manufacturing chat response time from 18s to <100ms',
    tags: ['performance', 'chat', 'optimization'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'OEE Trend Visualization',
    category: 'Manufacturing Intelligence',
    status: 'at-risk',
    progress: 40,
    startDate: '2025-06-20',
    endDate: '2025-07-05',
    assignee: 'Developer',
    priority: 'medium',
    dependencies: [],
    blockers: ['Data format inconsistencies'],
    estimatedHours: 20,
    actualHours: 8,
    criticalPath: false,
    description: 'Create interactive OEE trend charts with drill-down capabilities',
    tags: ['oee', 'charts', 'manufacturing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const getDefaultMilestones = (): Milestone[] => [
  {
    id: '1',
    name: 'UI Polish & Agent Enhancement',
    date: '2025-07-01',
    status: 'on-track',
    progress: 35,
    tasks: ['2', '4']
  },
  {
    id: '2',
    name: 'Integration Foundation',
    date: '2025-07-08',
    status: 'at-risk',
    progress: 5,
    tasks: ['1']
  },
  {
    id: '3',
    name: 'Demo Data & Scenarios',
    date: '2025-07-15',
    status: 'upcoming',
    progress: 0,
    tasks: ['3']
  },
  {
    id: '4',
    name: 'Testing & Polish',
    date: '2025-07-22',
    status: 'upcoming',
    progress: 0,
    tasks: []
  },
  {
    id: '5',
    name: 'POC Complete',
    date: '2025-08-25',
    status: 'upcoming',
    progress: 0,
    tasks: []
  }
];

export const usePOCData = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Load data from localStorage
  const loadData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setTasks(parsed.tasks || getDefaultTasks());
        setMilestones(parsed.milestones || getDefaultMilestones());
        setLastSaved(parsed.lastSaved ? new Date(parsed.lastSaved) : new Date());
      } else {
        setTasks(getDefaultTasks());
        setMilestones(getDefaultMilestones());
      }
    } catch (error) {
      console.error('Error loading POC data from localStorage:', error);
      setTasks(getDefaultTasks());
      setMilestones(getDefaultMilestones());
    }
  }, []);

  // Save data to localStorage
  const saveData = useCallback((tasksToSave?: Task[], milestonesToSave?: Milestone[]) => {
    try {
      const dataToSave = {
        tasks: tasksToSave || tasks,
        milestones: milestonesToSave || milestones,
        lastSaved: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving POC data to localStorage:', error);
    }
  }, [tasks, milestones]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const interval = setInterval(() => {
      saveData();
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [saveData, autoSaveEnabled]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate metrics
  const metrics = useCallback((): POCMetrics => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const atRiskTasks = tasks.filter(t => t.status === 'at-risk').length;
    
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const pocStartDate = new Date('2025-06-25');
    const pocEndDate = new Date('2025-08-25');
    const today = new Date();
    const daysRemaining = Math.max(0, Math.ceil((pocEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    const criticalPathBlocked = tasks.some(t => t.criticalPath && (t.status === 'blocked' || t.blockers.length > 0));
    
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + t.actualHours, 0);
    
    // Estimate completion based on progress and remaining work
    const remainingHours = tasks.reduce((sum, t) => {
      const progressRatio = t.progress / 100;
      const remainingWork = t.estimatedHours * (1 - progressRatio);
      return sum + remainingWork;
    }, 0);
    
    const avgDailyHours = 8; // Assume 8 hours/day
    const estimatedDaysToComplete = Math.ceil(remainingHours / avgDailyHours);
    
    // Safely calculate estimated completion date
    let estimatedCompletion: string;
    try {
      const estimatedDate = new Date(today.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000);
      // Check if date is valid
      if (isNaN(estimatedDate.getTime()) || estimatedDaysToComplete === 0 || remainingHours === 0) {
        estimatedCompletion = pocEndDate.toISOString().split('T')[0];
      } else {
        estimatedCompletion = estimatedDate.toISOString().split('T')[0];
      }
    } catch (error) {
      // Fallback to POC end date if calculation fails
      estimatedCompletion = pocEndDate.toISOString().split('T')[0];
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      overallProgress,
      daysRemaining,
      criticalPathBlocked,
      atRiskTasks,
      totalEstimatedHours,
      totalActualHours,
      estimatedCompletion
    };
  }, [tasks]);

  // Task management functions
  const addTask = useCallback((newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const task: Task = {
      ...newTask,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    saveData(updatedTasks, milestones);
    return task;
  }, [tasks, milestones, saveData]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    );
    setTasks(updatedTasks);
    saveData(updatedTasks, milestones);
  }, [tasks, milestones, saveData]);

  const deleteTask = useCallback((taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    // Also remove this task from dependencies of other tasks
    const cleanedTasks = updatedTasks.map(task => ({
      ...task,
      dependencies: task.dependencies.filter(dep => dep !== taskId)
    }));
    setTasks(cleanedTasks);
    saveData(cleanedTasks, milestones);
  }, [tasks, milestones, saveData]);

  const updateTaskStatus = useCallback((taskId: string, status: Task['status']) => {
    updateTask(taskId, { 
      status,
      progress: status === 'completed' ? 100 : status === 'not-started' ? 0 : undefined
    });
  }, [updateTask]);

  const updateTaskProgress = useCallback((taskId: string, progress: number) => {
    const status = progress === 100 ? 'completed' : 
                  progress === 0 ? 'not-started' : 'in-progress';
    updateTask(taskId, { progress, status });
  }, [updateTask]);

  // Milestone management functions
  const updateMilestone = useCallback((milestoneId: string, updates: Partial<Milestone>) => {
    const updatedMilestones = milestones.map(milestone =>
      milestone.id === milestoneId ? { ...milestone, ...updates } : milestone
    );
    setMilestones(updatedMilestones);
    saveData(tasks, updatedMilestones);
  }, [milestones, tasks, saveData]);

  // Utility functions
  const getTasksByStatus = useCallback((status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  const getTasksByCategory = useCallback((category: Task['category']) => {
    return tasks.filter(task => task.category === category);
  }, [tasks]);

  const getCriticalPathTasks = useCallback(() => {
    return tasks.filter(task => task.criticalPath);
  }, [tasks]);

  const getTaskDependencies = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return [];
    return tasks.filter(t => task.dependencies.includes(t.id));
  }, [tasks]);

  const getTaskDependents = useCallback((taskId: string) => {
    return tasks.filter(t => t.dependencies.includes(taskId));
  }, [tasks]);

  const resetData = useCallback(() => {
    const defaultTasks = getDefaultTasks();
    const defaultMilestones = getDefaultMilestones();
    setTasks(defaultTasks);
    setMilestones(defaultMilestones);
    saveData(defaultTasks, defaultMilestones);
  }, [saveData]);

  const exportData = useCallback(() => {
    const exportData = {
      tasks,
      milestones,
      metrics: metrics(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    return exportData;
  }, [tasks, milestones, metrics]);

  const importData = useCallback((importedData: any) => {
    try {
      if (importedData.tasks && Array.isArray(importedData.tasks)) {
        setTasks(importedData.tasks);
      }
      if (importedData.milestones && Array.isArray(importedData.milestones)) {
        setMilestones(importedData.milestones);
      }
      saveData(importedData.tasks, importedData.milestones);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }, [saveData]);

  return {
    // Data
    tasks,
    milestones,
    metrics: metrics(),
    lastSaved,
    autoSaveEnabled,

    // Task management
    addTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskProgress,

    // Milestone management
    updateMilestone,

    // Utility functions
    getTasksByStatus,
    getTasksByCategory,
    getCriticalPathTasks,
    getTaskDependencies,
    getTaskDependents,

    // Data management
    saveData,
    loadData,
    resetData,
    exportData,
    importData,
    setAutoSaveEnabled
  };
};