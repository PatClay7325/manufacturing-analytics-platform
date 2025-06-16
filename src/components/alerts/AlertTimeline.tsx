import React, { useState, useEffect } from 'react';
import { Alert, AlertResponse } from '@/models/alert';
import alertService from '@/services/alertService';
import { formatDistanceToNow } from 'date-fns';

interface AlertTimelineProps {
  alertId: string;
  className?: string;
}

export default function AlertTimeline({ alertId, className = '' }: AlertTimelineProps) {
  const [responses, setResponses] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResponses = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService.getAlertResponses(alertId);
        setResponses(data);
      } catch (err) {
        setError('Failed to load alert timeline.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResponses();
  }, [alertId]);

  // Function to format relative time
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  };

  // Function to get icon for response type
  const getResponseIcon = (type: string) => {
    switch (type) {
      case 'acknowledge':
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center ring-8 ring-white">
            <svg className="h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'resolve':
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
            <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'assign':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
            <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
          </div>
        );
      case 'escalate':
        return (
          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center ring-8 ring-white">
            <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      case 'comment':
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
            <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Alert Timeline</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Alert Timeline</h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Alert Timeline</h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>No activity recorded for this alert yet.</p>
        </div>
      </div>
    );
  }

  // Sort responses by timestamp (newest first)
  const sortedResponses = [...responses].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Alert Timeline</h3>
      </div>
      <div className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {sortedResponses.map((response, responseIdx) => (
              <li key={response.id}>
                <div className="relative pb-8">
                  {responseIdx !== sortedResponses.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      {getResponseIcon(response.type)}
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-900">
                          {response.type === 'acknowledge' && 'Acknowledged by '}
                          {response.type === 'resolve' && 'Resolved by '}
                          {response.type === 'assign' && 'Assigned to '}
                          {response.type === 'escalate' && 'Escalated by '}
                          {response.type === 'comment' && 'Comment from '}
                          <span className="font-medium">{response.userName}</span>
                          
                          {response.type === 'assign' && (
                            <span> to <span className="font-medium">{response.assignedTo}</span></span>
                          )}
                          
                          {response.type === 'escalate' && (
                            <span> to <span className="font-medium">{response.escalatedTo}</span></span>
                          )}
                        </p>
                        {response.comment && (
                          <p className="mt-1 text-sm text-gray-600">
                            {response.comment}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <time dateTime={response.timestamp}>{getRelativeTime(response.timestamp)}</time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}