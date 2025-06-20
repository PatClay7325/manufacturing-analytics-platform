/**
 * Alert Rules List Page - Grafana-compatible alerting
 * /alerting/list route
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, AlertTriangle, Bell, BellOff, Edit, Trash2, Copy, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { TabNavigation } from '@/components/common/TabNavigation';
import { cn } from '@/lib/utils';

interface AlertRule {
  uid: string;
  title: string;
  folder: string;
  evaluation: string;
  query: string;
  condition: string;
  data: Array<{
    refId: string;
    model: any;
  }>;
  state: 'normal' | 'pending' | 'firing' | 'inactive' | 'alerting' | 'no_data' | 'error';
  health: 'ok' | 'error' | 'no_data';
  lastEvaluation?: string;
  lastEvaluationDuration?: number;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  for?: string;
  isPaused?: boolean;
}

export default function AlertRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlertRules();
  }, []);

  const fetchAlertRules = async () => {
    try {
      const response = await fetch('/api/alerts/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;

    try {
      const response = await fetch(`/api/alerts/rules/${uid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRules(rules.filter(rule => rule.uid !== uid));
      }
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
    }
  };

  const handlePauseRule = async (uid: string, pause: boolean) => {
    try {
      const response = await fetch(`/api/alerts/rules/${uid}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: pause }),
      });

      if (response.ok) {
        setRules(rules.map(rule => 
          rule.uid === uid ? { ...rule, isPaused: pause } : rule
        ));
      }
    } catch (error) {
      console.error('Failed to pause/unpause rule:', error);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'pause' | 'unpause') => {
    const selectedUids = Array.from(selectedRules);
    
    switch (action) {
      case 'delete':
        if (!confirm(`Delete ${selectedUids.length} rules?`)) return;
        for (const uid of selectedUids) {
          await handleDeleteRule(uid);
        }
        break;
      case 'pause':
      case 'unpause':
        for (const uid of selectedUids) {
          await handlePauseRule(uid, action === 'pause');
        }
        break;
    }
    
    setSelectedRules(new Set());
  };

  const filteredRules = rules.filter(rule => {
    if (searchTerm && !rule.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterState !== 'all' && rule.state !== filterState) {
      return false;
    }
    return true;
  });

  const alertingTabs = [
    { id: 'rules', label: 'Alert rules', href: '/alerting/list' },
    { id: 'contact', label: 'Contact points', href: '/alerting/notifications' },
    { id: 'policies', label: 'Notification policies', href: '/alerting/routes' },
    { id: 'silences', label: 'Silences', href: '/alerting/silences' },
    { id: 'groups', label: 'Alert groups', href: '/alerting/groups' },
    { id: 'admin', label: 'Admin', href: '/alerting/admin' },
  ];

  const getStateColor = (state: AlertRule['state']) => {
    switch (state) {
      case 'firing':
      case 'alerting':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'normal':
        return 'text-green-600 bg-green-50';
      case 'no_data':
        return 'text-gray-600 bg-gray-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getHealthIcon = (health: AlertRule['health']) => {
    switch (health) {
      case 'ok':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'no_data':
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  return (
    <PageLayout
      title="Alerting"
      description="Alert rules and notifications"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <TabNavigation tabs={alertingTabs} activeTab="rules" />

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search alert rules"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md"
              />
            </div>
            
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All states</option>
              <option value="firing">Firing</option>
              <option value="pending">Pending</option>
              <option value="normal">Normal</option>
              <option value="inactive">Inactive</option>
              <option value="no_data">No data</option>
              <option value="error">Error</option>
            </select>
          </div>

          <Link
            href="/alerting/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New alert rule
          </Link>
        </div>

        {/* Bulk actions */}
        {selectedRules.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-accent rounded-md">
            <span className="text-sm">{selectedRules.size} selected</span>
            <button
              onClick={() => handleBulkAction('pause')}
              className="px-3 py-1 text-sm border rounded hover:bg-background"
            >
              Pause
            </button>
            <button
              onClick={() => handleBulkAction('unpause')}
              className="px-3 py-1 text-sm border rounded hover:bg-background"
            >
              Unpause
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No alert rules found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first alert rule
            </p>
            <Link
              href="/alerting/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New alert rule
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRules.map((rule) => (
              <div
                key={rule.uid}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRules.has(rule.uid)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRules);
                        if (e.target.checked) {
                          newSelected.add(rule.uid);
                        } else {
                          newSelected.delete(rule.uid);
                        }
                        setSelectedRules(newSelected);
                      }}
                      className="mt-1"
                    />
                    
                    {getHealthIcon(rule.health)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/alerting/edit/${rule.uid}`}
                          className="font-medium hover:text-primary"
                        >
                          {rule.title}
                        </Link>
                        
                        {rule.isPaused && (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          getStateColor(rule.state)
                        )}>
                          {rule.state}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        <span>{rule.folder}</span>
                        <span className="mx-2">•</span>
                        <span>Evaluate every {rule.evaluation}</span>
                        {rule.for && (
                          <>
                            <span className="mx-2">•</span>
                            <span>For {rule.for}</span>
                          </>
                        )}
                      </div>
                      
                      {rule.annotations?.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {rule.annotations.description}
                        </p>
                      )}
                      
                      {rule.labels && Object.keys(rule.labels).length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {Object.entries(rule.labels).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePauseRule(rule.uid, !rule.isPaused)}
                      className="p-1 hover:bg-accent rounded"
                      title={rule.isPaused ? 'Resume' : 'Pause'}
                    >
                      {rule.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </button>
                    
                    <Link
                      href={`/alerting/edit/${rule.uid}`}
                      className="p-1 hover:bg-accent rounded"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    
                    <button
                      onClick={() => router.push(`/alerting/duplicate/${rule.uid}`)}
                      className="p-1 hover:bg-accent rounded"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteRule(rule.uid)}
                      className="p-1 hover:bg-accent rounded text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}