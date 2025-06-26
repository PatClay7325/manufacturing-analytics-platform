// Auto-Update Service for Live Project Management
// Continuously monitors project state and updates POC tasks

import { projectScanner, ProjectState, ProjectTask } from './index';
import { EventEmitter } from 'events';
import { watch } from 'fs';
import path from 'path';

export interface UpdateEvent {
  type: 'metrics' | 'tasks' | 'commits' | 'issues';
  data: any;
  timestamp: Date;
}

export class AutoUpdateService extends EventEmitter {
  private updateInterval: NodeJS.Timeout | null = null;
  private fileWatchers: any[] = [];
  private lastState: ProjectState | null = null;
  private isScanning = false;

  constructor(
    private scanIntervalMs: number = 5 * 60 * 1000, // 5 minutes default
    private watchedPaths: string[] = ['src', 'prisma', 'tests']
  ) {
    super();
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Auto-Update Service...');
    
    // Initial scan
    await this.performScan();
    
    // Set up periodic scanning
    this.updateInterval = setInterval(() => {
      this.performScan();
    }, this.scanIntervalMs);
    
    // Set up file watchers for immediate updates
    this.setupFileWatchers();
    
    console.log('✅ Auto-Update Service started successfully');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Clean up file watchers
    this.fileWatchers.forEach(watcher => watcher.close());
    this.fileWatchers = [];
    
    console.log('🛑 Auto-Update Service stopped');
  }

  async performScan(): Promise<void> {
    if (this.isScanning) {
      console.log('⏳ Scan already in progress, skipping...');
      return;
    }

    this.isScanning = true;
    console.log('🔍 Performing project scan...');
    
    try {
      const newState = await projectScanner.scanProject();
      
      // Compare with last state and emit changes
      if (this.lastState) {
        this.detectAndEmitChanges(this.lastState, newState);
      } else {
        // First scan, emit everything
        this.emit('update', {
          type: 'full',
          data: newState,
          timestamp: new Date()
        });
      }
      
      this.lastState = newState;
      
      // Store state for persistence
      await this.persistState(newState);
      
    } catch (error) {
      console.error('❌ Error during project scan:', error);
      this.emit('error', error);
    } finally {
      this.isScanning = false;
    }
  }

  private setupFileWatchers(): void {
    this.watchedPaths.forEach(watchPath => {
      try {
        const fullPath = path.join(process.cwd(), watchPath);
        const watcher = watch(fullPath, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          
          // Ignore certain files
          if (this.shouldIgnoreFile(filename)) return;
          
          console.log(`📝 File ${eventType}: ${filename}`);
          
          // Debounce rapid changes
          this.debouncedScan();
        });
        
        this.fileWatchers.push(watcher);
      } catch (error) {
        console.error(`Failed to watch ${watchPath}:`, error);
      }
    });
  }

  private debouncedScan = (() => {
    let timeout: NodeJS.Timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.performScan();
      }, 5000); // Wait 5 seconds after last change
    };
  })();

  private shouldIgnoreFile(filename: string): boolean {
    const ignorePatterns = [
      /node_modules/,
      /\.next/,
      /\.git/,
      /dist/,
      /build/,
      /coverage/,
      /\.log$/,
      /\.lock$/
    ];
    
    return ignorePatterns.some(pattern => pattern.test(filename));
  }

  private detectAndEmitChanges(oldState: ProjectState, newState: ProjectState): void {
    // Check for metric changes
    if (JSON.stringify(oldState.metrics) !== JSON.stringify(newState.metrics)) {
      this.emit('update', {
        type: 'metrics',
        data: newState.metrics,
        timestamp: new Date()
      });
    }
    
    // Check for task changes
    const taskChanges = this.findTaskChanges(oldState.tasks, newState.tasks);
    if (taskChanges.length > 0) {
      this.emit('update', {
        type: 'tasks',
        data: {
          added: taskChanges.filter(c => c.type === 'added').map(c => c.task),
          updated: taskChanges.filter(c => c.type === 'updated').map(c => c.task),
          removed: taskChanges.filter(c => c.type === 'removed').map(c => c.task)
        },
        timestamp: new Date()
      });
    }
    
    // Check for new commits
    if (newState.recentCommits.length > 0 && 
        newState.recentCommits[0].hash !== oldState.recentCommits[0]?.hash) {
      this.emit('update', {
        type: 'commits',
        data: newState.recentCommits,
        timestamp: new Date()
      });
    }
    
    // Check for critical issues
    if (JSON.stringify(oldState.criticalIssues) !== JSON.stringify(newState.criticalIssues)) {
      this.emit('update', {
        type: 'issues',
        data: newState.criticalIssues,
        timestamp: new Date()
      });
    }
  }

  private findTaskChanges(oldTasks: ProjectTask[], newTasks: ProjectTask[]): any[] {
    const changes: any[] = [];
    const oldTaskMap = new Map(oldTasks.map(t => [t.id, t]));
    const newTaskMap = new Map(newTasks.map(t => [t.id, t]));
    
    // Find added and updated tasks
    newTasks.forEach(newTask => {
      const oldTask = oldTaskMap.get(newTask.id);
      if (!oldTask) {
        changes.push({ type: 'added', task: newTask });
      } else if (JSON.stringify(oldTask) !== JSON.stringify(newTask)) {
        changes.push({ type: 'updated', task: newTask });
      }
    });
    
    // Find removed tasks
    oldTasks.forEach(oldTask => {
      if (!newTaskMap.has(oldTask.id)) {
        changes.push({ type: 'removed', task: oldTask });
      }
    });
    
    return changes;
  }

  private async persistState(state: ProjectState): Promise<void> {
    // Store in localStorage for client access
    if (typeof window !== 'undefined') {
      localStorage.setItem('project-state', JSON.stringify({
        ...state,
        lastUpdated: new Date().toISOString()
      }));
    }
    
    // Could also store in database or file system
  }

  async getCurrentState(): Promise<ProjectState | null> {
    return this.lastState;
  }

  // Convert scanner tasks to POC management format
  convertToPOCTasks(projectTasks: ProjectTask[]): any[] {
    return projectTasks.map(task => ({
      id: task.id,
      name: task.title,
      category: task.category,
      status: task.status,
      progress: task.progress,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + (task.estimatedHours || 8) * 60 * 60 * 1000).toISOString().split('T')[0],
      assignee: 'Auto-assigned',
      priority: task.priority,
      dependencies: [],
      blockers: task.blockers || [],
      estimatedHours: task.estimatedHours || 8,
      actualHours: 0,
      criticalPath: task.priority === 'critical',
      description: task.description,
      tags: [task.detectedFrom],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Additional metadata
      autoGenerated: true,
      sourceFile: task.filePath,
      lineNumber: task.lineNumber
    }));
  }
}

// Export singleton instance
export const autoUpdateService = new AutoUpdateService();