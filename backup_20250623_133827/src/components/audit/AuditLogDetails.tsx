'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Calendar,
  User,
  Globe,
  Server,
  Clock,
  Database,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Copy,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogDetailsProps {
  logId: string;
  onClose: () => void;
}

interface AuditLogDetail {
  id: string;
  eventType: string;
  eventCategory: string;
  eventAction: string;
  eventStatus: string;
  eventSeverity: string;
  
  // Resource
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  previousValue?: any;
  newValue?: any;
  
  // User
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  apiKeyId?: string;
  
  // Request
  requestId?: string;
  requestMethod?: string;
  requestPath?: string;
  requestQuery?: any;
  requestBody?: any;
  
  // Client
  ipAddress?: string;
  userAgent?: string;
  clientId?: string;
  origin?: string;
  referer?: string;
  
  // Performance
  responseTime?: number;
  queryDuration?: number;
  totalDuration?: number;
  
  // Error
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  
  // Additional
  tags?: string[];
  metadata?: any;
  correlationId?: string;
  parentEventId?: string;
  dataClassification?: string;
  complianceFlags?: string[];
  securityContext?: any;
  
  timestamp: string;
  processedAt?: string;
  
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AuditLogDetails({ logId, onClose }: AuditLogDetailsProps) {
  const [log, setLog] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'request' | 'resource' | 'performance' | 'raw'>('overview');

  useEffect(() => {
    fetchLogDetails();
  }, [logId]);

  const fetchLogDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/audit-logs/${logId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit log details');
      }
      
      const data = await response.json();
      setLog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (error || !log) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Log not found'}</p>
          <Button onClick={onClose} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-2xl font-bold">Audit Log Details</h2>
          </div>
          <div className="flex items-center gap-2">
            {getSeverityIcon(log.eventSeverity)}
            <Badge
              className={
                log.eventStatus === 'success' 
                  ? 'bg-green-100 text-green-800'
                  : log.eventStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }
            >
              {log.eventStatus}
            </Badge>
          </div>
        </div>

        {/* Event Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">{log.eventAction}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium">{log.eventType}</span>
            </div>
            <div>
              <span className="text-gray-500">Category:</span>
              <span className="ml-2 font-medium">{log.eventCategory}</span>
            </div>
            <div>
              <span className="text-gray-500">Timestamp:</span>
              <span className="ml-2 font-medium">
                {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
              </span>
            </div>
            <div>
              <span className="text-gray-500">ID:</span>
              <span className="ml-2 font-mono text-xs">{log.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b">
          {(['overview', 'request', 'resource', 'performance', 'raw'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* User Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                User Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">User:</span>
                  <span className="ml-2">{log.userName || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2">{log.userEmail || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Role:</span>
                  <span className="ml-2">{log.userRole || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">User ID:</span>
                  <span className="ml-2 font-mono text-xs">{log.userId || '-'}</span>
                </div>
              </div>
            </div>

            {/* Session Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Session Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Session ID:</span>
                  <span className="ml-2 font-mono text-xs">{log.sessionId || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Request ID:</span>
                  <span className="ml-2 font-mono text-xs">{log.requestId || '-'}</span>
                </div>
                {log.correlationId && (
                  <div>
                    <span className="text-gray-500">Correlation ID:</span>
                    <span className="ml-2 font-mono text-xs">{log.correlationId}</span>
                  </div>
                )}
                {log.apiKeyId && (
                  <div>
                    <span className="text-gray-500">API Key:</span>
                    <span className="ml-2 font-mono text-xs">{log.apiKeyId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Client Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Client Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">IP Address:</span>
                  <span className="ml-2">{log.ipAddress || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">User Agent:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded font-mono text-xs break-all">
                    {log.userAgent || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags and Compliance */}
            {(log.tags?.length || log.complianceFlags?.length) && (
              <div>
                <h4 className="font-semibold mb-3">Tags & Compliance</h4>
                <div className="flex flex-wrap gap-2">
                  {log.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                  {log.complianceFlags?.map((flag) => (
                    <Badge key={flag} className="bg-blue-100 text-blue-800">{flag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'request' && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Request Details
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Method:</span>
                  <span className="ml-2 font-medium">{log.requestMethod || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Path:</span>
                  <span className="ml-2 font-mono text-xs">{log.requestPath || '-'}</span>
                </div>
              </div>
              
              {log.requestQuery && Object.keys(log.requestQuery).length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Query Parameters</h5>
                  <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(log.requestQuery, null, 2)}
                  </pre>
                </div>
              )}
              
              {log.requestBody && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Request Body</h5>
                  <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(log.requestBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resource' && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Resource Information
            </h4>
            {log.resourceType ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2">{log.resourceType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <span className="ml-2 font-mono text-xs">{log.resourceId || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2">{log.resourceName || '-'}</span>
                  </div>
                </div>
                
                {log.previousValue && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Previous Value</h5>
                    <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(log.previousValue, null, 2)}
                    </pre>
                  </div>
                )}
                
                {log.newValue && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">New Value</h5>
                    <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(log.newValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No resource information available</p>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Performance Metrics
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">
                  {log.responseTime || '-'}
                  {log.responseTime && <span className="text-sm font-normal">ms</span>}
                </div>
                <div className="text-sm text-gray-500">Response Time</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">
                  {log.queryDuration || '-'}
                  {log.queryDuration && <span className="text-sm font-normal">ms</span>}
                </div>
                <div className="text-sm text-gray-500">Query Duration</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">
                  {log.totalDuration || '-'}
                  {log.totalDuration && <span className="text-sm font-normal">ms</span>}
                </div>
                <div className="text-sm text-gray-500">Total Duration</div>
              </div>
            </div>
            
            {log.errorMessage && (
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2 text-red-600">Error Details</h5>
                <div className="p-3 bg-red-50 rounded">
                  <p className="text-sm text-red-800">{log.errorMessage}</p>
                  {log.errorCode && (
                    <p className="text-xs text-red-600 mt-1">Code: {log.errorCode}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Raw Log Data</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <pre className="p-4 bg-gray-50 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
}