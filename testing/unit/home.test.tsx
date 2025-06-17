import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../../src/app/page';

// Mock next/link
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ href, children }: { href: string; children: React.ReactNode }) => {
      return <a href={href}>{children}</a>;
    },
  };
});

describe('Home Page', () => {
  it('renders the hero heading', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { name: /manufacturing intelligence platform/i })
    ).toBeInTheDocument();
  });

  it('renders the key features section', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /key features/i })).toBeInTheDocument();
  });

  it('renders the call to action section', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { name: /ready to transform your manufacturing operations/i })
    ).toBeInTheDocument();
  });

  it('contains links to other pages', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: /explore dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.getByRole('link', { name: /try ai assistant/i })).toHaveAttribute(
      'href',
      '/manufacturing-chat'
    );
  });
});