import React from 'react';
import Link from 'next/link';
import { Alert, AlertSummary } from '@/models/alert';
import AlertBadge from './AlertBadge';
import { formatDistanceToNow } from 'date-fns';

interface AlertCardProps {
  alert: Alert | AlertSummary;
  className?: string;
  compact?: boolean;
}

export default function AlertCard({ alert, className = '', compact = false }: AlertCardProps) {
  // Format relative time (e.g., "2 hours ago")
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  };

  // Get source icon
  const getSourceIcon = () => {
    switch (alert.source) {
      case 'equipment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'process':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'quality':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'inventory':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'safety':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'system':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Render compact card
  if (compact) {
    return (
      <div 
        className={`bg-white shadow rounded-lg overflow-hidden ${className}`}
        data-testid="alert-card-compact"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertBadge type="severity" value={alert.severity} />
            <span className="text-xs text-gray-500">
              {getRelativeTime(alert.createdAt)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{alert.title}</h3>
          <div className="flex items-center text-xs text-gray-500">
            {getSourceIcon()}
            <span className="ml-1">{alert.sourceName || alert.source}</span>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <Link 
            href={`/alerts/${alert.id}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition"
          >
            View Details
          </Link>
        </div>
      </div>
    );
  }

  // Render standard card
  return (
    <div 
      className={`bg-white shadow rounded-lg overflow-hidden ${className}`}
      data-testid="alert-card"
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 
              className="text-lg font-medium text-gray-900 mb-1" 
              data-testid="alert-title"
            >
              {alert.title}
            </h3>
            <div className="flex items-center mb-3">
              <div className="flex items-center text-sm text-gray-500 mr-4">
                {getSourceIcon()}
                <span className="ml-1">{alert.sourceName || alert.source}</span>
              </div>
              <span className="text-sm text-gray-500">
                {getRelativeTime(alert.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <AlertBadge type="severity" value={alert.severity} />
            <AlertBadge type="status" value={alert.status} />
          </div>
        </div>

        {'description' in alert && (
          <p className="text-sm text-gray-600 mb-4">{alert.description}</p>
        )}

        {'tags' in alert && alert.tags && alert.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {alert.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
        <Link 
          href={`/alerts/${alert.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
        >
          View Details &rarr;
        </Link>
      </div>
    </div>
  );
}