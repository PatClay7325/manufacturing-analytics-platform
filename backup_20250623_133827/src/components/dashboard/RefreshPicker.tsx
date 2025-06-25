'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Pause, Play, ChevronDown } from 'lucide-react';

interface RefreshOption {
  label: string;
  value: string;
  seconds?: number;
}

interface RefreshPickerProps {
  value: string;
  onChange: (interval: string) => void;
  onRefresh?: () => void;
  className?: string;
}

const refreshOptions: RefreshOption[] = [
  { label: 'Off', value: 'off' },
  { label: '5s', value: '5s', seconds: 5 },
  { label: '10s', value: '10s', seconds: 10 },
  { label: '30s', value: '30s', seconds: 30 },
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
  { label: '15m', value: '15m', seconds: 900 },
  { label: '30m', value: '30m', seconds: 1800 },
  { label: '1h', value: '1h', seconds: 3600 },
  { label: '2h', value: '2h', seconds: 7200 },
  { label: '1d', value: '1d', seconds: 86400 },
];

export function RefreshPicker({ value, onChange, onRefresh, className = '' }: RefreshPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if not off or paused
    if (value !== 'off' && !isPaused) {
      const option = refreshOptions.find(opt => opt.value === value);
      if (option?.seconds) {
        setTimeLeft(option.seconds);
        
        intervalRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev === null || prev <= 1) {
              if (onRefresh) onRefresh();
              return option.seconds;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      setTimeLeft(null);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [value, isPaused, onRefresh]);

  const handleSelect = (option: RefreshOption) => {
    onChange(option.value);
    setIsPaused(false);
    setIsOpen(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
      // Reset timer
      const option = refreshOptions.find(opt => opt.value === value);
      if (option?.seconds) {
        setTimeLeft(option.seconds);
      }
    }
  };

  const getDisplayText = () => {
    const option = refreshOptions.find(opt => opt.value === value);
    if (!option) return value;
    
    if (value === 'off') return 'Off';
    if (isPaused) return `${option.label} (paused)`;
    if (timeLeft !== null) {
      // Format time left
      if (timeLeft >= 3600) {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        return `${hours}h ${minutes}m`;
      } else if (timeLeft >= 60) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes}m ${seconds}s`;
      } else {
        return `${timeLeft}s`;
      }
    }
    return option.label;
  };

  return (
    <div className={`refresh-picker ${className}`} ref={dropdownRef}>
      <div className="flex items-center">
        {/* Manual refresh button */}
        <button
          onClick={handleManualRefresh}
          className="p-1.5 text-sm bg-white border border-gray-300 border-r-0 rounded-l hover:bg-gray-50 focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
          title="Refresh dashboard"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        
        {/* Play/Pause button */}
        {value !== 'off' && (
          <button
            onClick={togglePause}
            className="p-1.5 text-sm bg-white border border-gray-300 border-r-0 hover:bg-gray-50 focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
            title={isPaused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        )}
        
        {/* Dropdown button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700
            ${value !== 'off' ? 'rounded-r' : 'rounded-r'} 
            hover:border-gray-400 focus:outline-none focus:border-blue-500 transition-colors
            ${isOpen ? 'border-blue-500' : ''}
          `}
        >
          <span className="min-w-[60px] text-left">{getDisplayText()}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg">
          <div className="py-1">
            {refreshOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`
                  w-full px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors
                  ${value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          {/* Custom interval input */}
          <div className="border-t border-gray-200 p-2">
            <input
              type="text"
              placeholder="Custom interval (e.g., 45s)"
              className="w-full px-2 py-1 text-sm bg-white border border-gray-300 text-gray-900 rounded focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const customValue = (e.target as HTMLInputElement).value;
                  if (customValue) {
                    onChange(customValue);
                    setIsOpen(false);
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}