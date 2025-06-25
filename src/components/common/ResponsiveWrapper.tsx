/**
 * Responsive Wrapper Components
 * Implements Phase 1.4: Mobile & Responsive Optimization
 */

import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
  gap?: string;
  className?: string;
}

// Responsive grid with configurable breakpoints
export function ResponsiveGrid({ 
  children, 
  cols = { mobile: 1, tablet: 2, desktop: 3, wide: 4 },
  gap = 'gap-4',
  className = ''
}: ResponsiveGridProps) {
  const gridCols = `
    grid-cols-${cols.mobile || 1}
    sm:grid-cols-${cols.mobile || 1}
    md:grid-cols-${cols.tablet || 2}
    lg:grid-cols-${cols.desktop || 3}
    xl:grid-cols-${cols.wide || 4}
  `;

  return (
    <div className={`grid ${gridCols} ${gap} ${className}`}>
      {children}
    </div>
  );
}

// Mobile-optimized card container
export function MobileCard({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`
      bg-white dark:bg-gray-800 
      rounded-lg shadow-sm
      p-3 sm:p-4 md:p-6
      ${className}
    `}>
      {children}
    </div>
  );
}

// Responsive chart container that adjusts height
export function ResponsiveChartContainer({ 
  children,
  heightMobile = 200,
  heightTablet = 250,
  heightDesktop = 300,
  className = ''
}: {
  children: React.ReactNode;
  heightMobile?: number;
  heightTablet?: number;
  heightDesktop?: number;
  className?: string;
}) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  const height = isMobile ? heightMobile : isTablet ? heightTablet : heightDesktop;

  return (
    <div 
      className={`relative ${className}`} 
      style={{ height }}
    >
      {children}
    </div>
  );
}

// Collapsible section for mobile
export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className = ''
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Always open on desktop
  if (!isMobile) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left mb-4"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <svg
          className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="animate-in slide-in-from-top-2">
          {children}
        </div>
      )}
    </div>
  );
}

// Responsive text that adjusts size
export function ResponsiveText({
  children,
  as: Component = 'p',
  sizeMobile = 'text-sm',
  sizeTablet = 'text-base',
  sizeDesktop = 'text-lg',
  className = ''
}: {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  sizeMobile?: string;
  sizeTablet?: string;
  sizeDesktop?: string;
  className?: string;
}) {
  return (
    <Component className={`
      ${sizeMobile}
      sm:${sizeTablet}
      lg:${sizeDesktop}
      ${className}
    `}>
      {children}
    </Component>
  );
}

// Mobile-friendly toolbar
export function MobileToolbar({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`
      flex flex-col sm:flex-row
      gap-2 sm:gap-4
      items-stretch sm:items-center
      ${className}
    `}>
      {children}
    </div>
  );
}

// Swipeable carousel for mobile charts
export function SwipeableChartCarousel({
  children,
  className = ''
}: {
  children: React.ReactNode[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (!isMobile || !Array.isArray(children)) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {children.map((child, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>
      
      {/* Dots indicator */}
      <div className="flex justify-center mt-4 gap-2">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === activeIndex ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// Stack on mobile, side-by-side on desktop
export function ResponsiveStack({
  children,
  direction = 'horizontal',
  className = ''
}: {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}) {
  const directionClasses = direction === 'horizontal' 
    ? 'flex-col lg:flex-row'
    : 'flex-col';

  return (
    <div className={`flex ${directionClasses} gap-4 ${className}`}>
      {children}
    </div>
  );
}