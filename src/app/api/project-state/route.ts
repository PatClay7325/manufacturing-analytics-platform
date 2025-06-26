import { NextResponse } from 'next/server';
import { projectScanner } from '@/services/projectScanner';
import { autoUpdateService } from '@/services/projectScanner/autoUpdateService';

// Initialize auto-update service on first request
let serviceInitialized = false;

async function initializeService() {
  if (!serviceInitialized) {
    await autoUpdateService.start();
    serviceInitialized = true;
  }
}

export async function GET() {
  try {
    await initializeService();
    
    // Get current state from auto-update service (cached)
    let state = await autoUpdateService.getCurrentState();
    
    // If no cached state, perform fresh scan
    if (!state) {
      state = await projectScanner.scanProject();
    }
    
    // Convert to POC task format
    const pocTasks = autoUpdateService.convertToPOCTasks(state.tasks);
    
    // Calculate additional metrics
    const response = {
      success: true,
      data: {
        metrics: {
          ...state.metrics,
          totalTasks: state.tasks.length,
          completedTasks: state.tasks.filter(t => t.status === 'completed').length,
          inProgressTasks: state.tasks.filter(t => t.status === 'in-progress').length,
          blockedTasks: state.tasks.filter(t => t.status === 'blocked').length,
          criticalTasks: state.tasks.filter(t => t.priority === 'critical').length,
          overallProgress: calculateOverallProgress(state.tasks)
        },
        tasks: pocTasks,
        recentActivity: {
          commits: state.recentCommits,
          lastScan: state.metrics.lastUpdated
        },
        issues: state.criticalIssues,
        recommendations: generateRecommendations(state)
      },
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting project state:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get project state',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Force refresh endpoint
export async function POST() {
  try {
    await initializeService();
    
    // Trigger immediate scan
    await autoUpdateService.performScan();
    const state = await autoUpdateService.getCurrentState();
    
    return NextResponse.json({
      success: true,
      message: 'Project scan completed',
      tasksFound: state?.tasks.length || 0
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to refresh project state' },
      { status: 500 }
    );
  }
}

function calculateOverallProgress(tasks: any[]): number {
  if (tasks.length === 0) return 0;
  
  const totalProgress = tasks.reduce((sum, task) => {
    if (task.status === 'completed') return sum + 100;
    return sum + (task.progress || 0);
  }, 0);
  
  return Math.round(totalProgress / tasks.length);
}

function generateRecommendations(state: any): string[] {
  const recommendations: string[] = [];
  
  // Check for critical issues
  if (state.criticalIssues.length > 0) {
    recommendations.push('🚨 Address critical issues immediately - build/test failures detected');
  }
  
  // Check for high TODO count
  if (state.metrics.todoCount > 20) {
    recommendations.push(`📝 High number of TODOs (${state.metrics.todoCount}) - prioritize completion`);
  }
  
  // Check test coverage
  if (state.metrics.testCoverage < 70) {
    recommendations.push(`🧪 Low test coverage (${state.metrics.testCoverage}%) - add more tests`);
  }
  
  // Check for blocked tasks
  const blockedTasks = state.tasks.filter((t: any) => t.status === 'blocked');
  if (blockedTasks.length > 0) {
    recommendations.push(`🚧 ${blockedTasks.length} tasks are blocked - resolve dependencies`);
  }
  
  // Check TypeScript errors
  if (state.metrics.typeErrors > 0) {
    recommendations.push(`⚠️ ${state.metrics.typeErrors} TypeScript errors - fix for better stability`);
  }
  
  return recommendations;
}