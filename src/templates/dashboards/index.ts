/**
 * Dashboard Templates for Manufacturing Analytics Platform
 * Pre-configured dashboards for common manufacturing use cases
 */

import productionOverview from json';
import equipmentMonitoring from json';
import qualityControl from json';
import energyManagement from json';
import maintenanceDashboard from json';
import supplyChain from json';
import safetyDashboard from json';
import executiveSummary from json';

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
    id: 'quality-control',
    title: 'Quality Control',
    description: 'Quality metrics, SPC charts, defect tracking, inspection results, and compliance monitoring',
    category: 'Quality',
    tags: ['quality', 'spc', 'defects', 'compliance'],
    config: qualityControl
  },
  {
    id: 'energy-management',
    title: 'Energy Management',
    description: 'Energy consumption monitoring, cost analysis, efficiency metrics, and carbon footprint tracking',
    category: 'Energy',
    tags: ['energy', 'sustainability', 'cost', 'efficiency'],
    config: energyManagement
  },
  {
    id: 'maintenance-dashboard',
    title: 'Maintenance Dashboard',
    description: 'Preventive maintenance schedules, work orders, MTBF/MTTR metrics, and spare parts inventory',
    category: 'Maintenance',
    tags: ['maintenance', 'preventive', 'mtbf', 'mttr'],
    config: maintenanceDashboard
  },
  {
    id: 'supply-chain',
    title: 'Supply Chain',
    description: 'Inventory levels, order tracking, supplier performance, and lead time analysis',
    category: 'Supply Chain',
    tags: ['supply-chain', 'inventory', 'orders', 'suppliers'],
    config: supplyChain
  },
  {
    id: 'safety-dashboard',
    title: 'Safety Dashboard',
    description: 'Safety incident tracking, compliance status, training records, and risk assessments',
    category: 'Safety',
    tags: ['safety', 'incidents', 'compliance', 'training'],
    config: safetyDashboard
  },
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'High-level KPIs, financial metrics, performance trends, and strategic insights',
    category: 'Executive',
    tags: ['executive', 'kpi', 'financial', 'strategic'],
    config: executiveSummary
  }
];

// Template categories for filtering
export const templateCategories = [
  { id: 'all', name: 'All Templates', count: dashboardTemplates.length },
  { id: 'production', name: 'Production', count: 1 },
  { id: 'equipment', name: 'Equipment', count: 1 },
  { id: 'quality', name: 'Quality', count: 1 },
  { id: 'energy', name: 'Energy', count: 1 },
  { id: 'maintenance', name: 'Maintenance', count: 1 },
  { id: 'supply-chain', name: 'Supply Chain', count: 1 },
  { id: 'safety', name: 'Safety', count: 1 },
  { id: 'executive', name: 'Executive', count: 1 }
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