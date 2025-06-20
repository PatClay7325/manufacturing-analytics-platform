'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId?: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  persistInUrl?: boolean;
  urlParamName?: string;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'default',
  size = 'md',
  fullWidth = false,
  persistInUrl = false,
  urlParamName = 'tab'
}: TabNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabClick = (tabId: string) => {
    if (tabs?.find(t => t?.id === tabId)?.disabled) return;
    
    onTabChange(tabId);
    
    if (persistInUrl) {
      const params = new URLSearchParams(searchParams);
      params?.set(urlParamName, tabId);
      router?.push(`?${params?.toString()}`, { scroll: false });
    }
  };

  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-3 px-6'
  };

  const baseTabClasses = `
    inline-flex items-center gap-2 font-medium transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
    ${sizeClasses[size]}
  `;

  const variantStyles = {
    default: {
      container: 'flex border-b border-gray-200',
      tab: `${baseTabClasses} border-b-2 -mb-px`,
      active: 'text-blue-600 border-blue-600',
      inactive: 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300',
      disabled: 'text-gray-300 cursor-not-allowed border-transparent'
    },
    pills: {
      container: 'flex gap-2 p-1 bg-gray-100 rounded-lg',
      tab: `${baseTabClasses} rounded-md`,
      active: 'bg-white text-blue-600 shadow-sm',
      inactive: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
      disabled: 'text-gray-400 cursor-not-allowed'
    },
    underline: {
      container: 'flex gap-6',
      tab: `${baseTabClasses} relative pb-4`,
      active: 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600',
      inactive: 'text-gray-600 hover:text-gray-900',
      disabled: 'text-gray-400 cursor-not-allowed'
    }
  };

  const styles = variantStyles[variant];

  return (
    <nav 
      className={`${styles?.container} ${fullWidth ? 'w-full' : ''} ${className}`}
      role="tablist"
      aria-label="Tab navigation"
    >
      {tabs?.map((tab) => {
        const isActive = activeTab === tab?.id;
        const isDisabled = tab?.disabled;
        
        return (
          <button
            key={tab?.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab?.id}`}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => handleTabClick(tab?.id)}
            className={`
              ${styles?.tab}
              ${isActive ? styles?.active : isDisabled ? styles?.disabled : styles.inactive}
              ${fullWidth ? 'flex-1 justify-center' : ''}
            `}
          >
            {tab?.icon && (
              <span className="flex-shrink-0">{tab?.icon}</span>
            )}
            <span>{tab?.label}</span>
            {tab?.badge !== undefined && (
              <span className={`
                ml-2 px-2 py-0.5 text-xs font-semibold rounded-full
                ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
              `}>
                {tab?.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}