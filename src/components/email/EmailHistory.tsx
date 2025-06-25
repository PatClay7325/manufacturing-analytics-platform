'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface EmailHistoryItem {
  id: string;
  to: string[];
  from: string;
  subject: string;
  status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'unsubscribed';
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  error?: string;
  templateId?: string;
}

interface EmailHistoryProps {
  onRefresh?: () => void;
  filterEmail?: string;
}

export const EmailHistory: React.FC<EmailHistoryProps> = ({
  onRefresh,
  filterEmail = '',
}) => {
  const [history, setHistory] = useState<EmailHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });
  const [statistics, setStatistics] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchHistory();
  }, [filterEmail]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEmail) params.append('to', filterEmail);
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to_date', dateRange.to);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/email/history?${params}`);
      const data = await response.json();
      
      setHistory(data.history || []);
      setStatistics(data.statistics || {});
    } catch (error) {
      console.error('Failed to fetch email history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'bounced':
        return 'bg-orange-100 text-orange-800';
      case 'opened':
        return 'bg-green-100 text-green-800';
      case 'clicked':
        return 'bg-purple-100 text-purple-800';
      case 'unsubscribed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredHistory = history.filter(item => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.subject.toLowerCase().includes(search) ||
        item.to.some(email => email.toLowerCase().includes(search)) ||
        item.from.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(statistics).map(([status, count]) => (
          <Card key={status} className="p-4">
            <div className="text-sm text-gray-500 capitalize">{status}</div>
            <div className="text-2xl font-semibold">{count}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Input
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          
          <select
            className="p-2 border rounded"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>

          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            placeholder="From date"
          />

          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            placeholder="To date"
          />

          <Button onClick={fetchHistory}>Apply Filters</Button>
          
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </Card>

      {/* History Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Recipients
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Sent At
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading email history...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No emails found
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {item.to.slice(0, 2).join(', ')}
                        {item.to.length > 2 && (
                          <span className="text-gray-500">
                            {' '}+{item.to.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{item.subject}</div>
                      {item.templateId && (
                        <div className="text-xs text-gray-500">
                          Template: {item.templateId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      {item.error && (
                        <div className="text-xs text-red-600 mt-1">
                          {item.error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(item.sentAt), 'MMM d, yyyy h:mm a')}
                      {item.openedAt && (
                        <div className="text-xs text-green-600">
                          Opened: {format(new Date(item.openedAt), 'MMM d, h:mm a')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: View email details
                          console.log('View email:', item.id);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};