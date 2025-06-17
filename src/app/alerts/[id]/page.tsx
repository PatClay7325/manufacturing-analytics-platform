'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import alertService from '@/services/alertService';
import { Alert } from '@/models/alert';
import Link from 'next/link';

export default function AlertDetail() {
  const params = useParams();
  const id = params.id as string;
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const router = useRouter();
  
  useEffect(() => {
    const fetchAlert = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService.getAlertById(id);
        setAlert(data);
      } catch (err) {
        setError('Failed to load alert details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlert();
  }, [id]);
  
  // Handle acknowledge alert
  const handleAcknowledge = async () => {
    if (!alert) return;
    
    setUpdating(true);
    try {
      const result = await alertService.acknowledgeAlert(
        alert.id,
        'current-user', // In a real app, get this from auth context
        'Current User',
        comment || undefined
      );
      
      if (result) {
        setAlert(result);
        setComment('');
      }
    } catch (err) {
      setError('Failed to acknowledge alert. Please try again.');
    } finally {
      setUpdating(false);
    }
  };
  
  // Handle resolve alert
  const handleResolve = async () => {
    if (!alert) return;
    
    setUpdating(true);
    try {
      const result = await alertService.resolveAlert(
        alert.id,
        'current-user', // In a real app, get this from auth context
        'Current User',
        comment || undefined
      );
      
      if (result) {
        setAlert(result);
        setComment('');
      }
    } catch (err) {
      setError('Failed to resolve alert. Please try again.');
    } finally {
      setUpdating(false);
    }
  };
  
  // Get alert type icon based on alert type
  const getAlertTypeIcon = () => {
    if (!alert) return null;
    
    switch (alert.alertType) {
      case 'equipment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'production':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      case 'quality':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'inventory':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'safety':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'system':
      case 'network':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  // Get severity badge style
  const getSeverityBadge = () => {
    if (!alert) return null;
    
    let color = '';
    switch (alert.severity) {
      case 'critical':
        color = 'bg-red-100 text-red-800';
        break;
      case 'high':
        color = 'bg-orange-100 text-orange-800';
        break;
      case 'medium':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'low':
        color = 'bg-blue-100 text-blue-800';
        break;
      default:
        color = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {alert.severity}
      </span>
    );
  };
  
  // Get status badge style
  const getStatusBadge = () => {
    if (!alert) return null;
    
    let color = '';
    switch (alert.status) {
      case 'active':
        color = 'bg-red-100 text-red-800';
        break;
      case 'acknowledged':
        color = 'bg-blue-100 text-blue-800';
        break;
      case 'resolved':
        color = 'bg-green-100 text-green-800';
        break;
      default:
        color = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {alert.status}
      </span>
    );
  };
  
  // Breadcrumbs for navigation
  const breadcrumbs = [
    { label: 'Alerts', href: '/alerts' },
    { label: alert ? alert.message.split(' - ')[0] : 'Alert Details', href: `/alerts/${id}` }
  ];
  
  // Prepare action buttons
  const actionButton = (
    <div className="flex space-x-3">
      <button
        onClick={() => router.push('/alerts')}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Alerts
      </button>
    </div>
  );
  
  return (
    <PageLayout 
      title={alert ? `Alert: ${alert.message.split(' - ')[0]}` : 'Alert Details'} 
      actionButton={actionButton}
      showBreadcrumbs={true}
      breadcrumbs={breadcrumbs}
    >
      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-500">Loading alert details...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : alert ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Alert header */}
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                {getSeverityBadge()}
                {getStatusBadge()}
                <span className="text-xs text-gray-500">
                  Created {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {alert.status === 'active' && (
                  <button
                    onClick={handleAcknowledge}
                    disabled={updating}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Acknowledge'}
                  </button>
                )}
                {alert.status === 'acknowledged' && (
                  <button
                    onClick={handleResolve}
                    disabled={updating}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Alert details */}
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {alert.message.split(' - ')[0]}
            </h3>
            
            <div className="border-t border-gray-200 pt-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Details</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {alert.message}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Alert Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <span className="mr-1">{getAlertTypeIcon()}</span>
                    {alert.alertType}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Alert ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {alert.id}
                  </dd>
                </div>
                
                {alert.equipmentId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Equipment ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <Link href={`/equipment/${alert.equipmentId}`} className="text-blue-600 hover:text-blue-800">
                        {alert.equipmentId}
                      </Link>
                    </dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(alert.timestamp).toLocaleString()}
                  </dd>
                </div>
                
                {alert.acknowledgedBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Acknowledged By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {alert.acknowledgedBy}
                      {alert.acknowledgedAt && ` at ${new Date(alert.acknowledgedAt).toLocaleString()}`}
                    </dd>
                  </div>
                )}
                
                {alert.resolvedBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Resolved By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {alert.resolvedBy}
                      {alert.resolvedAt && ` at ${new Date(alert.resolvedAt).toLocaleString()}`}
                    </dd>
                  </div>
                )}
                
                {alert.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                      {alert.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          
          {/* Add comment section */}
          {alert.status !== 'resolved' && (
            <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Add Comment
              </h3>
              <div className="mt-1">
                <textarea
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Add a comment or notes about this alert..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={alert.status === 'active' ? handleAcknowledge : handleResolve}
                  disabled={updating}
                >
                  {updating ? 'Processing...' : alert.status === 'active' ? 'Acknowledge with Comment' : 'Resolve with Comment'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-8">
          <p className="text-gray-500">Alert not found</p>
        </div>
      )}
    </PageLayout>
  );
}