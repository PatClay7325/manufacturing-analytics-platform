'use client';

import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
  category: string;
  progress: number;
  estimatedHours: number;
  startDate: string;
  endDate: string;
  dependencies: string[];
  blockers: string[];
  assignee?: string;
  description?: string;
}

interface GanttChartProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick: (task: Task) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onTaskUpdate,
  onTaskClick
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-500" />
          Gantt Chart View
        </h3>
        <p className="text-gray-600 text-sm mt-1">Project timeline and task dependencies</p>
      </div>
      
      <div className="p-6">
        {/* Timeline Header */}
        <div className="grid grid-cols-12 gap-2 mb-4 text-xs text-gray-500">
          <div className="col-span-4 font-medium">Task</div>
          <div className="col-span-8 font-medium flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Timeline (Week View)
          </div>
        </div>
        
        {/* Task Rows */}
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div key={task.id} className="grid grid-cols-12 gap-2 items-center">
              {/* Task Info */}
              <div className="col-span-4">
                <div 
                  className="cursor-pointer hover:bg-gray-50 p-2 rounded"
                  onClick={() => onTaskClick(task)}
                >
                  <div className={`font-medium text-sm border-l-4 pl-2 ${getPriorityColor(task.priority)}`}>
                    {task.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {task.category} • {task.progress}% complete
                  </div>
                </div>
              </div>
              
              {/* Timeline Bar */}
              <div className="col-span-8">
                <div className="relative h-6 bg-gray-100 rounded">
                  {/* Progress Bar */}
                  <div 
                    className={`h-full rounded ${getStatusColor(task.status)}`}
                    style={{ width: `${Math.min(task.progress, 100)}%` }}
                  >
                    <div className="h-full bg-white bg-opacity-30 rounded"></div>
                  </div>
                  
                  {/* Progress Percentage */}
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {task.progress > 15 && `${task.progress}%`}
                  </div>
                </div>
                
                {/* Dates */}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{task.startDate}</span>
                  <span>{task.endDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
              <span>Not Started</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>Blocked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;