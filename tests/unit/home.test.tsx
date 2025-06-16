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
    expect(screen.getByText(/Manufacturing Analytics Platform/i)).toBeInTheDocument();
  });

  it('has navigation links to main sections', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /equipment/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manufacturing chat/i })).toBeInTheDocument();
  });
});
