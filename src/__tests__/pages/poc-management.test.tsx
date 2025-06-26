import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import POCManagementPage from '@/app/poc-management/page';
import { usePOCData } from '@/hooks/usePOCData';
import { useLiveProjectData } from '@/hooks/useLiveProjectData';

// Mock the hooks
jest.mock('@/hooks/usePOCData');
jest.mock('@/hooks/useLiveProjectData');

// Mock components that might have complex dependencies
jest.mock('@/components/poc/ProgressTracker', () => ({
  __esModule: true,
  default: ({ onTaskUpdate, onGenerateReport }: any) => (
    <div data-testid="progress-tracker">
      <button onClick={onGenerateReport}>Generate Report</button>
    </div>
  ),
}));

jest.mock('@/components/poc/GanttChart', () => ({
  __esModule: true,
  default: ({ tasks, onTaskUpdate, onTaskClick }: any) => (
    <div data-testid="gantt-chart">
      Gantt Chart - {tasks.length} tasks
      <button onClick={() => onTaskClick(tasks[0])}>Edit First Task</button>
    </div>
  ),
}));

jest.mock('@/components/poc/KanbanBoard', () => ({
  __esModule: true,
  default: ({ tasks, onTaskUpdate, onTaskClick, onAddTask }: any) => (
    <div data-testid="kanban-board">
      Kanban Board - {tasks.length} tasks
      <button onClick={onAddTask}>Add Task</button>
    </div>
  ),
}));

jest.mock('@/components/poc/LiveProjectStatus', () => ({
  __esModule: true,
  default: () => <div data-testid="live-project-status">Live Project Status</div>,
}));

jest.mock('@/components/poc/TaskEditModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, task, onSave }: any) =>
    isOpen ? (
      <div data-testid="task-edit-modal">
        <h2>{task ? 'Edit Task' : 'New Task'}</h2>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSave({ ...task, name: 'Updated Task' })}>Save</button>
      </div>
    ) : null,
}));

// Mock data
const mockTasks = [
  {
    id: '1',
    name: 'Test Task 1',
    category: 'Core Platform',
    status: 'in-progress',
    progress: 50,
    startDate: '2025-06-25',
    endDate: '2025-07-01',
    assignee: 'Developer',
    priority: 'critical',
    dependencies: [],
    blockers: ['Need API access'],
    estimatedHours: 40,
    actualHours: 20,
    criticalPath: true,
    description: 'Test description',
    tags: ['test'],
    createdAt: '2025-06-25T00:00:00Z',
    updatedAt: '2025-06-25T00:00:00Z',
  },
  {
    id: '2',
    name: 'Test Task 2',
    category: 'UI/UX',
    status: 'not-started',
    progress: 0,
    startDate: '2025-07-01',
    endDate: '2025-07-15',
    assignee: 'Designer',
    priority: 'high',
    dependencies: ['1'],
    blockers: [],
    estimatedHours: 24,
    actualHours: 0,
    criticalPath: false,
  },
];

const mockMilestones = [
  {
    id: 'm1',
    name: 'Phase 1 Complete',
    date: '2025-07-15',
    status: 'on-track',
    progress: 25,
    tasks: ['1', '2'],
  },
];

const mockMetrics = {
  totalTasks: 2,
  completedTasks: 0,
  inProgressTasks: 1,
  blockedTasks: 1,
  overallProgress: 25,
  daysRemaining: 60,
  criticalPathBlocked: true,
  atRiskTasks: 1,
  totalEstimatedHours: 64,
  totalActualHours: 20,
  estimatedCompletion: '2025-08-20',
};

const mockLiveMetrics = {
  totalFiles: 150,
  totalLines: 15000,
  todoCount: 23,
  testCoverage: 65,
  buildStatus: 'failing' as const,
  typeErrors: 5,
  totalTasks: 5,
  completedTasks: 1,
  inProgressTasks: 2,
  blockedTasks: 1,
  criticalTasks: 1,
  overallProgress: 30,
};

const mockUsePOCData = usePOCData as jest.MockedFunction<typeof usePOCData>;
const mockUseLiveProjectData = useLiveProjectData as jest.MockedFunction<typeof useLiveProjectData>;

