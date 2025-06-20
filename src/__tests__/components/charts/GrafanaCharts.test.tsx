import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import {
  PieChart,
  HeatmapChart,
  TimeSeriesChart,
  TablePanel,
  GaugeChart
} from '@/components/charts/ManufacturingCharts';

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
      render(<TimeSeriesChart data={undefined} />);
      // Should not crash - chart should render empty
      expect(document.querySelector('.recharts-wrapper')).toBeInTheDocument();
    });

    it('should handle null data prop', () => {
      render(<TimeSeriesChart data={null as any} />);
      expect(document.querySelector('.recharts-wrapper')).toBeInTheDocument();
    });

    it('should render with valid data', () => {
      const data = [
        { time: '2024-01-01', oee: 85, availability: 90 },
        { time: '2024-01-02', oee: 82, availability: 88 }
      ];
      render(<TimeSeriesChart data={data} />);
      expect(document.querySelector('.recharts-wrapper')).toBeInTheDocument();
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
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should handle edge case values', () => {
      render(<GaugeChart value={NaN} title="Test" />);
      // Should not crash with NaN value
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});