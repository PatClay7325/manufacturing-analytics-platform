/**
 * Complete Analytics System Demo Page
 * Demonstrates full Analytics functionality integration
 */

'use client';

import React from 'react';

import { useState } from 'react';
import { 
  AnalyticsPlatform, 
  createManufacturingDashboard,
  defaultAnalyticsConfig,
  type DashboardSceneState,
  type AlertRule,
  type AlertInstance,
  type ContactPoint,
  type Variable,
  type QueryTarget,
  type PanelData,
  VariableType,
  AlertState
} from '@/core/analytics';

// Mock data for demonstration
const mockDashboard = createManufacturingDashboard({
  title: 'Manufacturing Operations Dashboard',
  dataSources: defaultAnalyticsConfig.dataSources,
  variables: [
    ...defaultAnalyticsConfig.variables,
    {
      name: 'line',
      type: VariableType.Custom,
      label: 'Production Line',
      query: 'Line A, Line B, Line C, Line D',
      multi: false,
      includeAll: false,
      current: { text: 'Line A', value: 'line_a' },
      options: [
        { text: 'Line A', value: 'line_a', selected: true },
        { text: 'Line B', value: 'line_b' },
        { text: 'Line C', value: 'line_c' },
        { text: 'Line D', value: 'line_d' }
      ]
    },
    {
      name: 'timeInterval',
      type: VariableType.Interval,
      label: 'Interval',
      query: '1m,5m,10m,30m,1h',
      current: { text: '5m', value: '5m' },
      options: [
        { text: '1m', value: '1m' },
        { text: '5m', value: '5m', selected: true },
        { text: '10m', value: '10m' },
        { text: '30m', value: '30m' },
        { text: '1h', value: '1h' }
      ]
    }
  ],
  timeRange: { from: 'now-6h', to: 'now' }
});

// Add sample panels to the dashboard
mockDashboard.panels = [
  {
    id: 'oee-trend',
    title: 'OEE Trend',
    type: 'timeseries',
    gridPos: { x: 0, y: 0, w: 12, h: 8 },
    targets: [
      {
        refId: 'A',
        expr: 'avg_over_time(manufacturing_oee{line="$line"}[5m])',
        datasource: { type: 'prometheus', uid: 'prometheus-default' }
      }
    ],
    fieldConfig: {
      defaults: {
        unit: 'percent',
        min: 0,
        max: 100,
        color: { mode: 'palette-classic' }
      },
      overrides: []
    },
    options: {
      tooltip: { mode: 'Single' },
      legend: { displayMode: 'Table', placement: 'bottom' }
    }
  },
  {
    id: 'production-count',
    title: 'Production Count',
    type: 'stat',
    gridPos: { x: 12, y: 0, w: 6, h: 4 },
    targets: [
      {
        refId: 'A',
        expr: 'sum(manufacturing_production_count{line="$line"})',
        datasource: { type: 'prometheus', uid: 'prometheus-default' }
      }
    ],
    fieldConfig: {
      defaults: {
        unit: 'short',
        color: { mode: 'value' }
      },
      overrides: []
    },
    options: {
      colorMode: 'background',
      graphMode: 'area',
      justifyMode: 'center'
    }
  },
  {
    id: 'quality-rate',
    title: 'Quality Rate',
    type: 'gauge',
    gridPos: { x: 18, y: 0, w: 6, h: 4 },
    targets: [
      {
        refId: 'A',
        expr: 'avg(manufacturing_quality_rate{line="$line"})',
        datasource: { type: 'prometheus', uid: 'prometheus-default' }
      }
    ],
    fieldConfig: {
      defaults: {
        unit: 'percent',
        min: 0,
        max: 100,
        thresholds: {
          steps: [
            { color: 'red', value: 0 },
            { color: 'yellow', value: 80 },
            { color: 'green', value: 95 }
          ]
        }
      },
      overrides: []
    },
    options: {
      showThresholdLabels: true,
      showThresholdMarkers: true
    }
  },
  {
    id: 'downtime-reasons',
    title: 'Downtime Reasons',
    type: 'piechart',
    gridPos: { x: 12, y: 4, w: 12, h: 4 },
    targets: [
      {
        refId: 'A',
        expr: 'sum by (reason) (manufacturing_downtime_minutes{line="$line"})',
        datasource: { type: 'prometheus', uid: 'prometheus-default' }
      }
    ],
    fieldConfig: {
      defaults: {
        unit: 'minutes'
      },
      overrides: []
    },
    options: {
      pieType: 'donut',
      tooltip: { mode: 'Single' },
      legend: { displayMode: 'Table', placement: 'right' }
    }
  },
  {
    id: 'equipment-status',
    title: 'Equipment Status',
    type: 'table',
    gridPos: { x: 0, y: 8, w: 24, h: 8 },
    targets: [
      {
        refId: 'A',
        expr: 'manufacturing_equipment_status{line="$line"}',
        datasource: { type: 'prometheus', uid: 'prometheus-default' },
        format: 'table'
      }
    ],
    fieldConfig: {
      defaults: {},
      overrides: [
        {
          matcher: { id: 'byName', options: 'Status' },
          properties: [
            {
              id: 'custom.displayMode',
              value: 'color-background'
            },
            {
              id: 'color',
              value: { mode: 'thresholds' }
            },
            {
              id: 'thresholds',
              value: {
                steps: [
                  { color: 'red', value: 0 },
                  { color: 'yellow', value: 1 },
                  { color: 'green', value: 2 }
                ]
              }
            }
          ]
        }
      ]
    },
    options: {
      showHeader: true,
      showTypeIcons: true
    }
  }
];

