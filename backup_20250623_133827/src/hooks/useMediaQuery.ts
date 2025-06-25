/**
 * Media Query Hook
 * For responsive design detection
 */

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Define listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        // Fallback for older browsers
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

// Predefined breakpoints matching Tailwind CSS
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

// Convenience hooks for common breakpoints
export function useIsMobile() {
  return !useMediaQuery(breakpoints.md);
}

export function useIsTablet() {
  const isAboveMobile = useMediaQuery(breakpoints.md);
  const isBelowDesktop = !useMediaQuery(breakpoints.lg);
  return isAboveMobile && isBelowDesktop;
}

export function useIsDesktop() {
  return useMediaQuery(breakpoints.lg);
}

// Get current breakpoint
export function useBreakpoint() {
  const is2xl = useMediaQuery(breakpoints['2xl']);
  const isXl = useMediaQuery(breakpoints.xl);
  const isLg = useMediaQuery(breakpoints.lg);
  const isMd = useMediaQuery(breakpoints.md);
  const isSm = useMediaQuery(breakpoints.sm);

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}