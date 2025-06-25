/**
 * Virtual Scroll Component - Efficient rendering of large lists
 * Implements windowing technique for performance optimization
 */

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  renderItem: (item: T, index: number) => ReactNode;
  height: number;
  width?: number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  estimatedItemHeight?: number;
  getItemKey?: (item: T, index: number) => string | number;
  horizontal?: boolean;
  scrollToIndex?: number;
  scrollToAlignment?: 'start' | 'center' | 'end' | 'auto';
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  renderItem,
  height,
  width,
  overscan = 3,
  className,
  onScroll,
  estimatedItemHeight = 50,
  getItemKey,
  horizontal = false,
  scrollToIndex,
  scrollToAlignment = 'auto',
}: VirtualScrollProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Cache for dynamic item sizes
  const itemSizeCache = useRef<Map<number, number>>(new Map());
  const measuredItemsRef = useRef<Set<number>>(new Set());
  
  // Calculate item metadata
  const getItemMetadata = useCallback((index: number): VirtualItem => {
    let start = 0;
    let size: number;

    if (typeof itemHeight === 'function') {
      // Dynamic height - use cache or estimate
      for (let i = 0; i < index; i++) {
        const cachedSize = itemSizeCache.current.get(i);
        start += cachedSize || estimatedItemHeight;
      }
      
      size = itemSizeCache.current.get(index) || itemHeight(index, items[index]) || estimatedItemHeight;
    } else {
      // Fixed height
      start = index * itemHeight;
      size = itemHeight;
    }

    return {
      index,
      start,
      size,
      end: start + size,
    };
  }, [items, itemHeight, estimatedItemHeight]);

  // Get total size
  const getTotalSize = useCallback((): number => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }

    let totalSize = 0;
    for (let i = 0; i < items.length; i++) {
      const cachedSize = itemSizeCache.current.get(i);
      totalSize += cachedSize || estimatedItemHeight;
    }
    return totalSize;
  }, [items.length, itemHeight, estimatedItemHeight]);

  // Find visible range
  const getVisibleRange = useCallback((): { start: number; end: number } => {
    const containerSize = horizontal ? width || 0 : height;
    const totalSize = getTotalSize();

    if (totalSize === 0 || containerSize === 0) {
      return { start: 0, end: 0 };
    }

    const start = scrollOffset;
    const end = scrollOffset + containerSize;

    // Binary search for start index
    let startIndex = 0;
    let endIndex = items.length - 1;

    while (startIndex < endIndex) {
      const middleIndex = Math.floor((startIndex + endIndex) / 2);
      const middle = getItemMetadata(middleIndex);

      if (middle.start === start) {
        startIndex = middleIndex;
        break;
      } else if (middle.start < start) {
        if (middle.end > start) {
          startIndex = middleIndex;
          break;
        }
        startIndex = middleIndex + 1;
      } else {
        endIndex = middleIndex - 1;
      }
    }

    // Find end index
    endIndex = startIndex;
    while (endIndex < items.length - 1) {
      const metadata = getItemMetadata(endIndex);
      if (metadata.end >= end) break;
      endIndex++;
    }

    // Apply overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(items.length - 1, endIndex + overscan);

    return { start: startIndex, end: endIndex };
  }, [items.length, scrollOffset, height, width, horizontal, overscan, getItemMetadata, getTotalSize]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const offset = horizontal ? target.scrollLeft : target.scrollTop;
    
    setScrollOffset(offset);
    setIsScrolling(true);
    
    onScroll?.(target.scrollTop, target.scrollLeft);

    // Debounce scrolling state
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [horizontal, onScroll]);

  // Measure item
  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (!element || measuredItemsRef.current.has(index)) return;

    const size = horizontal ? element.offsetWidth : element.offsetHeight;
    const cachedSize = itemSizeCache.current.get(index);
    
    if (size !== cachedSize) {
      itemSizeCache.current.set(index, size);
      measuredItemsRef.current.add(index);
      
      // Force re-render if size changed significantly
      if (!cachedSize || Math.abs(size - cachedSize) > 1) {
        setScrollOffset(prev => prev); // Trigger re-render
      }
    }
  }, [horizontal]);

  // Scroll to index
  useEffect(() => {
    if (scrollToIndex == null || !scrollRef.current) return;

    const metadata = getItemMetadata(scrollToIndex);
    const containerSize = horizontal ? width || 0 : height;
    let offset = metadata.start;

    switch (scrollToAlignment) {
      case 'center':
        offset = metadata.start - (containerSize - metadata.size) / 2;
        break;
      case 'end':
        offset = metadata.end - containerSize;
        break;
      case 'auto':
        // Keep current position if item is visible
        if (metadata.start >= scrollOffset && metadata.end <= scrollOffset + containerSize) {
          return;
        }
        // Otherwise, align to start
        break;
    }

    offset = Math.max(0, Math.min(offset, getTotalSize() - containerSize));

    if (horizontal) {
      scrollRef.current.scrollLeft = offset;
    } else {
      scrollRef.current.scrollTop = offset;
    }
  }, [scrollToIndex, scrollToAlignment, horizontal, height, width, getItemMetadata, getTotalSize, scrollOffset]);

  // Get visible items
  const { start, end } = getVisibleRange();
  const visibleItems: VirtualItem[] = [];
  
  for (let i = start; i <= end; i++) {
    visibleItems.push(getItemMetadata(i));
  }

  // Calculate spacers
  const startSpacer = start > 0 ? getItemMetadata(start).start : 0;
  const endSpacer = end < items.length - 1 
    ? getTotalSize() - getItemMetadata(end).end 
    : 0;

  return (
    <div
      ref={scrollRef}
      className={cn(
        'overflow-auto',
        horizontal ? 'overflow-y-hidden' : 'overflow-x-hidden',
        className
      )}
      style={{
        height: horizontal ? '100%' : height,
        width: horizontal ? width : '100%',
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          [horizontal ? 'width' : 'height']: getTotalSize(),
          [horizontal ? 'height' : 'width']: '100%',
          display: horizontal ? 'flex' : 'block',
        }}
      >
        {/* Start spacer */}
        {startSpacer > 0 && (
          <div
            style={{
              [horizontal ? 'width' : 'height']: startSpacer,
              [horizontal ? 'height' : 'width']: '100%',
              flexShrink: 0,
            }}
          />
        )}

        {/* Visible items */}
        {visibleItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = getItemKey ? getItemKey(item, virtualItem.index) : virtualItem.index;

          return (
            <div
              key={key}
              ref={(el) => {
                if (typeof itemHeight === 'function') {
                  measureItem(virtualItem.index, el);
                }
              }}
              style={{
                [horizontal ? 'width' : 'height']: virtualItem.size,
                [horizontal ? 'height' : 'width']: '100%',
                flexShrink: 0,
              }}
              className={cn(
                'virtual-item',
                isScrolling && 'is-scrolling'
              )}
              data-index={virtualItem.index}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}

        {/* End spacer */}
        {endSpacer > 0 && (
          <div
            style={{
              [horizontal ? 'width' : 'height']: endSpacer,
              [horizontal ? 'height' : 'width']: '100%',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}

// Hook for external control
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = React.useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    return items.reduce((acc, _, index) => acc + itemHeight(index), 0);
  }, [items, itemHeight]);

  const visibleRange = React.useMemo(() => {
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = 0;

    for (let i = 0; i < items.length; i++) {
      const height = typeof itemHeight === 'number' ? itemHeight : itemHeight(i);
      
      if (accumulatedHeight + height > scrollTop && startIndex === 0) {
        startIndex = Math.max(0, i - overscan);
      }
      
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      
      accumulatedHeight += height;
    }

    if (endIndex === 0) endIndex = items.length - 1;

    return { startIndex, endIndex };
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);

  const offsetY = React.useMemo(() => {
    if (typeof itemHeight === 'number') {
      return visibleRange.startIndex * itemHeight;
    }
    
    let offset = 0;
    for (let i = 0; i < visibleRange.startIndex; i++) {
      offset += itemHeight(i);
    }
    return offset;
  }, [visibleRange.startIndex, itemHeight]);

  return {
    scrollTop,
    setScrollTop,
    totalHeight,
    visibleRange,
    offsetY,
  };
}