// Mock alert rules
const mockAlertRules: AlertRule[] = [
  {
    uid: 'oee-low-alert',
    title: 'Low OEE Alert',
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
      description: 'OEE has dropped below 75% threshold',
      summary: 'Low OEE detected on production line'
    },
    labels: {
      severity: 'warning',
      team: 'production'
    }
  },
  {
    uid: 'equipment-down-alert',
    title: 'Equipment Down Alert',
    condition: 'manufacturing_equipment_status == 0',
    data: [
      {
        refId: 'A',
        queryType: '',
        model: {
          expr: 'manufacturing_equipment_status',
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
      description: 'Critical equipment is down and requires immediate attention',
      summary: 'Equipment failure detected'
    },
    labels: {
      severity: 'critical',
      team: 'maintenance'
    }
  }
];

// Mock alert instances
const mockAlertInstances: AlertInstance[] = [
  {
    fingerprint: 'fp1',
    status: AlertState.Alerting,
    labels: {
      alertname: 'Low OEE Alert',
      line: 'Line A',
      severity: 'warning'
    },
    annotations: {
      description: 'OEE has dropped to 68% on Line A',
      summary: 'Low OEE detected'
    },
    startsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    generatorURL: '/dashboard/manufacturing'
  },
  {
    fingerprint: 'fp2',
    status: AlertState.Pending,
    labels: {
      alertname: 'Equipment Down Alert',
      equipment: 'Conveyor Belt 3',
      severity: 'critical'
    },
    annotations: {
      description: 'Conveyor Belt 3 status shows as down',
      summary: 'Equipment failure pending'
    },
    startsAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock contact points
const mockContactPoints: ContactPoint[] = [
  {
    uid: 'email-production',
    name: 'Production Team Email',
    type: 'email',
    settings: {
      addresses: 'production@company.com',
      subject: 'Production Alert: {{ .GroupLabels.alertname }}'
    }
  },
  {
    uid: 'slack-maintenance',
    name: 'Maintenance Slack',
    type: 'slack',
    settings: {
      url: 'https://hooks.slack.com/services/...',
      channel: '#maintenance-alerts',
      title: 'Maintenance Alert'
    }
  }
];

export default function AnalyticsDemoPage() {
  const [dashboard, setDashboard] = useState<DashboardSceneState>(mockDashboard);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(mockAlertRules);
  const [variables, setVariables] = useState<Variable[]>(mockDashboard.variables || []);

  // Mock data query handler
  const handleDataQuery = async (targets: QueryTarget[]): Promise<PanelData> => {
    // Simulate data fetching delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock time series data
    const now = Date.now();
    const timePoints = Array.from({ length: 100 }, (_, i) => now - (99 - i) * 60000);
    
    return {
      series: targets.map((target, index) => ({
        name: `Series ${target.refId}`,
        fields: [
          {
            name: 'time',
            type: 'time' as any,
            values: timePoints,
            config: {}
          },
          {
            name: target.expr || `metric_${index}`,
            type: 'number' as any,
            values: timePoints.map(() => Math.random() * 100),
            config: {
              unit: 'percent'
            }
          }
        ],
        length: timePoints.length
      })),
      timeRange: { from: 'now-6h', to: 'now' },
      state: 'Done' as any
    };
  };

  // Save handler
  const handleSave = async (newDashboard: DashboardSceneState) => {
    console.log('Saving dashboard:', newDashboard);
    setDashboard({ ...newDashboard, isDirty: false });
  };

  // Variable change handler
  const handleVariableChange = (name: string, value: any) => {
    console.log('Variable changed:', name, value);
    setVariables(prev => 
      prev.map(v => v.name === name ? { ...v, current: value } : v)
    );
  };

  // Alert rule handlers
  const handleAlertRuleCreate = (rule: Partial<AlertRule>) => {
    console.log('Creating alert rule:', rule);
    const newRule: AlertRule = {
      uid: `rule-${Date.now()}`,
      title: rule.title || 'New Alert Rule',
      condition: rule.condition || '',
      data: rule.data || [],
      intervalSeconds: rule.intervalSeconds || 60,
      noDataState: rule.noDataState || 'NoData' as any,
      execErrState: rule.execErrState || 'Alerting' as any,
      ruleGroup: rule.ruleGroup || 'default',
      annotations: rule.annotations || {},
      labels: rule.labels || {}
    };
    setAlertRules(prev => [...prev, newRule]);
  };

  const handleAlertRuleUpdate = (uid: string, updates: Partial<AlertRule>) => {
    console.log('Updating alert rule:', uid, updates);
    setAlertRules(prev => 
      prev.map(rule => rule.uid === uid ? { ...rule, ...updates } : rule)
    );
  };

  return (
    <div className="h-screen">
      <AnalyticsPlatform
        initialDashboard={dashboard}
        dataSources={defaultAnalyticsConfig.dataSources}
        alertRules={alertRules}
        alertInstances={mockAlertInstances}
        contactPoints={mockContactPoints}
        variables={variables}
        canEdit={true}
        canSave={true}
        canDelete={false}
        canAdmin={true}
        onDashboardSave={handleSave}
        onVariableChange={handleVariableChange}
        onAlertRuleCreate={handleAlertRuleCreate}
        onAlertRuleUpdate={handleAlertRuleUpdate}
        onDataQuery={handleDataQuery}
        theme="light"
      />
    </div>
  );
}