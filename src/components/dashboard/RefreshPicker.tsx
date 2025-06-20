'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowPathIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';

interface RefreshPickerProps {
  value?: string | null;
  onChange?: (interval?: string | null) => void;
  isActive?: boolean;
  onToggle?: () => void;
}

const refreshIntervals = [
  { label: 'Off', value: null },
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' }
];

export default function RefreshPicker({
  value,
  onChange,
  isActive,
  onToggle
}: RefreshPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef?.current && !dropdownRef?.current.contains(event?.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentInterval = refreshIntervals?.find(interval => interval.value === value);

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      <button
        onClick={onToggle}
        className={`p-2 rounded hover:bg-gray-700 ${
          isActive ? 'text-green-400' : 'text-gray-400'
        }`}
        title={isActive ? 'Pause auto-refresh' : 'Start auto-refresh'}
      >
        {isActive ? (
          <PauseIcon className="w-5 h-5" />
        ) : (
          <PlayIcon className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-2 rounded hover:bg-gray-700 text-gray-300 text-sm"
      >
        <ArrowPathIcon className="w-4 h-4" />
        <span>{currentInterval?.label || 'Off'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 top-full right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[120px]">
          <div className="py-1">
            {refreshIntervals?.map((interval) => (
              <button
                key={interval?.value || 'off'}
                onClick={() => {
                  onChange(interval?.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2 text-sm hover:bg-gray-700
                  ${value === interval?.value
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300'
                  }
                `}
              >
                {interval?.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}