'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, ChevronLeft, ChevronRight, PlayCircle, 
  CheckCircle, Circle, Lightbulb, SkipForward
} from 'lucide-react';
import { 
  Tutorial, 
  TutorialStep, 
  UserProgress,
  TooltipPosition 
} from '@/types/help';
import { createPortal } from 'react-dom';

interface TutorialSystemProps {
  tutorial: Tutorial;
  onComplete?: () => void;
  onSkip?: () => void;
  onProgress?: (stepIndex: number) => void;
  initialStep?: number;
}

export function TutorialSystem({
  tutorial,
  onComplete,
  onSkip,
  onProgress,
  initialStep = 0
}: TutorialSystemProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  const [isActive, setIsActive] = useState(true);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showHint, setShowHint] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = tutorial.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / tutorial.steps.length) * 100;

  useEffect(() => {
    if (isActive && currentStep?.targetElement) {
      highlightElement(currentStep.targetElement);
    } else {
      removeHighlight();
    }

    return () => {
      removeHighlight();
    };
  }, [currentStepIndex, isActive, currentStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      switch (e.key) {
        case 'Escape':
          handleSkip();
          break;
        case 'ArrowRight':
          if (currentStepIndex < tutorial.steps.length - 1) {
            handleNext();
          }
          break;
        case 'ArrowLeft':
          if (currentStepIndex > 0) {
            handlePrevious();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, tutorial.steps.length]);

  const highlightElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Tutorial: Element not found for selector "${selector}"`);
      return;
    }

    setHighlightedElement(element);
    
    // Add highlight class
    element.classList.add('tutorial-highlight');
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Calculate tooltip position
    if (tooltipRef.current) {
      calculateTooltipPosition(element);
    }

    // Add click listener if step has click action
    if (currentStep?.action?.type === 'click') {
      element.addEventListener('click', handleElementClick);
    }
  };

  const removeHighlight = () => {
    if (highlightedElement) {
      highlightedElement.classList.remove('tutorial-highlight');
      highlightedElement.removeEventListener('click', handleElementClick);
      setHighlightedElement(null);
    }
  };

  const calculateTooltipPosition = (element: HTMLElement) => {
    if (!tooltipRef.current) return;

    const elementRect = element.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let placement = currentStep?.position?.placement || 'auto';
    let top = 0;
    let left = 0;
    const gap = 16;

    // Auto placement logic
    if (placement === 'auto') {
      const spaceAbove = elementRect.top;
      const spaceBelow = viewportHeight - elementRect.bottom;
      const spaceLeft = elementRect.left;
      const spaceRight = viewportWidth - elementRect.right;

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

    switch (placement) {
      case 'top':
        top = elementRect.top - tooltipRect.height - gap;
        left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = elementRect.bottom + gap;
        left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
        left = elementRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
        left = elementRect.right + gap;
        break;
    }

    // Apply offset if provided
    if (currentStep?.position?.offset) {
      top += currentStep.position.offset.y;
      left += currentStep.position.offset.x;
    }

    // Ensure tooltip stays within viewport
    top = Math.max(gap, Math.min(top, viewportHeight - tooltipRect.height - gap));
    left = Math.max(gap, Math.min(left, viewportWidth - tooltipRect.width - gap));

    setTooltipPosition({ top, left });
  };

  const handleElementClick = () => {
    if (currentStep?.validation?.type === 'element-exists') {
      // Auto advance if click was the required action
      handleNext();
    }
  };

  const validateStep = async (): Promise<boolean> => {
    if (!currentStep?.validation) return true;

    const { type, target, expectedValue, customValidator } = currentStep.validation;

    switch (type) {
      case 'element-exists':
        return !!document.querySelector(target || currentStep.targetElement || '');
      
      case 'value-matches':
        if (!target) return false;
        const element = document.querySelector(target) as HTMLInputElement;
        return element?.value === expectedValue;
      
      case 'custom':
        return customValidator ? customValidator() : true;
      
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    
    if (!isValid) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
      return;
    }

    if (currentStepIndex < tutorial.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      onProgress?.(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      onProgress?.(prevIndex);
    }
  };

  const handleSkip = () => {
    if (currentStep?.skipAllowed !== false || window.confirm('Are you sure you want to skip this tutorial?')) {
      setIsActive(false);
      onSkip?.();
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    onComplete?.();
  };

  if (!isActive) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
        onClick={handleSkip}
      >
        {highlightedElement && (
          <div
            className="absolute bg-transparent"
            style={{
              top: highlightedElement.getBoundingClientRect().top - 4,
              left: highlightedElement.getBoundingClientRect().left - 4,
              width: highlightedElement.getBoundingClientRect().width + 8,
              height: highlightedElement.getBoundingClientRect().height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Tutorial Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 animate-in fade-in slide-in-from-top-2"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {currentStepIndex + 1} of {tutorial.steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {currentStep.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {currentStep.description}
        </p>

        {/* Hints */}
        {showHint && currentStep.hints && currentStep.hints.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start">
              <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {currentStep.hints[0]}
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {tutorial.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (index <= currentStepIndex) {
                  setCurrentStepIndex(index);
                  onProgress?.(index);
                }
              }}
              className="p-0.5"
            >
              {index < currentStepIndex ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : index === currentStepIndex ? (
                <Circle className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-current" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={`
              flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
              ${currentStepIndex === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {currentStep.skipAllowed !== false && (
              <button
                onClick={handleSkip}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Skip
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            >
              {currentStepIndex === tutorial.steps.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial highlight styles */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 41;
          outline: 3px solid #3b82f6;
          outline-offset: 4px;
          animation: tutorial-pulse 2s ease-in-out infinite;
        }

        @keyframes tutorial-pulse {
          0%, 100% {
            outline-color: #3b82f6;
          }
          50% {
            outline-color: #60a5fa;
          }
        }
      `}</style>
    </>,
    document.body
  );
}

// Tutorial launcher component
interface TutorialLauncherProps {
  tutorialId: string;
  children?: React.ReactNode;
  className?: string;
}

export function TutorialLauncher({ 
  tutorialId, 
  children,
  className = ''
}: TutorialLauncherProps) {
  const [showTutorial, setShowTutorial] = useState(false);

  // Sample tutorial data - in production, fetch from API or context
  const sampleTutorial: Tutorial = {
    id: 'create-first-dashboard',
    title: 'Create Your First Dashboard',
    description: 'Learn how to create and customize a dashboard',
    category: 'dashboards',
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        id: 'step-1',
        title: 'Open Dashboard Menu',
        description: 'Click on the Dashboards link in the navigation menu to get started.',
        targetElement: 'a[href="/dashboards"]',
        position: { placement: 'right' },
        action: { type: 'click' },
        validation: { type: 'element-exists', target: '.dashboard-list' }
      },
      {
        id: 'step-2',
        title: 'Create New Dashboard',
        description: 'Click the "New Dashboard" button to create a blank dashboard.',
        targetElement: 'button[data-testid="new-dashboard"]',
        position: { placement: 'bottom' },
        action: { type: 'click' },
        hints: ['Look for the blue button with a plus icon']
      },
      {
        id: 'step-3',
        title: 'Add Your First Panel',
        description: 'Click "Add Panel" to create your first visualization.',
        targetElement: 'button[data-testid="add-panel"]',
        position: { placement: 'bottom' },
        action: { type: 'click' }
      },
      {
        id: 'step-4',
        title: 'Configure Panel',
        description: 'Select a data source and configure your query to display data.',
        targetElement: '.panel-editor',
        position: { placement: 'left' },
        hints: ['Try selecting the "TestData" source for sample data']
      },
      {
        id: 'step-5',
        title: 'Save Dashboard',
        description: 'Click the save button to save your dashboard with a name.',
        targetElement: 'button[data-testid="save-dashboard"]',
        position: { placement: 'bottom' },
        action: { type: 'click' },
        skipAllowed: false
      }
    ]
  };

  return (
    <>
      <button
        onClick={() => setShowTutorial(true)}
        className={className}
      >
        {children || (
          <div className="flex items-center">
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Tutorial
          </div>
        )}
      </button>

      {showTutorial && (
        <TutorialSystem
          tutorial={sampleTutorial}
          onComplete={() => {
            setShowTutorial(false);
            console.log('Tutorial completed!');
          }}
          onSkip={() => {
            setShowTutorial(false);
            console.log('Tutorial skipped');
          }}
          onProgress={(step) => {
            console.log('Tutorial progress:', step);
          }}
        />
      )}
    </>
  );
}