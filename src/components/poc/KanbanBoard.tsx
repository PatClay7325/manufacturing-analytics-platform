'use client';

import React from 'react';
import { Plus, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

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

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskUpdate,
  onTaskClick,
  onAddTask
}) => {
  const columns = [
    { id: 'not-started', title: 'Not Started', icon: Clock, color: 'bg-gray-100' },
    { id: 'in-progress', title: 'In Progress', icon: AlertTriangle, color: 'bg-blue-100' },
    { id: 'completed', title: 'Completed', icon: CheckCircle, color: 'bg-green-100' },
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-gray-300 bg-gray-50';
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    onTaskUpdate(taskId, { status: newStatus });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Kanban Board</h3>
          <button
            onClick={onAddTask}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(column => {
            const columnTasks = getTasksByStatus(column.id);
            const IconComponent = column.icon;
            
            return (
              <div key={column.id} className="space-y-4">
                {/* Column Header */}
                <div className={`p-4 rounded-lg ${column.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">{column.title}</h4>
                    </div>
                    <span className="bg-white px-2 py-1 rounded text-sm font-medium text-gray-600">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>
                
                {/* Drop Zone */}
                <div 
                  className="min-h-96 space-y-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900">{task.name}</div>
                        <div className="text-sm text-gray-600">{task.category}</div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Task Meta */}
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded ${
                            task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                          <span>{task.estimatedHours}h</span>
                        </div>
                        
                        {/* Blockers Indicator */}
                        {task.blockers.length > 0 && (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs">{task.blockers.length} blocker(s)</span>
                          </div>
                        )}
                        
                        {/* Dependencies */}
                        {task.dependencies.length > 0 && (
                          <div className="text-xs text-gray-500">
                            <span>Depends on: {task.dependencies.length} task(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty State */}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
                      <span className="text-gray-500 text-sm">No tasks in {column.title.toLowerCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;