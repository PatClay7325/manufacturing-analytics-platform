'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/models/alert';
import PageLayout from '@/components/layout/PageLayout';
import AlertBadge from '@/components/alerts/AlertBadge';
import AlertTimeline from '@/components/alerts/AlertTimeline';
import alertService from '@/services/alertService';
import { formatDistanceToNow } from 'date-fns';

export default function AlertDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchAlert = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService?.getAlertById(id);
        setAlert(data);
      } catch (err) {
        setError('Failed to load alert details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlert();
  }, [id]);

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  };

  // Get source icon
  const getSourceIcon = () => {
    if (!alert) return null;
    
    switch (alert?.source) {
      case 'equipment':
        return (
          <svg xmlns="http://www?.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'process':
        return (
          <svg xmlns="http://www?.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'quality':
        return (
          <svg xmlns="http://www?.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www?.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Handle acknowledge alert
  const handleAcknowledge = async () => {
    if (!alert) return;
    
    setSubmitting(true);
    
    try {
      const updatedAlert = await alertService?.acknowledgeAlert(
        alert?.id,
        'current-user', // In a real app, this would be the current user's ID
        'Current User', // In a real app, this would be the current user's name
        comment
      );
      
      if (updatedAlert) {
        setAlert(updatedAlert);
        setComment('');
      }
    } catch (err) {
      // Error is handled by not updating the alert state
    } finally {
      setSubmitting(false);
    }
  };

  // Handle resolve alert
  const handleResolve = async () => {
    if (!alert) return;
    
    setSubmitting(true);
    
    try {
      const updatedAlert = await alertService?.resolveAlert(
        alert?.id,
        'current-user', // In a real app, this would be the current user's ID
        'Current User', // In a real app, this would be the current user's name
        comment
      );
      
      if (updatedAlert) {
        setAlert(updatedAlert);
        setComment('');
      }
    } catch (err) {
      // Error is handled by not updating the alert state
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!alert || !comment?.trim()) return;
    
    setSubmitting(true);
    
    try {
      await alertService?.addAlertComment(
        alert?.id,
        'current-user', // In a real app, this would be the current user's ID
        'Current User', // In a real app, this would be the current user's name
        comment
      );
      
      setComment('');
      // Refresh timeline by re-fetching the alert
      const updatedAlert = await alertService?.getAlertById(id);
      if (updatedAlert) {
        setAlert(updatedAlert);
      }
    } catch (err) {
      // Error is handled by not clearing the comment
    } finally {
      setSubmitting(false);
    }
  };

  // Action buttons based on alert status
  const getActionButton = () => {
    if (!alert) return null;
    
    if (alert?.status === 'active') {
      return (
        <button
          onClick={handleAcknowledge}
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Acknowledge Alert
        </button>
      );
    }
    
    if (alert?.status === 'acknowledged') {
      return (
        <button
          onClick={handleResolve}
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          Resolve Alert
        </button>
      );
    }
    
    return null;
  };

  // Breadcrumbs for navigation
  const breadcrumbs = [
    { label: 'Alerts', href: '/alerts' },
    { label: alert.title || 'Alert Details', href: `/alerts/${id}` }
  ];

  if (loading) {
    return (
      <PageLayout 
        showBreadcrumbs={true} 
        breadcrumbs={breadcrumbs} 
        title="Alert Details"
      >
        <div className="flex justify-center items-center h-64">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="ml-2 text-gray-500">Loading alert details...</p>
        </div>
      </PageLayout>
    );
  }

  if (error || !alert) {
    return (
      <PageLayout 
        showBreadcrumbs={true} 
        breadcrumbs={breadcrumbs} 
        title="Alert Details"
      >
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error || 'Alert not found'}</p>
            </div>
          </div>
        </div>
        <Link 
          href="/alerts" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          &larr; Back to alerts
        </Link>
      </PageLayout>
    );
  }

  const updatedBreadcrumbs = [
    { label: 'Alerts', href: '/alerts' },
    { label: alert.title, href: `/alerts/${id}` }
  ];

  return (
    <PageLayout 
      title={alert?.title} 
      showBreadcrumbs={true}
      breadcrumbs={updatedBreadcrumbs}
      actionButton={getActionButton()}
    >
      <div className="mb-6 flex items-center space-x-4">
        <AlertBadge type="severity" value={alert?.severity} className="text-sm" />
        <AlertBadge type="status" value={alert?.status} className="text-sm" />
        <span className="text-gray-500">
          Created {getRelativeTime(alert?.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
            <p className="text-gray-700">{alert?.description}</p>
            
            {alert?.tags && alert?.tags.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {(alert?.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Comment</h3>
            <div className="mb-4">
              <textarea
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Add a comment or note..."
                value={comment}
                onChange={(e) => setComment(e?.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddComment}
                disabled={!comment?.trim() || submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Details</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Source</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <span className="mr-1">{getSourceIcon()}</span>
                  {alert?.sourceName || alert?.source}
                </dd>
              </div>
              
              {alert?.sourceId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Source ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link 
                      href={`/equipment/${alert?.sourceId}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {alert?.sourceId}
                    </Link>
                  </dd>
                </div>
              )}
              
              {alert?.category && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{alert?.category}</dd>
                </div>
              )}
              
              {alert?.dueBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Due By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(alert?.dueBy).toLocaleString()}
                  </dd>
                </div>
              )}
              
              {alert?.assignedTo && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                  <dd className="mt-1 text-sm text-gray-900">{alert?.assignedTo}</dd>
                </div>
              )}
            </dl>
          </div>

          <AlertTimeline alertId={alert?.id} />
        </div>
      </div>

      <div className="mt-8">
        <Link 
          href="/alerts" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          &larr; Back to alerts
        </Link>
      </div>
    </PageLayout>
  );
}