// Core Project Scanner Service
// Automatically analyzes project state and generates real-time tasks

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CodebaseMetrics {
  totalFiles: number;
  totalLines: number;
  todoCount: number;
  testCoverage: number;
  buildStatus: 'passing' | 'failing' | 'unknown';
  typeErrors: number;
  lastUpdated: Date;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  progress: number;
  detectedFrom: 'todo-comment' | 'test-failure' | 'type-error' | 'missing-impl' | 'manual';
  filePath?: string;
  lineNumber?: number;
  estimatedHours?: number;
  blockers?: string[];
}

export interface ProjectState {
  metrics: CodebaseMetrics;
  tasks: ProjectTask[];
  recentCommits: GitCommit[];
  criticalIssues: CriticalIssue[];
}

export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
  filesChanged: number;
}

export interface CriticalIssue {
  type: 'build-failure' | 'test-failure' | 'security' | 'performance';
  description: string;
  severity: 'critical' | 'high' | 'medium';
  detectedAt: Date;
}

export class ProjectScanner {
  private projectRoot: string;
  private ignorePatterns = [
    'node_modules',
    '.next',
    '.git',
    'dist',
    'build',
    'coverage',
    '*.log',
    'prisma/generated'
  ];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async scanProject(): Promise<ProjectState> {
    console.log('🔍 Starting project scan...');
    
    const [metrics, tasks, commits, issues] = await Promise.all([
      this.getCodebaseMetrics(),
      this.detectTasks(),
      this.getRecentCommits(),
      this.detectCriticalIssues()
    ]);

    return {
      metrics,
      tasks,
      recentCommits: commits,
      criticalIssues: issues
    };
  }

  private async getCodebaseMetrics(): Promise<CodebaseMetrics> {
    let totalFiles = 0;
    let totalLines = 0;
    let todoCount = 0;

    // Scan source files
    const files = await this.getAllFiles('src');
    totalFiles = files.length;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      totalLines += lines.length;
      
      // Count TODOs, FIXMEs, HACKs
      const todoMatches = content.match(/TODO:|FIXME:|HACK:|XXX:/gi) || [];
      todoCount += todoMatches.length;
    }

    // Get test coverage if available
    const testCoverage = await this.getTestCoverage();
    
    // Check build status
    const buildStatus = await this.checkBuildStatus();
    
    // Count TypeScript errors
    const typeErrors = await this.countTypeErrors();

