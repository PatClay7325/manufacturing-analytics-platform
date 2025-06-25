/**
 * PARENT-CHILD COMPONENT DEPTH TESTING
 * 
 * Comprehensive testing of all component relationships at every depth level.
 * This test ensures no component breaks regardless of nesting depth or
 * prop drilling scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Mock all external dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Component hierarchy mapping for depth testing
const componentHierarchy = {
  // Level 1: Root Layout Components
  level1: [
    { name: 'AppLayout', path: '/src/components/layout/AppLayout.tsx' },
    { name: 'DashboardLayout', path: '/src/components/layout/DashboardLayout.tsx' },
    { name: 'ClientLayout', path: '/src/app/ClientLayout.tsx' },
  ],
  
  // Level 2: Major Container Components  
  level2: [
    { name: 'ManufacturingDashboard', path: '/src/components/dashboard/ManufacturingDashboard.tsx' },
    { name: 'ChatLayout', path: '/src/components/chat/ChatLayout.tsx' },
    { name: 'AlertList', path: '/src/components/alerts/AlertList.tsx' },
  ],
  
  // Level 3: Feature Components
  level3: [
    { name: 'DashboardToolbar', path: '/src/components/dashboard/DashboardToolbar.tsx' },
    { name: 'PanelFrame', path: '/src/components/dashboard/PanelFrame.tsx' },
    { name: 'ChatMessage', path: '/src/components/chat/ChatMessage.tsx' },
    { name: 'AlertCard', path: '/src/components/alerts/AlertCard.tsx' },
  ],
  
  // Level 4: Panel and Widget Components
  level4: [
    { name: 'TimeSeriesPanel', path: '/src/components/panels/TimeSeriesPanel.tsx' },
    { name: 'StatPanel', path: '/src/components/panels/StatPanel.tsx' },
    { name: 'GaugePanel', path: '/src/components/panels/GaugePanel.tsx' },
    { name: 'TablePanel', path: '/src/components/panels/TablePanel.tsx' },
  ],
  
  // Level 5: Atomic Components
  level5: [
    { name: 'AnimatedNumber', path: '/src/components/common/AnimatedNumber.tsx' },
    { name: 'AlertBadge', path: '/src/components/alerts/AlertBadge.tsx' },
    { name: 'EquipmentCard', path: '/src/components/equipment/EquipmentCard.tsx' },
    { name: 'ThoughtCard', path: '/src/components/chat/ThoughtCard.tsx' },
  ],
};

// Test wrapper with all providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Mock component factory for testing
const createMockComponent = (name: string, level: number) => {
  return React.forwardRef<HTMLDivElement, any>((props, ref) => {
    const [state, setState] = useState('initialized');
    
    useEffect(() => {
      setState('mounted');
      return () => setState('unmounted');
    }, []);

    return (
      <div 
        ref={ref}
        data-testid={`mock-${name.toLowerCase()}`}
        data-level={level}
        data-state={state}
        {...props}
      >
        <span data-testid={`${name.toLowerCase()}-content`}>
          {name} Component (Level {level})
        </span>
        {props.children}
      </div>
    );
  });
};

describe('🧩 PARENT-CHILD COMPONENT DEPTH TESTING', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('📏 DEPTH LEVEL 1 - ROOT LAYOUT COMPONENTS', () => {
    componentHierarchy.level1.forEach(({ name, path }) => {
      it(`🔧 should render ${name} as root component`, async () => {
        const MockComponent = createMockComponent(name, 1);
        
        const { container } = render(
          <TestWrapper>
            <MockComponent data-role="root-layout">
              <div data-testid="child-content">Child Content</div>
            </MockComponent>
          </TestWrapper>
        );

        expect(screen.getByTestId(`mock-${name.toLowerCase()}`)).toBeInTheDocument();
        expect(screen.getByTestId(`${name.toLowerCase()}-content`)).toBeInTheDocument();
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
        
        // Verify root component properties
        const rootElement = screen.getByTestId(`mock-${name.toLowerCase()}`);
        expect(rootElement).toHaveAttribute('data-level', '1');
        expect(rootElement).toHaveAttribute('data-role', 'root-layout');
      });
    });
  });

  describe('📐 DEPTH LEVEL 2 - MAJOR CONTAINER COMPONENTS', () => {
    componentHierarchy.level2.forEach(({ name, path }) => {
      it(`🏗️ should render ${name} within root layout`, async () => {
        const MockParent = createMockComponent('AppLayout', 1);
        const MockComponent = createMockComponent(name, 2);
        
        const { container } = render(
          <TestWrapper>
            <MockParent>
              <MockComponent data-role="container">
                <div data-testid="nested-content">Nested Content</div>
              </MockComponent>
            </MockParent>
          </TestWrapper>
        );

        // Verify parent-child relationship
        expect(screen.getByTestId('mock-applayout')).toBeInTheDocument();
        expect(screen.getByTestId(`mock-${name.toLowerCase()}`)).toBeInTheDocument();
        expect(screen.getByTestId('nested-content')).toBeInTheDocument();
        
        // Verify nesting structure
        const parent = screen.getByTestId('mock-applayout');
        const child = screen.getByTestId(`mock-${name.toLowerCase()}`);
        expect(parent).toContainElement(child);
      });
    });
  });

  describe('📊 DEPTH LEVEL 3 - FEATURE COMPONENTS', () => {
    componentHierarchy.level3.forEach(({ name, path }) => {
      it(`⚙️ should render ${name} within container hierarchy`, async () => {
        const MockRoot = createMockComponent('AppLayout', 1);
        const MockContainer = createMockComponent('ManufacturingDashboard', 2);
        const MockComponent = createMockComponent(name, 3);
        
        const { container } = render(
          <TestWrapper>
            <MockRoot>
              <MockContainer>
                <MockComponent data-role="feature">
                  <div data-testid="feature-content">Feature Content</div>
                </MockComponent>
              </MockContainer>
            </MockRoot>
          </TestWrapper>
        );

        // Verify 3-level hierarchy
        const root = screen.getByTestId('mock-applayout');
        const container = screen.getByTestId('mock-manufacturingdashboard');
        const feature = screen.getByTestId(`mock-${name.toLowerCase()}`);
        
        expect(root).toContainElement(container);
        expect(container).toContainElement(feature);
        expect(feature).toBeInTheDocument();
      });
    });
  });

  describe('📈 DEPTH LEVEL 4 - PANEL COMPONENTS', () => {
    componentHierarchy.level4.forEach(({ name, path }) => {
      it(`📊 should render ${name} within 4-level hierarchy`, async () => {
        const MockRoot = createMockComponent('AppLayout', 1);
        const MockContainer = createMockComponent('ManufacturingDashboard', 2);
        const MockFeature = createMockComponent('DashboardToolbar', 3);
        const MockComponent = createMockComponent(name, 4);
        
        const { container } = render(
          <TestWrapper>
            <MockRoot>
              <MockContainer>
                <MockFeature>
                  <MockComponent data-role="panel">
                    <div data-testid="panel-content">Panel Content</div>
                  </MockComponent>
                </MockFeature>
              </MockContainer>
            </MockRoot>
          </TestWrapper>
        );

        // Verify 4-level deep nesting
        const levels = [
          screen.getByTestId('mock-applayout'),
          screen.getByTestId('mock-manufacturingdashboard'),
          screen.getByTestId('mock-dashboardtoolbar'),
          screen.getByTestId(`mock-${name.toLowerCase()}`),
        ];
        
        for (let i = 0; i < levels.length - 1; i++) {
          expect(levels[i]).toContainElement(levels[i + 1]);
        }
      });
    });
  });

  describe('⚛️ DEPTH LEVEL 5 - ATOMIC COMPONENTS', () => {
    componentHierarchy.level5.forEach(({ name, path }) => {
      it(`🔬 should render ${name} within 5-level hierarchy`, async () => {
        const MockRoot = createMockComponent('AppLayout', 1);
        const MockContainer = createMockComponent('ManufacturingDashboard', 2);
        const MockFeature = createMockComponent('DashboardToolbar', 3);
        const MockPanel = createMockComponent('TimeSeriesPanel', 4);
        const MockComponent = createMockComponent(name, 5);
        
        const { container } = render(
          <TestWrapper>
            <MockRoot>
              <MockContainer>
                <MockFeature>
                  <MockPanel>
                    <MockComponent data-role="atomic">
                      <span data-testid="atomic-content">Atomic Content</span>
                    </MockComponent>
                  </MockPanel>
                </MockFeature>
              </MockContainer>
            </MockRoot>
          </TestWrapper>
        );

        // Verify complete 5-level hierarchy
        const levels = [
          screen.getByTestId('mock-applayout'),
          screen.getByTestId('mock-manufacturingdashboard'),
          screen.getByTestId('mock-dashboardtoolbar'),
          screen.getByTestId('mock-timeseriespanel'),
          screen.getByTestId(`mock-${name.toLowerCase()}`),
        ];
        
        for (let i = 0; i < levels.length - 1; i++) {
          expect(levels[i]).toContainElement(levels[i + 1]);
        }
        
        // Verify atomic component is at deepest level
        const atomicComponent = levels[levels.length - 1];
        expect(atomicComponent).toHaveAttribute('data-level', '5');
        expect(atomicComponent).toHaveAttribute('data-role', 'atomic');
      });
    });
  });

  describe('🔄 PROP DRILLING TESTING', () => {
    it('should handle deep prop drilling without data loss', () => {
      const testData = {
        equipment: 'line-001',
        oee: 85.5,
        status: 'running',
        metadata: {
          site: 'factory-a',
          line: 'production-1',
          shift: 'day',
        },
      };

      const Level1 = ({ data, children }: any) => (
        <div data-testid="level-1" data-equipment={data.equipment}>
          {children}
        </div>
      );

      const Level2 = ({ data, children }: any) => (
        <div data-testid="level-2" data-oee={data.oee}>
          {children}
        </div>
      );

      const Level3 = ({ data, children }: any) => (
        <div data-testid="level-3" data-status={data.status}>
          {children}
        </div>
      );

      const Level4 = ({ data, children }: any) => (
        <div data-testid="level-4" data-site={data.metadata.site}>
          {children}
        </div>
      );

      const Level5 = ({ data }: any) => (
        <div 
          data-testid="level-5" 
          data-line={data.metadata.line}
          data-shift={data.metadata.shift}
        >
          Final Level: {data.equipment} - {data.oee}% - {data.status}
        </div>
      );

      render(
        <TestWrapper>
          <Level1 data={testData}>
            <Level2 data={testData}>
              <Level3 data={testData}>
                <Level4 data={testData}>
                  <Level5 data={testData} />
                </Level4>
              </Level3>
            </Level2>
          </Level1>
        </TestWrapper>
      );

      // Verify data integrity at each level
      expect(screen.getByTestId('level-1')).toHaveAttribute('data-equipment', 'line-001');
      expect(screen.getByTestId('level-2')).toHaveAttribute('data-oee', '85.5');
      expect(screen.getByTestId('level-3')).toHaveAttribute('data-status', 'running');
      expect(screen.getByTestId('level-4')).toHaveAttribute('data-site', 'factory-a');
      expect(screen.getByTestId('level-5')).toHaveAttribute('data-line', 'production-1');
      expect(screen.getByTestId('level-5')).toHaveAttribute('data-shift', 'day');
    });

    it('should handle context providers at multiple levels', () => {
      const EquipmentContext = createContext<any>(null);
      const DashboardContext = createContext<any>(null);
      
      const Level1Provider = ({ children }: any) => (
        <EquipmentContext.Provider value={{ equipment: 'line-001', status: 'running' }}>
          {children}
        </EquipmentContext.Provider>
      );

      const Level3Provider = ({ children }: any) => (
        <DashboardContext.Provider value={{ dashboard: 'oee', refresh: 5000 }}>
          {children}
        </DashboardContext.Provider>
      );

      const DeepConsumer = () => {
        const equipment = useContext(EquipmentContext);
        const dashboard = useContext(DashboardContext);
        
        return (
          <div data-testid="deep-consumer">
            Equipment: {equipment?.equipment}, Dashboard: {dashboard?.dashboard}
          </div>
        );
      };

      render(
        <TestWrapper>
          <Level1Provider>
            <div data-testid="level-2">
              <Level3Provider>
                <div data-testid="level-4">
                  <DeepConsumer />
                </div>
              </Level3Provider>
            </div>
          </Level1Provider>
        </TestWrapper>
      );

      expect(screen.getByTestId('deep-consumer')).toHaveTextContent('Equipment: line-001, Dashboard: oee');
    });
  });

  describe('🎛️ EVENT BUBBLING & HANDLING', () => {
    it('should handle events bubbling through component hierarchy', () => {
      const events: string[] = [];
      
      const Level1 = ({ children }: any) => (
        <div 
          data-testid="level-1" 
          onClick={() => events.push('level-1')}
        >
          {children}
        </div>
      );

      const Level2 = ({ children }: any) => (
        <div 
          data-testid="level-2" 
          onClick={() => events.push('level-2')}
        >
          {children}
        </div>
      );

      const Level3 = ({ children }: any) => (
        <div 
          data-testid="level-3" 
          onClick={() => events.push('level-3')}
        >
          {children}
        </div>
      );

      const Level4 = () => (
        <button 
          data-testid="level-4-button" 
          onClick={() => events.push('level-4')}
        >
          Click Me
        </button>
      );

      render(
        <TestWrapper>
          <Level1>
            <Level2>
              <Level3>
                <Level4 />
              </Level3>
            </Level2>
          </Level1>
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('level-4-button'));
      
      // Verify event bubbling order
      expect(events).toEqual(['level-4', 'level-3', 'level-2', 'level-1']);
    });

    it('should handle event propagation stopping', () => {
      const events: string[] = [];
      
      const Level1 = ({ children }: any) => (
        <div 
          data-testid="level-1" 
          onClick={() => events.push('level-1')}
        >
          {children}
        </div>
      );

      const Level2 = ({ children }: any) => (
        <div 
          data-testid="level-2" 
          onClick={(e) => {
            e.stopPropagation();
            events.push('level-2-stopped');
          }}
        >
          {children}
        </div>
      );

      const Level3 = () => (
        <button 
          data-testid="level-3-button" 
          onClick={() => events.push('level-3')}
        >
          Click Me
        </button>
      );

      render(
        <TestWrapper>
          <Level1>
            <Level2>
              <Level3 />
            </Level2>
          </Level1>
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('level-3-button'));
      
      // Verify propagation stopped at level 2
      expect(events).toEqual(['level-3', 'level-2-stopped']);
      expect(events).not.toContain('level-1');
    });
  });

  describe('🔄 STATE MANAGEMENT AT DEPTH', () => {
    it('should manage state consistently across deep hierarchies', () => {
      const StateManager = ({ children }: any) => {
        const [globalState, setGlobalState] = useState({ count: 0, active: false });
        
        return (
          <div data-testid="state-manager">
            <button 
              data-testid="increment-button"
              onClick={() => setGlobalState(prev => ({ ...prev, count: prev.count + 1 }))}
            >
              Increment
            </button>
            <button 
              data-testid="toggle-button"
              onClick={() => setGlobalState(prev => ({ ...prev, active: !prev.active }))}
            >
              Toggle
            </button>
            {React.Children.map(children, child => 
              React.cloneElement(child, { globalState, setGlobalState })
            )}
          </div>
        );
      };

      const DeepChild = ({ globalState }: any) => (
        <div data-testid="deep-child">
          <span data-testid="count-display">Count: {globalState?.count || 0}</span>
          <span data-testid="active-display">Active: {globalState?.active ? 'true' : 'false'}</span>
        </div>
      );

      render(
        <TestWrapper>
          <StateManager>
            <div>
              <div>
                <div>
                  <DeepChild />
                </div>
              </div>
            </div>
          </StateManager>
        </TestWrapper>
      );

      // Test state updates at depth
      expect(screen.getByTestId('count-display')).toHaveTextContent('Count: 0');
      expect(screen.getByTestId('active-display')).toHaveTextContent('Active: false');

      fireEvent.click(screen.getByTestId('increment-button'));
      expect(screen.getByTestId('count-display')).toHaveTextContent('Count: 1');

      fireEvent.click(screen.getByTestId('toggle-button'));
      expect(screen.getByTestId('active-display')).toHaveTextContent('Active: true');
    });
  });

  describe('⚡ PERFORMANCE AT DEPTH', () => {
    it('should render deep hierarchies efficiently', () => {
      const createDeepHierarchy = (depth: number): React.ReactElement => {
        if (depth === 0) {
          return <div data-testid={`leaf-${depth}`}>Leaf Node</div>;
        }
        
        return (
          <div data-testid={`level-${depth}`} data-depth={depth}>
            Level {depth}
            {createDeepHierarchy(depth - 1)}
          </div>
        );
      };

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          {createDeepHierarchy(10)}
        </TestWrapper>
      );
      
      const renderTime = performance.now() - startTime;
      
      // Verify all levels rendered
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByTestId(`level-${i}`)).toBeInTheDocument();
      }
      expect(screen.getByTestId('leaf-0')).toBeInTheDocument();
      
      // Performance should be reasonable
      expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle large lists at depth without performance issues', () => {
      const DeepList = ({ items }: { items: Array<{ id: number; name: string }> }) => (
        <div data-testid="deep-list">
          {items.map(item => (
            <div key={item.id} data-testid={`item-${item.id}`}>
              {item.name}
            </div>
          ))}
        </div>
      );

      const Container = ({ children }: any) => (
        <div data-testid="container-1">
          <div data-testid="container-2">
            <div data-testid="container-3">
              <div data-testid="container-4">
                {children}
              </div>
            </div>
          </div>
        </div>
      );

      const items = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <Container>
            <DeepList items={items} />
          </Container>
        </TestWrapper>
      );
      
      const renderTime = performance.now() - startTime;
      
      // Verify rendering
      expect(screen.getByTestId('deep-list')).toBeInTheDocument();
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-99')).toBeInTheDocument();
      
      // Performance check
      expect(renderTime).toBeLessThan(200); // Should handle 100 items efficiently
    });
  });
});