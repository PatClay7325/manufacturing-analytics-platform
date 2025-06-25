'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, ExternalLink, Book } from 'lucide-react';
import { ContextualHelp as ContextualHelpType, TooltipPosition } from '@/types/help';
import { createPortal } from 'react-dom';

interface ContextualHelpProps {
  help: ContextualHelpType;
  children?: React.ReactNode;
  position?: TooltipPosition;
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  className?: string;
}

export function ContextualHelp({
  help,
  children,
  position = { placement: 'auto' },
  trigger = 'hover',
  delay = 500,
  className = ''
}: ContextualHelpProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      calculatePosition();
    }
  }, [isVisible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        trigger === 'click' &&
        isVisible &&
        triggerRef.current &&
        tooltipRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, trigger]);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let placement = position.placement;
    
    // Auto placement logic
    if (placement === 'auto') {
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceLeft = triggerRect.left;
      const spaceRight = viewportWidth - triggerRect.right;

      if (spaceBelow >= tooltipRect.height && spaceBelow >= spaceAbove) {
        placement = 'bottom';
      } else if (spaceAbove >= tooltipRect.height) {
        placement = 'top';
      } else if (spaceRight >= tooltipRect.width && spaceRight >= spaceLeft) {
        placement = 'right';
      } else {
        placement = 'left';
      }
    }

    let top = 0;
    let left = 0;
    const gap = 8;

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // Apply offset if provided
    if (position.offset) {
      top += position.offset.y;
      left += position.offset.x;
    }

    // Ensure tooltip stays within viewport
    top = Math.max(gap, Math.min(top, viewportHeight - tooltipRect.height - gap));
    left = Math.max(gap, Math.min(left, viewportWidth - tooltipRect.width - gap));

    setTooltipPosition({ top, left });
  };

  const showTooltip = () => {
    if (trigger === 'hover' || trigger === 'focus') {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (trigger === 'hover' || trigger === 'focus') {
      setIsVisible(false);
    }
  };

  const toggleTooltip = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const triggerProps = {
    ...(trigger === 'hover' && {
      onMouseEnter: showTooltip,
      onMouseLeave: hideTooltip
    }),
    ...(trigger === 'click' && {
      onClick: toggleTooltip
    }),
    ...(trigger === 'focus' && {
      onFocus: showTooltip,
      onBlur: hideTooltip
    })
  };

  const tooltip = isVisible && createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-50 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-top-1"
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          {help.title}
        </h4>
        {trigger === 'click' && (
          <button
            onClick={() => setIsVisible(false)}
            className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {help.content}
      </p>

      {help.examples && help.examples.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
            Example:
          </p>
          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {help.examples[0].code || help.examples[0].description}
          </code>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs">
        {help.learnMoreUrl && (
          <a
            href={help.learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Learn more
          </a>
        )}
        {help.relatedTopics && help.relatedTopics.length > 0 && (
          <button className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            <Book className="h-3 w-3 mr-1" />
            Related topics ({help.relatedTopics.length})
          </button>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-flex items-center ${className}`}
        {...triggerProps}
      >
        {children || (
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>
      {tooltip}
    </>
  );
}

// Wrapper component for form fields with help
interface FormFieldHelpProps {
  label: string;
  help: ContextualHelpType;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}

export function FormFieldHelp({
  label,
  help,
  children,
  required = false,
  error
}: FormFieldHelpProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <ContextualHelp help={help} />
      </div>
      {children}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}