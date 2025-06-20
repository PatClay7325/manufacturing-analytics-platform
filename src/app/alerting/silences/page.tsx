'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Volume2, 
  VolumeX, 
  Plus, 
  Edit2, 
  Trash2,
  Clock,
  User,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import Link from 'next/link';

interface Silence {
  id: string;
  matchers: Array<{ name: string; value: string; isRegex: boolean }>;
  startsAt: Date;
  endsAt: Date;
  createdBy: string;
  comment: string;
  status: 'active' | 'pending' | 'expired';
}

const mockSilences: Silence[] = [
  {
    id: '1',
    matchers: [
      { name: 'alertname', value: 'HighCPU', isRegex: false },
      { name: 'instance', value: 'server-01', isRegex: false }
    ],
    startsAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    endsAt: new Date(Date.now() + 1000 * 60 * 90), // 90 minutes from now
    createdBy: 'admin@manufacturing.com',
    comment: 'Scheduled maintenance on server-01',
    status: 'active'
  },
  {
    id: '2',
    matchers: [
      { name: 'team', value: 'platform', isRegex: false },
      { name: 'severity', value: 'warning', isRegex: false }
    ],
    startsAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4 hours from now
    createdBy: 'devops@manufacturing.com',
    comment: 'Deployment window for platform team',
    status: 'pending'
  },
  {
    id: '3',
    matchers: [
      { name: 'namespace', value: '.*-test', isRegex: true }
    ],
    startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
    endsAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    createdBy: 'qa@manufacturing.com',
    comment: 'Silenced test environment alerts',
    status: 'expired'
  }
];

export default function SilencesPage() {
  const [silences] = useState(mockSilences);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSilences = silences.filter(silence => {
    const matchesSearch = 
      silence.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      silence.createdBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      silence.matchers.some(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.value.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || silence.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const formatDuration = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTimeStatus = (silence: Silence) => {
    const now = new Date();
    if (silence.status === 'expired') {
      return `Expired ${formatRelativeTime(silence.endsAt)}`;
    } else if (silence.status === 'pending') {
      return `Starts ${formatRelativeTime(silence.startsAt)}`;
    } else {
      return `Ends ${formatRelativeTime(silence.endsAt)}`;
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const absDiff = Math.abs(diff);
    
    const minutes = Math.floor(absDiff / (1000 * 60));
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    
    let timeStr = '';
    if (days > 0) {
      timeStr = `${days}d`;
    } else if (hours > 0) {
      timeStr = `${hours}h`;
    } else {
      timeStr = `${minutes}m`;
    }
    
    return diff < 0 ? `${timeStr} ago` : `in ${timeStr}`;
  };

  return (
    <PageLayout
      title="Silences"
      description="Manage alert silences to temporarily mute notifications"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search silences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
            
            <Link
              href="/alerting/silences/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              New silence
            </Link>
          </div>
        </div>

        {/* Silences List */}
        <div className="space-y-4">
          {filteredSilences.map(silence => (
            <div
              key={silence.id}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Status and Duration */}
                  <div className="flex items-center space-x-3 mb-3">
                    {silence.status === 'active' ? (
                      <VolumeX className="h-5 w-5 text-red-500" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(silence.status)}`}>
                      {silence.status.charAt(0).toUpperCase() + silence.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getTimeStatus(silence)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-500">
                      Duration: {formatDuration(silence.startsAt, silence.endsAt)}
                    </span>
                  </div>

                  {/* Matchers */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {silence.matchers.map((matcher, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 dark:bg-gray-700"
                        >
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {matcher.name}
                          </span>
                          <span className="mx-1 text-gray-500">=</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {matcher.isRegex && '~'}"{matcher.value}"
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  {silence.comment && (
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      {silence.comment}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{silence.createdBy}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {silence.startsAt.toLocaleDateString()} {silence.startsAt.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {silence.endsAt.toLocaleDateString()} {silence.endsAt.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {silence.status !== 'expired' && (
                    <>
                      <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSilences.length === 0 && (
          <div className="text-center py-12">
            <VolumeX className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No silences found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating a new silence'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="mt-6">
                <Link
                  href="/alerting/silences/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New silence
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}