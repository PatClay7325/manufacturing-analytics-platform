import React from 'react';
import Link from 'next/link';
import { Alert, AlertSummary, AlertSeverity, AlertStatus } from '@/models/alert';
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

  // Get alert type icon
  const getAlertTypeIcon = () => {
    switch (alert.alertType) {
      case 'equipment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'production':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
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
      case 'network':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
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
            <AlertBadge type="severity" value={alert.severity as AlertSeverity} />
            <span className="text-xs text-gray-500">
              {getRelativeTime(alert.createdAt)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
            {alert.message.split(' - ')[0]}
          </h3>
          <div className="flex items-center text-xs text-gray-500">
            {getAlertTypeIcon()}
            <span className="ml-1">{alert.alertType}</span>
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
              {alert.message.split(' - ')[0]}
            </h3>
            <div className="flex items-center mb-3">
              <div className="flex items-center text-sm text-gray-500 mr-4">
                {getAlertTypeIcon()}
                <span className="ml-1">{alert.alertType}</span>
              </div>
              <span className="text-sm text-gray-500">
                {getRelativeTime(alert.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <AlertBadge type="severity" value={alert.severity as AlertSeverity} />
            <AlertBadge type="status" value={alert.status as AlertStatus} />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">{alert.message}</p>

        {alert.equipmentId && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Equipment:</span>{' '}
            <Link href={`/equipment/${alert.equipmentId}`} className="text-blue-600 hover:text-blue-800">
              {alert.equipmentId}
            </Link>
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