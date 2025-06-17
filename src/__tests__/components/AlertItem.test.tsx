import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { createAlert } from '@/test-utils/factories';

// Example Alert Item component
const AlertItem = ({ alert, onAcknowledge, onResolve }: any) => {
  const severityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const typeIcons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className="border rounded-lg p-4 mb-2" data-testid="alert-item">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeIcons[alert.type as keyof typeof typeIcons]}</span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                severityColors[alert.severity as keyof typeof severityColors]
              }`}
              data-testid="alert-severity"
            >
              {alert.severity}
            </span>
            <span className="text-xs text-gray-500" data-testid="alert-status">
              {alert.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-900" data-testid="alert-message">
            {alert.message}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Equipment: <span data-testid="alert-equipment">{alert.equipment}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500" data-testid="alert-timestamp">
            {new Date(alert.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {alert.status === 'active' && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Acknowledge
            </button>
          )}
          {alert.status === 'acknowledged' && (
            <button
              onClick={() => onResolve(alert.id)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

describe('AlertItem', () => {
  const mockHandlers = {
    onAcknowledge: vi.fn(),
    onResolve: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders alert information correctly', () => {
    const alert = createAlert();
    render(<AlertItem alert={alert} {...mockHandlers} />);

    expect(screen.getByTestId('alert-message')).toHaveTextContent(alert.message || '');
    expect(screen.getByTestId('alert-equipment')).toHaveTextContent(alert.equipment || '');
    expect(screen.getByTestId('alert-severity')).toHaveTextContent(alert.severity);
    expect(screen.getByTestId('alert-status')).toHaveTextContent(alert.status);
  });

  it('displays correct icon based on alert type', () => {
    const errorAlert = createAlert({ type: 'error' });
    const { rerender } = render(<AlertItem alert={errorAlert} {...mockHandlers} />);
    expect(screen.getByText('❌')).toBeInTheDocument();

    const warningAlert = createAlert({ type: 'warning' });
    rerender(<AlertItem alert={warningAlert} {...mockHandlers} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    const infoAlert = createAlert({ type: 'info' });
    rerender(<AlertItem alert={infoAlert} {...mockHandlers} />);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('applies correct severity styling', () => {
    const criticalAlert = createAlert({ severity: 'critical' });
    render(<AlertItem alert={criticalAlert} {...mockHandlers} />);
    
    const severityBadge = screen.getByTestId('alert-severity');
    expect(severityBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('shows acknowledge button for active alerts', () => {
    const activeAlert = createAlert({ status: 'active' });
    render(<AlertItem alert={activeAlert} {...mockHandlers} />);

    const acknowledgeButton = screen.getByRole('button', { name: 'Acknowledge' });
    expect(acknowledgeButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('shows resolve button for acknowledged alerts', () => {
    const acknowledgedAlert = createAlert({ status: 'acknowledged' });
    render(<AlertItem alert={acknowledgedAlert} {...mockHandlers} />);

    const resolveButton = screen.getByRole('button', { name: 'Resolve' });
    expect(resolveButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('hides action buttons for resolved alerts', () => {
    const resolvedAlert = createAlert({ status: 'resolved' });
    render(<AlertItem alert={resolvedAlert} {...mockHandlers} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onAcknowledge when acknowledge button is clicked', () => {
    const activeAlert = createAlert({ status: 'active' });
    render(<AlertItem alert={activeAlert} {...mockHandlers} />);

    const acknowledgeButton = screen.getByRole('button', { name: 'Acknowledge' });
    fireEvent.click(acknowledgeButton);

    expect(mockHandlers.onAcknowledge).toHaveBeenCalledWith(activeAlert.id);
    expect(mockHandlers.onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('calls onResolve when resolve button is clicked', () => {
    const acknowledgedAlert = createAlert({ status: 'acknowledged' });
    render(<AlertItem alert={acknowledgedAlert} {...mockHandlers} />);

    const resolveButton = screen.getByRole('button', { name: 'Resolve' });
    fireEvent.click(resolveButton);

    expect(mockHandlers.onResolve).toHaveBeenCalledWith(acknowledgedAlert.id);
    expect(mockHandlers.onResolve).toHaveBeenCalledTimes(1);
  });

  it('formats timestamp correctly', () => {
    const alert = createAlert({
      timestamp: '2024-01-15T10:30:00Z'
    });
    render(<AlertItem alert={alert} {...mockHandlers} />);

    const timestamp = screen.getByTestId('alert-timestamp');
    expect(timestamp.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});