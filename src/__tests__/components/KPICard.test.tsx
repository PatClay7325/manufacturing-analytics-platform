// Jest test - using global test functions
import React from 'react';
import { render, screen } from '@/test-utils/index';
import { createKPI } from '@/test-utils/factories';

// Example KPI Card component
const KPICard = ({ name, value, unit, trend, change, target }: any) => {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  
  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="kpi-card">
      <h3 className="text-sm font-medium text-gray-500">{name}</h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">
          {value}{unit}
        </p>
        {change !== undefined && (
          <p className={`ml-2 flex items-baseline text-sm ${trendColor}`}>
            <span>{trendIcon}</span>
            <span className="ml-1">{Math.abs(change)}%</span>
          </p>
        )}
      </div>
      {target && (
        <p className="mt-1 text-sm text-gray-600">
          Target: {target}{unit}
        </p>
      )}
    </div>
  );
};

describe('KPICard', () => {
  it('renders KPI name and value', () => {
    const mockKPI = createKPI();
    render(<KPICard {...mockKPI} />);
    
    expect(screen.getByText(mockKPI.name)).toBeInTheDocument();
    expect(screen.getByText(`${mockKPI.value}${mockKPI.unit}`)).toBeInTheDocument();
  });

  it('displays upward trend correctly', () => {
    const mockKPI = createKPI({ trend: 'up', change: 5.2 });
    render(<KPICard {...mockKPI} />);
    
    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('5.2%')).toBeInTheDocument();
    expect(screen.getByText('↑').parentElement).toHaveClass('text-green-600');
  });

  it('displays downward trend correctly', () => {
    const mockKPI = createKPI({ trend: 'down', change: -3.1 });
    render(<KPICard {...mockKPI} />);
    
    expect(screen.getByText('↓')).toBeInTheDocument();
    expect(screen.getByText('3.1%')).toBeInTheDocument();
    expect(screen.getByText('↓').parentElement).toHaveClass('text-red-600');
  });

  it('displays neutral trend correctly', () => {
    const mockKPI = createKPI({ trend: 'neutral', change: 0 });
    render(<KPICard {...mockKPI} />);
    
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('→').parentElement).toHaveClass('text-gray-600');
  });

  it('shows target when provided', () => {
    const mockKPI = createKPI({ target: 95 });
    render(<KPICard {...mockKPI} />);
    
    expect(screen.getByText(`Target: ${mockKPI.target}${mockKPI.unit}`)).toBeInTheDocument();
  });

  it('hides target when not provided', () => {
    const mockKPI = createKPI({ target: undefined });
    render(<KPICard {...mockKPI} />);
    
    expect(screen.queryByText(/Target:/)).not.toBeInTheDocument();
  });

  it('handles missing change value', () => {
    const mockKPI = createKPI({ change: undefined, trend: undefined });
    render(<KPICard {...mockKPI} />);
    
    expect(screen.queryByText('↑')).not.toBeInTheDocument();
    expect(screen.queryByText('↓')).not.toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('applies correct data-testid', () => {
    const mockKPI = createKPI();
    const { container } = render(<KPICard {...mockKPI} />);
    
    expect(container.querySelector('[data-testid="kpi-card"]')).toBeInTheDocument();
  });
});