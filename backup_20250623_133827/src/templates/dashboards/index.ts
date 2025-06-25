/**
 * Dashboard Templates for Manufacturing AnalyticsPlatform
 * Pre-configured dashboards for common manufacturing use cases
 */

import productionOverview from './production-overview.json';
import equipmentMonitoring from './equipment-monitoring.json';
import variableDemo from './variable-demo.json';
import prometheusTest from './prometheus-test.json';
import prometheusRealtime from './prometheus-realtime.json';

export interface DashboardTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  config: any; // Dashboard JSON configuration
}

export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: 'prometheus-realtime',
    title: 'Real-Time System Monitoring',
    description: 'Comprehensive real-time monitoring dashboard with live system metrics, network traffic, and alerts',
    category: 'Monitoring',
    tags: ['monitoring', 'prometheus', 'real-time', 'system', 'cpu', 'memory', 'network'],
    config: prometheusRealtime
  },
  {
    id: 'prometheus-test',
    title: 'Prometheus Test Dashboard',
    description: 'Simple test dashboard showing real Prometheus metrics - CPU and memory usage',
    category: 'Test',
    tags: ['test', 'prometheus', 'real-data', 'cpu', 'memory'],
    config: prometheusTest
  },
  {
    id: 'production-overview',
    title: 'Production Overview',
    description: 'Real-time manufacturing production metrics and KPIs including OEE, quality rate, and shift performance',
    category: 'Production',
    tags: ['production', 'manufacturing', 'overview', 'oee'],
    config: productionOverview
  },
  {
    id: 'equipment-monitoring',
    title: 'Equipment Monitoring',
    description: 'Real-time equipment status, performance metrics, temperature, vibration, and maintenance schedules',
    category: 'Equipment',
    tags: ['equipment', 'monitoring', 'maintenance', 'sensors'],
    config: equipmentMonitoring
  },
  {
    id: 'variable-demo',
    title: 'Variable Demo',
    description: 'Demonstration of dashboard variables and templating features',
    category: 'Demo',
    tags: ['variables', 'demo', 'templating'],
    config: variableDemo
  }
];

// Template categories for filtering
export const templateCategories = [
  { id: 'all', name: 'All Templates', count: dashboardTemplates.length },
  { id: 'monitoring', name: 'Monitoring', count: 1 },
  { id: 'test', name: 'Test', count: 1 },
  { id: 'production', name: 'Production', count: 1 },
  { id: 'equipment', name: 'Equipment', count: 1 },
  { id: 'demo', name: 'Demo', count: 1 }
];

// Helper function to get template by ID
export function getTemplateById(id: string): DashboardTemplate | undefined {
  return dashboardTemplates.find(template => template.id === id);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: string): DashboardTemplate[] {
  if (category === 'all') return dashboardTemplates;
  return dashboardTemplates.filter(template => 
    template.category.toLowerCase() === category.toLowerCase()
  );
}

// Helper function to search templates
export function searchTemplates(query: string): DashboardTemplate[] {
  const lowerQuery = query.toLowerCase();
  return dashboardTemplates.filter(template =>
    template.title.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}