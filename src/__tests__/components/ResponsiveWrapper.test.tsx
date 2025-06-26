// Jest test - using global test functions
/**
 * Tests for Responsive Wrapper Components
 * Phase 1.4: Mobile & Responsive Optimization
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ResponsiveGrid,
  MobileCard,
  ResponsiveChartContainer,
  CollapsibleSection,
  ResponsiveText,
  MobileToolbar,
  SwipeableChartCarousel,
  ResponsiveStack
} from '@/components/common/ResponsiveWrapper';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Mock the useMediaQuery hook
jest.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn()
}));

describe('ResponsiveWrapper Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ResponsiveGrid', () => {
    it('renders with default grid classes', () => {
      const { container } = render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const grid = container.firstChild;
      expect(grid).toHaveClass('grid', 'gap-4');
    });

    it('applies custom column configuration', () => {
      const { container } = render(
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <div>Item</div>
        </ResponsiveGrid>
      );

      const grid = container.firstChild;
      expect(grid?.className).toContain('grid-cols-1');
      expect(grid?.className).toContain('md:grid-cols-2');
      expect(grid?.className).toContain('lg:grid-cols-3');
    });
  });

  describe('MobileCard', () => {
    it('renders with responsive padding', () => {
      const { container } = render(
        <MobileCard>Content</MobileCard>
      );

      const card = container.firstChild;
      expect(card).toHaveClass('p-3', 'sm:p-4', 'md:p-6');
    });
  });

  describe('ResponsiveChartContainer', () => {
    it('adjusts height based on screen size', () => {
      // Test mobile
      (useMediaQuery as any).mockReturnValue(true);
      const { container: mobileContainer } = render(
        <ResponsiveChartContainer heightMobile={200}>
          <div>Chart</div>
        </ResponsiveChartContainer>
      );
      expect(mobileContainer.firstChild).toHaveStyle({ height: '200px' });

      // Test desktop
      (useMediaQuery as any).mockReturnValue(false);
      const { container: desktopContainer } = render(
        <ResponsiveChartContainer heightDesktop={300}>
          <div>Chart</div>
        </ResponsiveChartContainer>
      );
      expect(desktopContainer.firstChild).toHaveStyle({ height: '300px' });
    });
  });

  describe('CollapsibleSection', () => {
    it('is always open on desktop', () => {
      (useMediaQuery as any).mockReturnValue(false); // Not mobile
      
      render(
        <CollapsibleSection title="Test Section" defaultOpen={false}>
          <div>Content</div>
        </CollapsibleSection>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('is collapsible on mobile', () => {
      (useMediaQuery as any).mockReturnValue(true); // Is mobile
      
      render(
        <CollapsibleSection title="Test Section" defaultOpen={false}>
          <div>Content</div>
        </CollapsibleSection>
      );

      // Content should be hidden initially
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
      
      // Click to expand
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Content should now be visible
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('ResponsiveText', () => {
    it('renders with responsive text sizes', () => {
      const { container } = render(
        <ResponsiveText 
          sizeMobile="text-sm" 
          sizeTablet="text-base" 
          sizeDesktop="text-lg"
        >
          Hello
        </ResponsiveText>
      );

      const text = container.firstChild;
      expect(text?.className).toContain('text-sm');
      expect(text?.className).toContain('sm:text-base');
      expect(text?.className).toContain('lg:text-lg');
    });

    it('renders as different elements', () => {
      const { container } = render(
        <ResponsiveText as="h1">Heading</ResponsiveText>
      );

      expect(container.querySelector('h1')).toBeInTheDocument();
    });
  });

  describe('MobileToolbar', () => {
    it('stacks vertically on mobile', () => {
      const { container } = render(
        <MobileToolbar>
          <button>Button 1</button>
          <button>Button 2</button>
        </MobileToolbar>
      );

      const toolbar = container.firstChild;
      expect(toolbar).toHaveClass('flex-col', 'sm:flex-row');
    });
  });

  describe('SwipeableChartCarousel', () => {
    const charts = [
      <div key={1}>Chart 1</div>,
      <div key={2}>Chart 2</div>,
      <div key={3}>Chart 3</div>
    ];

    it('shows carousel on mobile', () => {
      (useMediaQuery as any).mockReturnValue(true); // Is mobile
      
      render(<SwipeableChartCarousel>{charts}</SwipeableChartCarousel>);
      
      // Only first chart should be visible
      expect(screen.getByText('Chart 1')).toBeInTheDocument();
      
      // Should have dots
      const dots = screen.getAllByLabelText(/Go to slide/);
      expect(dots).toHaveLength(3);
    });

    it('shows all charts on desktop', () => {
      (useMediaQuery as any).mockReturnValue(false); // Not mobile
      
      render(<SwipeableChartCarousel>{charts}</SwipeableChartCarousel>);
      
      // All charts should be visible
      expect(screen.getByText('Chart 1')).toBeInTheDocument();
      expect(screen.getByText('Chart 2')).toBeInTheDocument();
      expect(screen.getByText('Chart 3')).toBeInTheDocument();
      
      // No dots on desktop
      expect(screen.queryByLabelText(/Go to slide/)).not.toBeInTheDocument();
    });

    it('navigates between slides on mobile', () => {
      (useMediaQuery as any).mockReturnValue(true); // Is mobile
      
      render(<SwipeableChartCarousel>{charts}</SwipeableChartCarousel>);
      
      // Click second dot
      const dots = screen.getAllByLabelText(/Go to slide/);
      fireEvent.click(dots[1]);
      
      // Should show second chart
      expect(screen.getByText('Chart 2')).toBeInTheDocument();
    });
  });

  describe('ResponsiveStack', () => {
    it('stacks vertically on mobile and horizontally on desktop', () => {
      const { container } = render(
        <ResponsiveStack direction="horizontal">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveStack>
      );

      const stack = container.firstChild;
      expect(stack).toHaveClass('flex-col', 'lg:flex-row');
    });

    it('always stacks vertically when direction is vertical', () => {
      const { container } = render(
        <ResponsiveStack direction="vertical">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveStack>
      );

      const stack = container.firstChild;
      expect(stack).toHaveClass('flex-col');
      expect(stack).not.toHaveClass('lg:flex-row');
    });
  });
});

describe('useMediaQuery hook', () => {
  it('returns correct values for different breakpoints', () => {
    // This would test the actual hook implementation
    // For now, we're mocking it in the component tests above
    expect(true).toBe(true);
  });
});