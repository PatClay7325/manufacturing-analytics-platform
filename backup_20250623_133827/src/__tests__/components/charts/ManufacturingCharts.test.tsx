import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@/test-utils/index';
import {
  PieChart,
  HeatmapChart,
  TimeSeriesChart,
  TablePanel,
  GaugeChart
} from '@/components/charts/ManufacturingCharts';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Helper wrapper to provide dimensions for ResponsiveContainer
const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: '800px', height: '400px' }}>
    {children}
  </div>
);

describe('ManufacturingCharts Components - Error Handling', () => {
  describe('PieChart', () => {
    it('should handle undefined data prop', () => {
      render(<PieChart data={undefined} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle null data prop', () => {
      render(<PieChart data={null as any} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle non-array data prop', () => {
      render(<PieChart data={'invalid' as any} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render with valid data', () => {
      const data = [
        { name: 'Category A', value: 30 },
        { name: 'Category B', value: 70 }
      ];
      render(<PieChart data={data} />);
      // Should not show error message
      expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    });
  });

  describe('HeatmapChart', () => {
    it('should handle undefined data prop', () => {
      render(<HeatmapChart data={undefined} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle null data prop', () => {
      render(<HeatmapChart data={null as any} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle non-array data prop', () => {
      render(<HeatmapChart data={'invalid' as any} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render with valid data', () => {
      const data = [
        { value: 85, label: 'Cell 1' },
        { value: 92, label: 'Cell 2' }
      ];
      render(<HeatmapChart data={data} />);
      expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    });

    it('should handle data with missing properties', () => {
      const data = [
        { value: undefined, label: undefined },
        { value: null, label: null }
      ];
      render(<HeatmapChart data={data} />);
      // Should render with fallback values
      expect(screen.getAllByText('0')).toHaveLength(2);
    });
  });

  describe('TimeSeriesChart', () => {
    it('should handle undefined data prop', () => {
      const { container } = render(
        <ChartWrapper>
          <TimeSeriesChart data={undefined} />
        </ChartWrapper>
      );
      // Should not crash - chart should render
      expect(container.firstChild).toBeDefined();
    });

    it('should handle null data prop', () => {
      const { container } = render(
        <ChartWrapper>
          <TimeSeriesChart data={null as any} />
        </ChartWrapper>
      );
      expect(container.firstChild).toBeDefined();
    });

    it('should render with valid data', () => {
      const data = [
        { time: '2024-01-01', oee: 85, availability: 90 },
        { time: '2024-01-02', oee: 82, availability: 88 }
      ];
      const { container } = render(
        <ChartWrapper>
          <TimeSeriesChart data={data} />
        </ChartWrapper>
      );
      expect(container.firstChild).toBeDefined();
    });
  });

  describe('TablePanel', () => {
    it('should handle undefined data prop', () => {
      render(<TablePanel data={undefined} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle null data prop', () => {
      render(<TablePanel data={null as any} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle empty array', () => {
      render(<TablePanel data={[]} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle non-array data prop', () => {
      render(<TablePanel data={'invalid' as any} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render with valid data', () => {
      const data = [
        {
          equipment: 'Machine A',
          status: 'operational',
          mtbf: 120,
          mttr: 2.5,
          health: 95
        }
      ];
      render(<TablePanel data={data} />);
      expect(screen.getByText('Machine A')).toBeInTheDocument();
      expect(screen.getByText('operational')).toBeInTheDocument();
    });
  });

  describe('GaugeChart', () => {
    it('should handle missing required props gracefully', () => {
      // This should not crash even with missing props
      expect(() => {
        render(<GaugeChart value={undefined as any} title={undefined as any} />);
      }).not.toThrow();
    });

    it('should render with valid props', () => {
      render(<GaugeChart value={75} title="OEE" unit="%" />);
      expect(screen.getByText('OEE')).toBeInTheDocument();
      expect(screen.getByText('75.0')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('should handle edge case values', () => {
      render(<GaugeChart value={NaN} title="Test" />);
      // Should not crash with NaN value
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});