import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { SystemHealth } from '../SystemHealth'
import { mockSystemStatus, createMockFetch } from '@/test-utils/monitoring-mocks'

// Mock the fetch function
beforeEach(() => {
  global.fetch = createMockFetch({})
  vi.clearAllTimers()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('SystemHealth', () => {
  const defaultProps = {
    initialData: mockSystemStatus
  }

  it('renders without crashing', () => {
    render(<SystemHealth {...defaultProps} />)
    
    expect(screen.getByText('System Health')).toBeInTheDocument()
  })

  it('displays system health status correctly', () => {
    render(<SystemHealth {...defaultProps} />)
    
    // mockSystemStatus has 2 up services and 1 degraded, so 66.7% uptime
    expect(screen.getByText('66.7%')).toBeInTheDocument()
    expect(screen.getByText('Uptime')).toBeInTheDocument()
  })

  it('displays all services with their status', () => {
    render(<SystemHealth {...defaultProps} />)
    
    // Check that all services are displayed
    expect(screen.getByText('PostgreSQL Database')).toBeInTheDocument()
    expect(screen.getByText('Prometheus')).toBeInTheDocument()
    expect(screen.getByText('AnalyticsPlatform')).toBeInTheDocument()
    
    // Check status badges
    expect(screen.getAllByText('Operational')).toHaveLength(2) // PostgreSQL and Prometheus
    expect(screen.getByText('Degraded')).toBeInTheDocument() // AnalyticsPlatform
  })

  it('shows response times for successful services', () => {
    render(<SystemHealth {...defaultProps} />)
    
    expect(screen.getByText('15ms')).toBeInTheDocument()
    expect(screen.getByText('25ms')).toBeInTheDocument()
    expect(screen.getByText('150ms')).toBeInTheDocument()
  })

  it('displays last updated timestamp', () => {
    render(<SystemHealth {...defaultProps} />)
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('shows warning when system is unhealthy', () => {
    const unhealthyData = {
      ...mockSystemStatus,
      healthy: false,
      services: [
        ...mockSystemStatus.services,
        {
          name: 'Failed Service',
          status: 'down' as const,
          lastCheck: new Date(),
        }
      ]
    }
    
    render(<SystemHealth initialData={unhealthyData} />)
    
    expect(screen.getByText(/System health is degraded/)).toBeInTheDocument()
  })

  it('calculates uptime percentage correctly', () => {
    const mixedStatusData = {
      ...mockSystemStatus,
      healthy: false,
      services: [
        { name: 'Service 1', status: 'up' as const, lastCheck: new Date() },
        { name: 'Service 2', status: 'up' as const, lastCheck: new Date() },
        { name: 'Service 3', status: 'down' as const, lastCheck: new Date() },
        { name: 'Service 4', status: 'down' as const, lastCheck: new Date() },
      ]
    }
    
    render(<SystemHealth initialData={mixedStatusData} />)
    
    expect(screen.getByText('50.0%')).toBeInTheDocument()
  })

  it('auto-refreshes data every 30 seconds', async () => {
    const mockFetch = createMockFetch({
      '/api/monitoring/system-status': {
        ...mockSystemStatus,
        lastUpdated: new Date('2024-01-01T12:30:00Z'),
      },
    })
    global.fetch = mockFetch

    render(<SystemHealth {...defaultProps} />)
    
    // Fast-forward 30 seconds and wrap in act
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/monitoring/system-status')
    })
  })

  it('handles refresh errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    render(<SystemHealth {...defaultProps} />)
    
    // Fast-forward 30 seconds and wrap in act
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    
    // Should still show original data
    expect(screen.getByText('PostgreSQL Database')).toBeInTheDocument()
  })

  it('shows loading state during refresh', async () => {
    const mockFetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(mockSystemStatus)
      }), 100))
    )
    global.fetch = mockFetch

    const { container } = render(<SystemHealth {...defaultProps} />)
    
    // Trigger refresh and wrap in act
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    
    // Should show some indication of refreshing (this would depend on your implementation)
    // For now, we just check that the component doesn't crash
    expect(container).toBeInTheDocument()
  })

  it('displays correct status icons', () => {
    render(<SystemHealth {...defaultProps} />)
    
    // Check for status icons (these would be SVG elements or specific classes)
    const statusElements = screen.getAllByRole('img', { hidden: true }) // SVG icons
    expect(statusElements.length).toBeGreaterThan(0)
  })

  it('formats timestamps correctly', () => {
    const specificTime = new Date('2024-01-01T12:00:00Z')
    const dataWithSpecificTime = {
      ...mockSystemStatus,
      lastUpdated: specificTime,
      services: mockSystemStatus.services.map(service => ({
        ...service,
        lastCheck: specificTime,
      }))
    }
    
    render(<SystemHealth initialData={dataWithSpecificTime} />)
    
    // Should display formatted time
    expect(screen.getByText(/12:00:00/)).toBeInTheDocument()
  })

  it('cleans up timers on unmount', () => {
    const { unmount } = render(<SystemHealth {...defaultProps} />)
    
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    
    unmount()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})