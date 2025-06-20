import { Dashboard } from '@/types/dashboard';

export const mockDashboards: Dashboard[] = [
  {
    uid: 'manufacturing-overview',
    title: 'Manufacturing Overview',
    description: 'Real-time overview of manufacturing operations',
    tags: ['manufacturing', 'oee', 'production'],
    version: 1,
    schemaVersion: 21,
    time: {
      from: 'now-6h',
      to: 'now'
    },
    refresh: '30s',
    panels: [
      {
        id: 1,
        type: 'gauge',
        title: 'Overall Equipment Effectiveness',
        gridPos: { x: 0, y: 0, w: 8, h: 8 },
        targets: [],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            min: 0,
            max: 100,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'red' },
                { value: 65, color: 'yellow' },
                { value: 85, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {}
      }
    ],
    templating: {
      list: []
    },
    annotations: {
      list: []
    },
    links: [],
    meta: {
      created: '2024-01-15T10:00:00Z',
      updated: '2024-01-15T14:30:00Z',
      createdBy: 'admin',
      updatedBy: 'admin',
      version: 1
    }
  },
  {
    uid: 'quality-dashboard',
    title: 'Quality Control Dashboard',
    description: 'Monitor quality metrics and defect rates',
    tags: ['quality', 'spc', 'defects'],
    version: 1,
    schemaVersion: 21,
    time: {
      from: 'now-24h',
      to: 'now'
    },
    refresh: '1m',
    panels: [
      {
        id: 1,
        type: 'stat',
        title: 'First Pass Yield',
        gridPos: { x: 0, y: 0, w: 6, h: 4 },
        targets: [],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 1
          },
          overrides: []
        },
        options: {}
      }
    ],
    templating: {
      list: []
    },
    annotations: {
      list: []
    },
    links: [],
    meta: {
      created: '2024-01-14T09:00:00Z',
      updated: '2024-01-15T11:45:00Z',
      createdBy: 'quality_manager',
      updatedBy: 'quality_manager',
      version: 3
    }
  },
  {
    uid: 'energy-monitoring',
    title: 'Energy Monitoring',
    description: 'Track energy consumption and efficiency',
    tags: ['energy', 'sustainability', 'iso50001'],
    version: 1,
    schemaVersion: 21,
    time: {
      from: 'now-7d',
      to: 'now'
    },
    refresh: '5m',
    panels: [],
    templating: {
      list: []
    },
    annotations: {
      list: []
    },
    links: [],
    meta: {
      created: '2024-01-10T08:00:00Z',
      updated: '2024-01-15T09:15:00Z',
      createdBy: 'energy_manager',
      updatedBy: 'energy_manager',
      version: 2
    }
  },
  {
    uid: 'maintenance-schedule',
    title: 'Maintenance Schedule',
    description: 'Predictive maintenance and equipment health',
    tags: ['maintenance', 'equipment', 'predictive'],
    version: 1,
    schemaVersion: 21,
    time: {
      from: 'now-30d',
      to: 'now+7d'
    },
    refresh: '10m',
    panels: [],
    templating: {
      list: []
    },
    annotations: {
      list: []
    },
    links: [],
    meta: {
      created: '2024-01-05T07:00:00Z',
      updated: '2024-01-15T16:00:00Z',
      createdBy: 'maintenance_lead',
      updatedBy: 'maintenance_lead',
      version: 5
    }
  }
];

export async function searchDashboards(query: string = '', tags: string[] = []): Promise<Dashboard[]> {
  // Simulate async API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let filtered = [...mockDashboards];
  
  // Filter by search query
  if (query) {
    const searchLower = query.toLowerCase();
    filtered = filtered.filter(dashboard => 
      dashboard.title.toLowerCase().includes(searchLower) ||
      dashboard.description?.toLowerCase().includes(searchLower) ||
      dashboard.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  // Filter by tags
  if (tags.length > 0) {
    filtered = filtered.filter(dashboard =>
      tags.every(tag => dashboard.tags.includes(tag))
    );
  }
  
  return filtered;
}

export async function createDashboard(title: string, manufacturingConfig?: any): Promise<Dashboard> {
  const newDashboard: Dashboard = {
    uid: `dashboard-${Date.now()}`,
    title,
    description: '',
    tags: [],
    version: 1,
    schemaVersion: 21,
    time: {
      from: 'now-6h',
      to: 'now'
    },
    refresh: '30s',
    panels: [],
    templating: {
      list: []
    },
    annotations: {
      list: []
    },
    links: [],
    meta: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      createdBy: 'current_user',
      updatedBy: 'current_user',
      version: 1
    }
  };
  
  // Add to mock data
  mockDashboards.push(newDashboard);
  
  return newDashboard;
}

export async function deleteDashboard(uid: string): Promise<void> {
  const index = mockDashboards.findIndex(d => d.uid === uid);
  if (index >= 0) {
    mockDashboards.splice(index, 1);
  }
}

export async function duplicateDashboard(uid: string): Promise<Dashboard> {
  const original = mockDashboards.find(d => d.uid === uid);
  if (!original) {
    throw new Error('Dashboard not found');
  }
  
  const duplicate: Dashboard = {
    ...original,
    uid: `dashboard-${Date.now()}`,
    title: `${original.title} (Copy)`,
    meta: {
      ...original.meta,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: 1
    }
  };
  
  mockDashboards.push(duplicate);
  return duplicate;
}