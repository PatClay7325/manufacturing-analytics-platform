/**
 * Lazy Panel Component - Lazy loading wrapper for dashboard panels
 * Implements intersection observer for viewport-based loading
 */

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LazyPanelProps {
  children: ReactNode | (() => ReactNode);
  height: number;
  width?: number;
  placeholder?: ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
  className?: string;
  loadingClassName?: string;
  errorClassName?: string;
}

export function LazyPanel({
  children,
  height,
  width,
  placeholder,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px',
  disabled = false,
  className,
  loadingClassName,
  errorClassName,
}: LazyPanelProps) {
  const [isLoaded, setIsLoaded] = useState(disabled);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (disabled || !containerRef.current) {
      setIsLoaded(true);
      return;
    }

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [disabled, threshold, rootMargin, isInView]);

  useEffect(() => {
    if (isInView && !isLoaded && !error) {
      loadContent();
    }
  }, [isInView, isLoaded, error]);

  const loadContent = async () => {
    try {
      // Simulate async loading if children is a function
      if (typeof children === 'function') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setIsLoaded(true);
      onLoad?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load panel');
      setError(error);
      onError?.(error);
    }
  };

  const retry = () => {
    setError(null);
    setIsLoaded(false);
    loadContent();
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className={cn(
          'flex flex-col items-center justify-center h-full p-4 text-center',
          errorClassName
        )}>
          <p className="text-destructive mb-2">Failed to load panel</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <button
            onClick={retry}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!isLoaded) {
      return placeholder || (
        <div className={cn(
          'flex items-center justify-center h-full',
          loadingClassName
        )}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return typeof children === 'function' ? children() : children;
  };

  return (
    <div
      ref={containerRef}
      className={cn('lazy-panel', className)}
      style={{
        minHeight: height,
        width: width || '100%',
        contain: 'layout',
      }}
    >
      {renderContent()}
    </div>
  );
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options: Partial<LazyPanelProps> = {}
) {
  return React.forwardRef<any, P & Partial<LazyPanelProps>>((props, ref) => {
    const { height = 400, ...lazyProps } = options;
    const componentProps = props as P;

    return (
      <LazyPanel height={height} {...lazyProps}>
        {() => <Component {...componentProps} ref={ref} />}
      </LazyPanel>
    );
  });
}

// Batch lazy loading manager
export class LazyLoadManager {
  private observers: Map<string, IntersectionObserver> = new Map();
  private callbacks: Map<string, Set<() => void>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingCallbacks: Set<() => void> = new Set();

  observe(
    element: Element,
    callback: () => void,
    options: IntersectionObserverInit = {}
  ): () => void {
    const key = JSON.stringify(options);
    
    if (!this.observers.has(key)) {
      this.observers.set(key, new IntersectionObserver(
        this.handleIntersection.bind(this),
        options
      ));
      this.callbacks.set(key, new Set());
    }

    const observer = this.observers.get(key)!;
    const callbacks = this.callbacks.get(key)!;
    
    callbacks.add(callback);
    observer.observe(element);

    // Return cleanup function
    return () => {
      observer.unobserve(element);
      callbacks.delete(callback);
      
      if (callbacks.size === 0) {
        observer.disconnect();
        this.observers.delete(key);
        this.callbacks.delete(key);
      }
    };
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Find callbacks for this observer
        this.observers.forEach((observer, key) => {
          const callbacks = this.callbacks.get(key);
          if (callbacks) {
            callbacks.forEach(callback => {
              this.pendingCallbacks.add(callback);
            });
          }
        });

        this.scheduleBatch();
      }
    });
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
      this.batchTimeout = null;
    }, 16); // Next frame
  }

  private processBatch(): void {
    const callbacks = Array.from(this.pendingCallbacks);
    this.pendingCallbacks.clear();

    // Process callbacks in chunks to avoid blocking
    const chunkSize = 5;
    let index = 0;

    const processChunk = () => {
      const chunk = callbacks.slice(index, index + chunkSize);
      chunk.forEach(callback => callback());
      
      index += chunkSize;
      
      if (index < callbacks.length) {
        requestAnimationFrame(processChunk);
      }
    };

    processChunk();
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.callbacks.clear();
    this.pendingCallbacks.clear();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

export const lazyLoadManager = new LazyLoadManager();