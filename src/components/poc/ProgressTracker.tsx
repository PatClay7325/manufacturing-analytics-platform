'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Target, PlayCircle } from 'lucide-react';

interface TaskProgress {
  id: string;
  name: string;
  category: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'at-risk';
  progress: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  actualHours: number;
  dueDate: string;
  blockers: string[];
  dependencies: string[];
  criticalPath: boolean;
}

interface ProgressTrackerProps {
  onTaskUpdate?: (taskId: string, updates: Partial<TaskProgress>) => void;
  onGenerateReport?: () => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  onTaskUpdate, 
  onGenerateReport 
}) => {
  const [tasks, setTasks] = useState<TaskProgress[]>([
    // Critical Path Tasks
    {
      id: 'erp-integration',
      name: 'SAP Business One Integration',
      category: 'Integrations',
      status: 'not-started',
      progress: 0,
      priority: 'critical',
      estimatedHours: 40,
      actualHours: 0,
      dueDate: '2025-07-08',
      blockers: ['Need SAP payload structure', 'Missing test environment'],
      dependencies: [],
      criticalPath: true
    },
    {
      id: 'drill-down-ui',
      name: 'Drill-down Navigation UI',
      category: 'UI/UX',
      status: 'not-started',
      progress: 0,
      priority: 'critical',
      estimatedHours: 24,
      actualHours: 0,
      dueDate: '2025-07-01',
      blockers: [],
      dependencies: [],
      criticalPath: true
    },
    {
      id: 'demo-dataset',
      name: '30-Day Demo Dataset',
      category: 'Core Platform',
      status: 'not-started',
      progress: 0,
      priority: 'high',
      estimatedHours: 32,
      actualHours: 0,
      dueDate: '2025-07-15',
      blockers: [],
      dependencies: ['erp-integration'],
      criticalPath: true
    },
    // Completed Tasks
    {
      id: 'oee-calculations',
      name: 'OEE Calculation Engine',
      category: 'Manufacturing Intelligence',
      status: 'completed',
      progress: 100,
      priority: 'high',
      estimatedHours: 16,
      actualHours: 18,
      dueDate: '2025-06-20',
      blockers: [],
      dependencies: [],
      criticalPath: false
    },
    {
      id: 'agent-downtime',
      name: 'Manufacturing Agent - Downtime Analysis',
      category: 'AI & Analytics',
      status: 'completed',
      progress: 100,
      priority: 'high',
      estimatedHours: 20,
      actualHours: 22,
      dueDate: '2025-06-22',
      blockers: [],
      dependencies: [],
      criticalPath: false
    },
    {
      id: 'fast-query',
      name: 'Fast Query Processor',
      category: 'AI & Analytics',
      status: 'completed',
      progress: 100,
      priority: 'medium',
      estimatedHours: 12,
      actualHours: 14,
      dueDate: '2025-06-24',
      blockers: [],
      dependencies: [],
      criticalPath: false
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Calculate overall metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  const criticalPathTasks = tasks.filter(t => t.criticalPath).length;
  const criticalPathCompleted = tasks.filter(t => t.criticalPath && t.status === 'completed').length;
  
  const overallProgress = Math.round((completedTasks / totalTasks) * 100);
  const criticalPathProgress = criticalPathTasks > 0 ? Math.round((criticalPathCompleted / criticalPathTasks) * 100) : 0;

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const categoryMatch = selectedCategory === 'all' || task.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || task.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  const updateTask = (taskId: string, updates: Partial<TaskProgress>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
    onTaskUpdate?.(taskId, updates);
  };

  const startTask = (taskId: string) => {
    updateTask(taskId, { 
      status: 'in-progress',
      actualHours: 0
    });
  };

  const completeTask = (taskId: string) => {
    updateTask(taskId, { 
      status: 'completed',
      progress: 100
    });
  };

  const blockTask = (taskId: string, blocker: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      updateTask(taskId, { 
        status: 'blocked',
        blockers: [...task.blockers, blocker]
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'blocked': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'at-risk': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'blocked') return 'bg-red-500';
    if (status === 'completed') return 'bg-green-500';
    if (progress > 75) return 'bg-blue-500';
    if (progress > 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Progress</p>
              <p className="text-2xl font-bold text-blue-600">{overallProgress}%</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{completedTasks}/{totalTasks} tasks</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Path</p>
              <p className="text-2xl font-bold text-red-600">{criticalPathProgress}%</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${criticalPathProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{criticalPathCompleted}/{criticalPathTasks} critical</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Blocked Tasks</p>
              <p className="text-2xl font-bold text-red-600">{blockedTasks}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-red-600">Requires immediate attention</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Days Remaining</p>
              <p className="text-2xl font-bold text-orange-600">60</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-500">Until POC deadline</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="Core Platform">Core Platform</option>
              <option value="Manufacturing Intelligence">Manufacturing Intelligence</option>
              <option value="AI & Analytics">AI & Analytics</option>
              <option value="Integrations">Integrations</option>
              <option value="UI/UX">UI/UX</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select 
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={onGenerateReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Task Progress</h3>
          <p className="text-sm text-gray-600">Track individual task completion and blockers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blockers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className={`hover:bg-gray-50 ${task.criticalPath ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {task.criticalPath && <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.name}</div>
                        <div className="text-sm text-gray-500">{task.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(task.status)}
                      <span className="text-sm text-gray-900 capitalize">
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(task.progress, task.status)}`}
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.dueDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.blockers.length > 0 ? (
                      <div className="text-sm text-red-600">
                        {task.blockers[0]}
                        {task.blockers.length > 1 && ` +${task.blockers.length - 1} more`}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {task.status === 'not-started' && (
                      <button 
                        onClick={() => startTask(task.id)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        Start
                      </button>
                    )}
                    {task.status === 'in-progress' && (
                      <button 
                        onClick={() => completeTask(task.id)}
                        className="text-green-600 hover:text-green-900 mr-2"
                      >
                        Complete
                      </button>
                    )}
                    {task.status !== 'completed' && task.status !== 'blocked' && (
                      <button 
                        onClick={() => blockTask(task.id, 'New blocker')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;