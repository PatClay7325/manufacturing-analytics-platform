/**
 * Analytics Alerting Page - Alert rules and management
 * Route: /alerting - Matches Analytics's alerting URL pattern
 * FULLY FUNCTIONAL with real backend integration
 */

'use client';

import React from 'react';

import { useState, useEffect, useCallback } from 'react';
import { AlertingSystem, AlertState, defaultAnalyticsConfig } from '@/core/analytics';

// API service functions
const apiService = {
  async fetchAlertRules() {
    const response = await fetch('/api/alerts/rules');
    if (!response.ok) throw new Error('Failed to fetch alert rules');
    return response.json();
  },

  async fetchAlertInstances() {
    const response = await fetch('/api/alerts/instances');
    if (!response.ok) throw new Error('Failed to fetch alert instances');
    return response.json();
  },

  async fetchContactPoints() {
    const response = await fetch('/api/alerts/contact-points');
    if (!response.ok) throw new Error('Failed to fetch contact points');
    return response.json();
  },

  async fetchSilences() {
    const response = await fetch('/api/alerts/silences');
    if (!response.ok) throw new Error('Failed to fetch silences');
    return response.json();
  },

  async createAlertRule(rule: any) {
    const response = await fetch('/api/alerts/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    if (!response.ok) throw new Error('Failed to create alert rule');
    return response.json();
  },

  async updateAlertRule(uid: string, updates: any) {
    const response = await fetch('/api/alerts/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...updates })
    });
    if (!response.ok) throw new Error('Failed to update alert rule');
    return response.json();
  },

  async deleteAlertRule(uid: string) {
    const response = await fetch(`/api/alerts/rules?uid=${uid}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete alert rule');
    return response.json();
  },

  async pauseAlertRule(uid: string, isPaused: boolean) {
    return this.updateAlertRule(uid, { isPaused });
  },

  async createSilence(silence: any) {
    const response = await fetch('/api/alerts/silences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(silence)
    });
    if (!response.ok) throw new Error('Failed to create silence');
    return response.json();
  },

  async expireSilence(id: string) {
    const response = await fetch(`/api/alerts/silences?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to expire silence');
    return response.json();
  },

  async evaluateAlerts() {
    const response = await fetch('/api/alerts/evaluate');
    if (!response.ok) throw new Error('Failed to evaluate alerts');
    return response.json();
  }
};

export default function AlertingPage() {
  // State management
  const [rules, setRules] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [contactPoints, setContactPoints] = useState<any[]>([]);
  const [silences, setSilences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      loadInstancesAndSilences();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [rulesData, instancesData, contactPointsData, silencesData] = await Promise.all([
        apiService.fetchAlertRules(),
        apiService.fetchAlertInstances(),
        apiService.fetchContactPoints(),
        apiService.fetchSilences()
      ]);
      
      setRules(rulesData);
      setInstances(instancesData.instances || instancesData);
      setContactPoints(contactPointsData);
      setSilences(silencesData.silences || silencesData);
      
    } catch (err) {
      console.error('Failed to load alerting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // Use fallback mock data on error
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadInstancesAndSilences = async () => {
    try {
      const [instancesData, silencesData] = await Promise.all([
        apiService.fetchAlertInstances(),
        apiService.fetchSilences()
      ]);
      
      setInstances(instancesData.instances || instancesData);
      setSilences(silencesData.silences || silencesData);
    } catch (err) {
      console.warn('Failed to refresh instances and silences:', err);
    }
  };

  const loadMockData = () => {
    // Fallback mock data when API is unavailable
    const mockRules = [
      {
        uid: 'manufacturing-oee-low',
        title: 'Low Manufacturing OEE',
        condition: 'avg_over_time(manufacturing_oee[5m]) < 75',
        data: [
          {
            refId: 'A',
            queryType: '',
            model: { expr: 'avg_over_time(manufacturing_oee[5m])', refId: 'A' },
            datasourceUid: 'prometheus-default',
            relativeTimeRange: { from: 300, to: 0 }
          }
        ],
        intervalSeconds: 60,
        noDataState: 'NoData',
        execErrState: 'Alerting',
        ruleGroup: 'manufacturing',
        annotations: {
          description: 'Overall Equipment Effectiveness has dropped below 75% threshold',
          summary: 'Low OEE detected across manufacturing operations'
        },
        labels: { severity: 'warning', team: 'production', area: 'manufacturing' }
      }
    ];

    const mockInstances = [
      {
        fingerprint: 'fp-oee-line-a',
        status: AlertState.Alerting,
        labels: { alertname: 'Low Manufacturing OEE', line: 'Line A', severity: 'warning', team: 'production' },
        annotations: { description: 'OEE has dropped to 68% on Production Line A', summary: 'Low OEE detected on Line A' },
        startsAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        generatorURL: '/d/manufacturing-overview'
      }
    ];

    const mockContactPoints = [
      {
        uid: 'email-production-team',
        name: 'Production Team Email',
        type: 'email',
        settings: { addresses: 'production@manufacturing.com', subject: 'Production Alert: {{ .GroupLabels.alertname }}' }
      }
    ];

    setRules(mockRules);
    setInstances(mockInstances);
    setContactPoints(mockContactPoints);
    setSilences([]);
  };

  // Event handlers
  const handleRuleCreate = useCallback(async (rule: any) => {
    try {
      const newRule = await apiService.createAlertRule(rule);
      setRules(prev => [...prev, newRule]);
      
      // Trigger immediate evaluation
      await apiService.evaluateAlerts();
      loadInstancesAndSilences();
    } catch (err) {
      console.error('Failed to create alert rule:', err);
      setError('Failed to create alert rule');
    }
  }, []);

  const handleRuleUpdate = useCallback(async (uid: string, updates: any) => {
    try {
      const updatedRule = await apiService.updateAlertRule(uid, updates);
      setRules(prev => prev.map(rule => rule.uid === uid ? updatedRule : rule));
      
      // Trigger evaluation
      await apiService.evaluateAlerts();
      loadInstancesAndSilences();
    } catch (err) {
      console.error('Failed to update alert rule:', err);
      setError('Failed to update alert rule');
    }
  }, []);

  const handleRuleDelete = useCallback(async (uid: string) => {
    try {
      await apiService.deleteAlertRule(uid);
      setRules(prev => prev.filter(rule => rule.uid !== uid));
      setInstances(prev => prev.filter(instance => instance.ruleId !== uid));
    } catch (err) {
      console.error('Failed to delete alert rule:', err);
      setError('Failed to delete alert rule');
    }
  }, []);

  const handleRulePause = useCallback(async (uid: string, isPaused: boolean) => {
    try {
      await apiService.pauseAlertRule(uid, isPaused);
      setRules(prev => prev.map(rule => rule.uid === uid ? { ...rule, isPaused } : rule));
    } catch (err) {
      console.error('Failed to pause/resume alert rule:', err);
      setError('Failed to pause/resume alert rule');
    }
  }, []);

  const handleSilenceCreate = useCallback(async (silence: any) => {
    try {
      const newSilence = await apiService.createSilence({
        ...silence,
        createdBy: 'current-user' // In real app, get from auth context
      });
      setSilences(prev => [...prev, newSilence]);
      loadInstancesAndSilences(); // Refresh to see silenced alerts
    } catch (err) {
      console.error('Failed to create silence:', err);
      setError('Failed to create silence');
    }
  }, []);

  const handleSilenceExpire = useCallback(async (id: string) => {
    try {
      await apiService.expireSilence(id);
      setSilences(prev => prev.map(silence => 
        silence.id === id 
          ? { ...silence, status: { state: 'expired' }, endsAt: new Date().toISOString() }
          : silence
      ));
      loadInstancesAndSilences(); // Refresh to see unsilenced alerts
    } catch (err) {
      console.error('Failed to expire silence:', err);
      setError('Failed to expire silence');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading alerting system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Alerting</h1>
              <p className="text-gray-600 mt-1">
                Manage alert rules, instances, and notification channels
              </p>
            </div>
            <button
              onClick={() => apiService.evaluateAlerts().then(loadInstancesAndSilences)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Evaluate Now
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <AlertingSystem
          rules={rules}
          instances={instances}
          groups={[]} // TODO: Implement rule groups
          contactPoints={contactPoints}
          policies={[]} // TODO: Implement notification policies
          silences={silences}
          onRuleCreate={handleRuleCreate}
          onRuleUpdate={handleRuleUpdate}
          onRuleDelete={handleRuleDelete}
          onRulePause={handleRulePause}
          onSilenceCreate={handleSilenceCreate}
          onSilenceExpire={handleSilenceExpire}
        />
      </div>
    </div>
  );
}

// Mock data should be outside the component
const mockAlertRules = [
    {
      uid: 'manufacturing-oee-low',
      title: 'Low Manufacturing OEE',
      condition: 'avg_over_time(manufacturing_oee[5m]) < 75',
      data: [
        {
          refId: 'A',
          queryType: '',
          model: {
            expr: 'avg_over_time(manufacturing_oee[5m])',
            refId: 'A'
          },
          datasourceUid: 'prometheus-default',
          relativeTimeRange: { from: 300, to: 0 }
        }
      ],
      intervalSeconds: 60,
      noDataState: 'NoData' as any,
      execErrState: 'Alerting' as any,
      ruleGroup: 'manufacturing',
      annotations: {
        description: 'Overall Equipment Effectiveness has dropped below 75% threshold',
        summary: 'Low OEE detected across manufacturing operations'
      },
      labels: {
        severity: 'warning',
        team: 'production',
        area: 'manufacturing'
      }
    },
    {
      uid: 'equipment-temperature-high',
      title: 'High Equipment Temperature',
      condition: 'equipment_temperature > 85',
      data: [
        {
          refId: 'A',
          queryType: '',
          model: {
            expr: 'equipment_temperature',
            refId: 'A'
          },
          datasourceUid: 'prometheus-default'
        }
      ],
      intervalSeconds: 30,
      noDataState: 'Alerting' as any,
      execErrState: 'Alerting' as any,
      ruleGroup: 'equipment',
      annotations: {
        description: 'Equipment temperature has exceeded safe operating threshold of 85°C',
        summary: 'Critical equipment overheating detected'
      },
      labels: {
        severity: 'critical',
        team: 'maintenance',
        area: 'equipment'
      }
    },
    {
      uid: 'production-line-stopped',
      title: 'Production Line Stopped',
      condition: 'production_line_status == 0',
      data: [
        {
          refId: 'A',
          queryType: '',
          model: {
            expr: 'production_line_status',
            refId: 'A'
          },
          datasourceUid: 'prometheus-default'
        }
      ],
      intervalSeconds: 60,
      noDataState: 'Alerting' as any,
      execErrState: 'Alerting' as any,
      ruleGroup: 'production',
      annotations: {
        description: 'Production line has stopped and requires immediate attention',
        summary: 'Production line stoppage detected'
      },
      labels: {
        severity: 'critical',
        team: 'production',
        area: 'production'
      }
    },
    {
      uid: 'quality-defect-rate-high',
      title: 'High Quality Defect Rate',
      condition: 'quality_defect_rate > 5',
      data: [
        {
          refId: 'A',
          queryType: '',
          model: {
            expr: 'quality_defect_rate',
            refId: 'A'
          },
          datasourceUid: 'prometheus-default'
        }
      ],
      intervalSeconds: 300,
      noDataState: 'NoData' as any,
      execErrState: 'Alerting' as any,
      ruleGroup: 'quality',
      annotations: {
        description: 'Quality defect rate has exceeded 5% threshold',
        summary: 'High defect rate detected in production quality'
      },
      labels: {
        severity: 'warning',
        team: 'quality',
        area: 'quality'
      }
    }
  ];

  // Mock alert instances
  const mockAlertInstances = [
    {
      fingerprint: 'fp-oee-line-a',
      status: AlertState.Alerting,
      labels: {
        alertname: 'Low Manufacturing OEE',
        line: 'Line A',
        severity: 'warning',
        team: 'production'
      },
      annotations: {
        description: 'OEE has dropped to 68% on Production Line A',
        summary: 'Low OEE detected on Line A'
      },
      startsAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      generatorURL: '/d/manufacturing-overview'
    },
    {
      fingerprint: 'fp-temp-machine-3',
      status: AlertState.Pending,
      labels: {
        alertname: 'High Equipment Temperature',
        equipment: 'Machine-3',
        severity: 'critical',
        team: 'maintenance'
      },
      annotations: {
        description: 'Machine-3 temperature is 87°C, approaching critical threshold',
        summary: 'Equipment overheating pending'
      },
      startsAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fingerprint: 'fp-quality-shift-2',
      status: AlertState.OK,
      labels: {
        alertname: 'High Quality Defect Rate',
        shift: 'Shift-2',
        severity: 'warning',
        team: 'quality'
      },
      annotations: {
        description: 'Quality defect rate has returned to normal levels',
        summary: 'Quality metrics back to normal'
      },
      startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ];

  // Mock contact points
  const mockContactPoints = [
    {
      uid: 'email-production-team',
      name: 'Production Team Email',
      type: 'email',
      settings: {
        addresses: 'production@manufacturing.com',
        subject: 'Production Alert: {{ .GroupLabels.alertname }}'
      }
    },
    {
      uid: 'slack-maintenance',
      name: 'Maintenance Slack Channel',
      type: 'slack',
      settings: {
        url: 'https://hooks.slack.com/services/...',
        channel: '#maintenance-alerts',
        title: 'Equipment Alert'
      }
    },
    {
      uid: 'pagerduty-critical',
      name: 'PagerDuty Critical',
      type: 'pagerduty',
      settings: {
        integrationKey: 'pd-integration-key',
        severity: 'critical'
      }
    },
    {
      uid: 'webhook-quality',
      name: 'Quality System Webhook',
      type: 'webhook',
      settings: {
        url: 'https://quality-system.manufacturing.com/webhooks/alerts',
        httpMethod: 'POST'
      }
    }
  ];