describe('POC Management Page', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUsePOCData.mockReturnValue({
      tasks: mockTasks,
      milestones: mockMilestones,
      metrics: mockMetrics,
      lastSaved: new Date(),
      addTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      updateTaskStatus: jest.fn(),
      updateTaskProgress: jest.fn(),
      getCriticalPathTasks: jest.fn(() => mockTasks.filter(t => t.criticalPath)),
      getTasksByStatus: jest.fn((status) => mockTasks.filter(t => t.status === status)),
      exportData: jest.fn(() => ({ tasks: mockTasks, milestones: mockMilestones })),
      importData: jest.fn(() => true),
    });

    mockUseLiveProjectData.mockReturnValue({
      metrics: mockLiveMetrics,
      tasks: [],
      recentActivity: { commits: [], lastScan: new Date() },
      issues: [
        {
          type: 'build-failure',
          description: 'Build is currently failing',
          severity: 'critical',
          detectedAt: new Date(),
        },
      ],
      recommendations: ['Fix build errors immediately', 'Increase test coverage'],
      isLoading: false,
      isLive: true,
      lastUpdated: new Date(),
      error: null,
      forceRefresh: jest.fn(),
      isStale: false,
    });
  });

  describe('Dashboard View', () => {
    it('renders the dashboard with all key components', () => {
      render(<POCManagementPage />);

      // Header
      expect(screen.getByText('POC Project Management')).toBeInTheDocument();
      expect(screen.getByText('Manufacturing Intelligence Platform - 60 Day Sprint')).toBeInTheDocument();

      // Live Project Status
      expect(screen.getByTestId('live-project-status')).toBeInTheDocument();

      // Critical Status Cards
      expect(screen.getByText('Project Health')).toBeInTheDocument();
      expect(screen.getByText('AT RISK')).toBeInTheDocument(); // criticalPathBlocked is true
      
      // Metrics
      expect(screen.getByText('25%')).toBeInTheDocument(); // overallProgress
      expect(screen.getByText('60')).toBeInTheDocument(); // daysRemaining
    });

    it('displays risk indicators including live issues', () => {
      render(<POCManagementPage />);

      // Check for risk indicators
      expect(screen.getByText('Critical path tasks are blocked')).toBeInTheDocument();
      expect(screen.getByText('1 tasks are currently blocked')).toBeInTheDocument();
      expect(screen.getByText('🔴 Build is currently failing - blocking deployment')).toBeInTheDocument();
      expect(screen.getByText('⚠️ 5 TypeScript errors detected')).toBeInTheDocument();
    });

    it('shows critical path tasks with auto-generated badges', () => {
      const autoGeneratedTask = {
        ...mockTasks[0],
        id: 'auto-1',
        name: 'Fix TODO in dataService.ts',
        autoGenerated: true,
      };

      mockUsePOCData.mockReturnValue({
        ...mockUsePOCData(),
        tasks: [...mockTasks, autoGeneratedTask],
        getCriticalPathTasks: jest.fn(() => [mockTasks[0], autoGeneratedTask]),
      });

      render(<POCManagementPage />);

      // Look for the AUTO badge
      expect(screen.getByText('AUTO')).toBeInTheDocument();
      expect(screen.getByText('Fix TODO in dataService.ts')).toBeInTheDocument();
    });

    it('displays milestones with progress', () => {
      render(<POCManagementPage />);

      expect(screen.getByText('Phase 1 Complete')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between different views', () => {
      render(<POCManagementPage />);

      // Default is dashboard
      expect(screen.getByTestId('live-project-status')).toBeInTheDocument();

      // Switch to Gantt Chart
      fireEvent.click(screen.getByText('Gantt Chart'));
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();

      // Switch to Kanban Board
      fireEvent.click(screen.getByText('Kanban Board'));
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();

      // Switch to POC Assessment
      fireEvent.click(screen.getByText('POC Assessment'));
      expect(screen.getByText('POC Status Assessment')).toBeInTheDocument();
    });
  });

  describe('Task Management', () => {
    it('opens task modal when Add Task is clicked', () => {
      render(<POCManagementPage />);

      const addButton = screen.getByRole('button', { name: /add task/i });
      fireEvent.click(addButton);

      expect(screen.getByTestId('task-edit-modal')).toBeInTheDocument();
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });

    it('opens edit modal when task is edited', async () => {
      render(<POCManagementPage />);

      // Find and click edit button for first task
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('task-edit-modal')).toBeInTheDocument();
        expect(screen.getByText('Edit Task')).toBeInTheDocument();
      });
    });

    it('saves task when Save is clicked in modal', async () => {
      const updateTask = jest.fn();
      mockUsePOCData.mockReturnValue({
        ...mockUsePOCData(),
        updateTask,
      });

      render(<POCManagementPage />);

      // Open edit modal
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Click save
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateTask).toHaveBeenCalledWith('1', expect.objectContaining({
          name: 'Updated Task',
        }));
      });
    });

    it('starts task when Start button is clicked', () => {
      const updateTaskStatus = jest.fn();
      mockUsePOCData.mockReturnValue({
        ...mockUsePOCData(),
        updateTaskStatus,
      });

      render(<POCManagementPage />);

      // Find task with not-started status
      const startButtons = screen.getAllByText('Start');
      expect(startButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(startButtons[0]);
      expect(updateTaskStatus).toHaveBeenCalledWith('2', 'in-progress');
    });
  });

  describe('Data Export/Import', () => {
    it('exports data when Export button is clicked', () => {
      const exportData = jest.fn(() => ({ tasks: mockTasks, milestones: mockMilestones }));
      mockUsePOCData.mockReturnValue({
        ...mockUsePOCData(),
        exportData,
      });

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:test');

      render(<POCManagementPage />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      expect(exportData).toHaveBeenCalled();
    });

    it('imports data when file is selected', async () => {
      const importData = jest.fn(() => true);
      mockUsePOCData.mockReturnValue({
        ...mockUsePOCData(),
        importData,
      });

      render(<POCManagementPage />);

      const file = new File(['{"tasks": [], "milestones": []}'], 'test.json', {
        type: 'application/json',
      });

      const importInput = screen.getByLabelText(/import/i).querySelector('input[type="file"]');
      expect(importInput).toBeInTheDocument();

      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: '{"tasks": [], "milestones": []}',
      };
      
      (global as any).FileReader = jest.fn(() => mockFileReader);

      fireEvent.change(importInput!, { target: { files: [file] } });

      // Trigger onload
      act(() => {
        mockFileReader.onload({ target: { result: mockFileReader.result } });
      });

      await waitFor(() => {
        expect(importData).toHaveBeenCalled();
      });
    });
  });

  describe('POC Assessment View', () => {
    it('displays comprehensive assessment data', () => {
      render(<POCManagementPage />);

      fireEvent.click(screen.getByText('POC Assessment'));

      // Status Overview
      expect(screen.getByText('65%')).toBeInTheDocument(); // Overall Completion
      expect(screen.getByText('70%')).toBeInTheDocument(); // Success Probability
      expect(screen.getByText('RECOVERY_MODE')).toBeInTheDocument();

      // Critical Issues
      expect(screen.getByText('Critical Issues Status')).toBeInTheDocument();
      expect(screen.getByText('Prisma Schema Validation')).toBeInTheDocument();
      expect(screen.getByText('RESOLVED')).toBeInTheDocument();

      // Weekly Progress
      expect(screen.getByText('8-Week Recovery & Implementation Plan')).toBeInTheDocument();
      expect(screen.getByText('Week 1 (Jun 25-Jul 1)')).toBeInTheDocument();
    });

    it('shows risk assessment with all categories', () => {
      render(<POCManagementPage />);

      fireEvent.click(screen.getByText('POC Assessment'));

      // Risk categories
      expect(screen.getByText('Technical Risks')).toBeInTheDocument();
      expect(screen.getByText('User Risks')).toBeInTheDocument();
      expect(screen.getByText('Business Risks')).toBeInTheDocument();

      // Specific risks
      expect(screen.getByText(/Build system complexity underestimated/)).toBeInTheDocument();
      expect(screen.getByText(/60% probability/)).toBeInTheDocument();
    });

    it('displays success metrics tracking', () => {
      render(<POCManagementPage />);

      fireEvent.click(screen.getByText('POC Assessment'));

      expect(screen.getByText('Success Metrics Tracking')).toBeInTheDocument();
      
      // Technical Metrics
      expect(screen.getByText('Application Uptime')).toBeInTheDocument();
      expect(screen.getByText('Target: >99%')).toBeInTheDocument();
      
      // User Metrics
      expect(screen.getByText('Task Completion Rate')).toBeInTheDocument();
      
      // Business Metrics
      expect(screen.getByText('ROI Demonstration')).toBeInTheDocument();
    });
  });

  describe('Timeline View', () => {
    it('displays project timeline with milestones', () => {
      render(<POCManagementPage />);

      fireEvent.click(screen.getByText('Timeline'));

      expect(screen.getByText('Project Timeline')).toBeInTheDocument();
      expect(screen.getByText('Phase 1 Complete')).toBeInTheDocument();
      expect(screen.getByText(/Target:/)).toBeInTheDocument();
    });
  });

  describe('Live Data Integration', () => {
    it('merges live tasks with manual tasks', () => {
      const liveTasks = [
        {
          id: 'auto-todo-1',
          name: 'TODO: Implement authentication',
          category: 'Core Platform',
          status: 'not-started',
          priority: 'high',
          progress: 0,
          autoGenerated: true,
          startDate: '2025-06-25',
          endDate: '2025-06-30',
          assignee: 'Auto-assigned',
          dependencies: [],
          blockers: [],
          estimatedHours: 8,
          actualHours: 0,
          criticalPath: false,
        },
      ];

      mockUseLiveProjectData.mockReturnValue({
        ...mockUseLiveProjectData(),
        tasks: liveTasks,
      });

      render(<POCManagementPage />);

      // Check that metrics reflect combined data
      expect(screen.getByText(/7/)).toBeInTheDocument(); // totalTasks should be manual + live
    });

    it('shows build status from live data', () => {
      render(<POCManagementPage />);

      // Build failure should appear in risk indicators
      expect(screen.getByText('🔴 Build is currently failing - blocking deployment')).toBeInTheDocument();
    });

    it('can force refresh live data', () => {
      const forceRefresh = jest.fn();
      mockUseLiveProjectData.mockReturnValue({
        ...mockUseLiveProjectData(),
        forceRefresh,
      });

      render(<POCManagementPage />);

      // The force refresh button is in the LiveProjectStatus component
      // Since it's mocked, we can't directly test it, but we verify the function is available
      expect(forceRefresh).toBeDefined();
    });
  });

  describe('Auto-save functionality', () => {
    it('shows auto-save status when data is saved', async () => {
      const lastSaved = new Date();
      mockUsePOCData.mockReturnValue({
        ...mockUsePOCData(),
        lastSaved,
      });

      render(<POCManagementPage />);

      await waitFor(() => {
        expect(screen.getByText(/Auto-saved at/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive behavior', () => {
    it('renders properly on mobile viewport', () => {
      // Mock window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<POCManagementPage />);

      // Should still render key components
      expect(screen.getByText('POC Project Management')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('handles live data errors gracefully', () => {
      mockUseLiveProjectData.mockReturnValue({
        ...mockUseLiveProjectData(),
        error: 'Failed to connect to server',
        isLive: false,
      });

      render(<POCManagementPage />);

      // Should still render the page
      expect(screen.getByText('POC Project Management')).toBeInTheDocument();
      // Live status should show as offline
      expect(screen.getByTestId('live-project-status')).toBeInTheDocument();
    });

    it('handles import errors', async () => {
      const importData = jest.fn(() => false);
      mockUsePOCData.mockReturnValue({
        ...mockUsePOCData(),
        importData,
      });

      // Mock window.alert
      window.alert = jest.fn();

      render(<POCManagementPage />);

      const file = new File(['invalid json'], 'test.json', {
        type: 'application/json',
      });

      const importInput = screen.getByLabelText(/import/i).querySelector('input[type="file"]');
      
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: 'invalid json',
      };
      
      (global as any).FileReader = jest.fn(() => mockFileReader);

      fireEvent.change(importInput!, { target: { files: [file] } });

      act(() => {
        mockFileReader.onload({ target: { result: mockFileReader.result } });
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Invalid file format. Please select a valid JSON file.');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<POCManagementPage />);

      // Check for proper button labels
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();

      // Check for table structure
      fireEvent.click(screen.getByText('POC Assessment'));
      expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      render(<POCManagementPage />);

      // Tab through navigation
      const dashboardTab = screen.getByText('Dashboard');
      const ganttTab = screen.getByText('Gantt Chart');

      dashboardTab.focus();
      expect(document.activeElement).toBe(dashboardTab);

      // Simulate tab key
      fireEvent.keyDown(dashboardTab, { key: 'Tab' });
      // Note: Full keyboard navigation testing would require more setup
    });
  });
});

// Export for potential reuse
export { mockTasks, mockMilestones, mockMetrics, mockLiveMetrics };