    return {
      totalFiles,
      totalLines,
      todoCount,
      testCoverage,
      buildStatus,
      typeErrors,
      lastUpdated: new Date()
    };
  }

  private async detectTasks(): Promise<ProjectTask[]> {
    const tasks: ProjectTask[] = [];
    
    // 1. Scan for TODO comments
    const todoTasks = await this.scanForTodos();
    tasks.push(...todoTasks);
    
    // 2. Check for unimplemented functions
    const unimplementedTasks = await this.findUnimplementedFunctions();
    tasks.push(...unimplementedTasks);
    
    // 3. Parse test failures
    const testTasks = await this.parseTestFailures();
    tasks.push(...testTasks);
    
    // 4. Identify missing features
    const featureTasks = await this.identifyMissingFeatures();
    tasks.push(...featureTasks);

    return tasks;
  }

  private async scanForTodos(): Promise<ProjectTask[]> {
    const tasks: ProjectTask[] = [];
    const files = await this.getAllFiles('src');
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const todoMatch = line.match(/(TODO|FIXME|HACK|XXX):\s*(.+)/i);
        if (todoMatch) {
          const [, type, description] = todoMatch;
          tasks.push({
            id: `todo_${file}_${index}`,
            title: description.trim(),
            description: `Found ${type} comment in ${path.relative(this.projectRoot, file)}`,
            category: this.categorizeFile(file),
            priority: type === 'FIXME' ? 'high' : 'medium',
            status: 'not-started',
            progress: 0,
            detectedFrom: 'todo-comment',
            filePath: file,
            lineNumber: index + 1,
            estimatedHours: 2
          });
        }
      });
    }
    
    return tasks;
  }

  private async findUnimplementedFunctions(): Promise<ProjectTask[]> {
    const tasks: ProjectTask[] = [];
    const files = await this.getAllFiles('src');
    
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
      
      const content = await fs.readFile(file, 'utf-8');
      
      // Look for common patterns of unimplemented functions
      const patterns = [
        /throw\s+new\s+Error\(['"]Not implemented['"]\)/gi,
        /return\s+Promise\.reject\(['"]Not implemented['"]\)/gi,
        /\/\/\s*TODO:\s*implement/gi,
        /console\.warn\(['"].*not implemented.*['"]\)/gi
      ];
      
      patterns.forEach((pattern) => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          tasks.push({
            id: `unimpl_${file}_${lineNumber}`,
            title: `Implement function in ${path.basename(file)}`,
            description: `Unimplemented function detected at line ${lineNumber}`,
            category: this.categorizeFile(file),
            priority: 'high',
            status: 'not-started',
            progress: 0,
            detectedFrom: 'missing-impl',
            filePath: file,
            lineNumber,
            estimatedHours: 4
          });
        }
      });
    }
    
    return tasks;
  }

  private async parseTestFailures(): Promise<ProjectTask[]> {
    const tasks: ProjectTask[] = [];
    
    try {
      // Run tests and capture output
      const { stdout, stderr } = await execAsync('npm run test -- --reporter=json', {
        cwd: this.projectRoot
      }).catch(err => ({ stdout: '', stderr: err.stderr || '' }));
      
      // Parse test results
      if (stdout) {
        try {
          const results = JSON.parse(stdout);
          // Process test failures
          // This depends on your test framework output format
        } catch (e) {
          // Fallback parsing
        }
      }
    } catch (error) {
      console.log('Could not run tests:', error);
    }
    
    return tasks;
  }

  private async identifyMissingFeatures(): Promise<ProjectTask[]> {
    const tasks: ProjectTask[] = [];
    
    // Check for missing critical files/features
    const criticalFeatures = [
      { path: 'src/app/api/chat/route.ts', name: 'Chat API Endpoint' },
      { path: 'src/app/api/metrics/route.ts', name: 'Metrics API Endpoint' },
      { path: 'src/services/aiService.ts', name: 'AI Service Implementation' },
      { path: 'src/components/dashboard/OEEDashboard.tsx', name: 'OEE Dashboard Component' }
    ];
    
    for (const feature of criticalFeatures) {
      const fullPath = path.join(this.projectRoot, feature.path);
      try {
        await fs.access(fullPath);
        // File exists, check if it's implemented
        const content = await fs.readFile(fullPath, 'utf-8');
        if (content.includes('TODO') || content.includes('not implemented')) {
          tasks.push({
            id: `feature_${feature.path}`,
            title: `Complete ${feature.name}`,
            description: `Implementation incomplete in ${feature.path}`,
            category: 'Core Platform',
            priority: 'critical',
            status: 'in-progress',
            progress: 50,
            detectedFrom: 'missing-impl',
            filePath: fullPath,
            estimatedHours: 8
          });
        }
      } catch (error) {
        // File doesn't exist
        tasks.push({
          id: `feature_${feature.path}`,
          title: `Create ${feature.name}`,
          description: `Missing critical feature: ${feature.path}`,
          category: 'Core Platform',
          priority: 'critical',
          status: 'not-started',
          progress: 0,
          detectedFrom: 'missing-impl',
          estimatedHours: 12
        });
      }
    }
    
    return tasks;
  }

  private async getRecentCommits(): Promise<GitCommit[]> {
    try {
      const { stdout } = await execAsync(
        'git log --oneline --pretty=format:"%H|%an|%ad|%s" --date=iso -10',
        { cwd: this.projectRoot }
      );
      
      return stdout.split('\n').map(line => {
        const [hash, author, date, message] = line.split('|');
        return {
          hash: hash.substring(0, 7),
          author,
          date: new Date(date),
          message,
          filesChanged: 0 // Would need additional git command to get this
        };
      });
    } catch (error) {
      return [];
    }
  }

  private async detectCriticalIssues(): Promise<CriticalIssue[]> {
    const issues: CriticalIssue[] = [];
    
    // Check build status
    const buildStatus = await this.checkBuildStatus();
    if (buildStatus === 'failing') {
      issues.push({
        type: 'build-failure',
        description: 'Build is currently failing',
        severity: 'critical',
        detectedAt: new Date()
      });
    }
    
    // Check for security vulnerabilities
    try {
      const { stdout } = await execAsync('npm audit --json', { cwd: this.projectRoot });
      const audit = JSON.parse(stdout);
      if (audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0) {
        issues.push({
          type: 'security',
          description: `${audit.metadata.vulnerabilities.critical} critical and ${audit.metadata.vulnerabilities.high} high vulnerabilities found`,
          severity: 'critical',
          detectedAt: new Date()
        });
      }
    } catch (error) {
      // Audit might fail, that's ok
    }
    
    return issues;
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const fullPath = path.join(this.projectRoot, dir);
    
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name);
        
        if (this.shouldIgnore(entry.name)) continue;
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(path.relative(this.projectRoot, entryPath));
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(entryPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  private shouldIgnore(name: string): boolean {
    return this.ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        return name.endsWith(pattern.replace('*', ''));
      }
      return name === pattern;
    });
  }

  private categorizeFile(filePath: string): string {
    if (filePath.includes('/api/')) return 'API';
    if (filePath.includes('/components/')) return 'UI/UX';
    if (filePath.includes('/services/')) return 'Core Platform';
    if (filePath.includes('/lib/ai/') || filePath.includes('/core/ai/')) return 'AI & Analytics';
    if (filePath.includes('/hooks/')) return 'Core Platform';
    return 'Core Platform';
  }

  private async getTestCoverage(): Promise<number> {
    // Try to read coverage report if it exists
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage/coverage-summary.json');
      const coverage = await fs.readFile(coveragePath, 'utf-8');
      const data = JSON.parse(coverage);
      return data.total.lines.pct || 0;
    } catch (error) {
      return 0;
    }
  }

  private async checkBuildStatus(): Promise<'passing' | 'failing' | 'unknown'> {
    try {
      await execAsync('npm run build', { cwd: this.projectRoot });
      return 'passing';
    } catch (error) {
      return 'failing';
    }
  }

  private async countTypeErrors(): Promise<number> {
    try {
      const { stdout } = await execAsync('npx tsc --noEmit --pretty false', { 
        cwd: this.projectRoot 
      });
      const errors = stdout.match(/error TS/g);
      return errors ? errors.length : 0;
    } catch (error: any) {
      // TypeScript exits with error code when there are errors
      const errors = error.stdout?.match(/error TS/g);
      return errors ? errors.length : 0;
    }
  }
}

// Export singleton instance
export const projectScanner = new ProjectScanner();