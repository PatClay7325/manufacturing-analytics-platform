import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../../src/app/page';

// Mock next/link
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ href, children }: { href: string; children: React.ReactNode }) => {
      return <a href={href}>{children}</a>;
    },
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders the welcome message', () => {
    render(<HomePage />);
    expect(screen.getByText(/Adaptive Factory AI Solutions/i)).toBeInTheDocument();
  });

  it('has navigation links to main sections', () => {
    render(<HomePage />);
    // Use getAllByRole since there are multiple dashboard links
    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    
    // Check for specific equipment link
    expect(screen.getByRole('link', { name: /Monitor Equipment/i })).toBeInTheDocument();
    
    // Check for specific alerts link
    expect(screen.getByRole('link', { name: /View Alerts/i })).toBeInTheDocument();
    
    // Check for AI assistant link
    expect(screen.getByRole('link', { name: /Try AI Assistant/i })).toBeInTheDocument();
  });
});
