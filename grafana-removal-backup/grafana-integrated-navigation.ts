import { 
  Home, 
  LayoutDashboard, 
  Factory, 
  AlertCircle, 
  Database, 
  Settings,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
  Wrench,
  Activity,
  Package,
  TrendingUp,
  ShieldCheck,
  FolderOpen,
  HelpCircle,
  LogOut
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  text: string;
  url?: string;
  icon?: string;
  iconComponent?: any;
  children?: NavigationItem[];
  divider?: boolean;
  hideFromBreadcrumbs?: boolean;
  external?: boolean;
  target?: string;
}

export const navigationConfig: NavigationItem[] = [
  {
    id: 'home',
    text: 'Home',
    url: '/',
    icon: 'home',
    iconComponent: Home,
  },
  {
    id: 'divider-main',
    divider: true,
    text: '',
  },
  {
    id: 'dashboards',
    text: 'Dashboards',
    icon: 'apps',
    iconComponent: LayoutDashboard,
    children: [
      {
        id: 'dashboards-manufacturing',
        text: 'Manufacturing Overview',
        url: '/dashboards/manufacturing',
        icon: 'dashboard',
      },
      {
        id: 'dashboards-oee',
        text: 'OEE Analysis',
        url: '/dashboards/oee',
        icon: 'insert_chart',
      },
      {
        id: 'dashboards-production',
        text: 'Production Metrics',
        url: '/dashboards/production',
        icon: 'trending_up',
      },
      {
        id: 'dashboards-quality',
        text: 'Quality Control',
        url: '/dashboards/quality',
        icon: 'verified',
      },
      {
        id: 'dashboards-divider',
        divider: true,
        text: '',
      },
      {
        id: 'dashboards-browse',
        text: 'Browse',
        url: '/dashboards/browse',
        icon: 'search',
      },
      {
        id: 'dashboards-manage',
        text: 'Manage',
        url: '/dashboards',
        icon: 'settings',
      },
    ],
  },
  {
    id: 'equipment',
    text: 'Equipment',
    icon: 'settings_input_component',
    iconComponent: Factory,
    children: [
      {
        id: 'equipment-status',
        text: 'Live Status',
        url: '/equipment',
        icon: 'sensors',
      },
      {
        id: 'equipment-performance',
        text: 'Performance',
        url: '/equipment/performance',
        icon: 'speed',
      },
      {
        id: 'equipment-maintenance',
        text: 'Maintenance',
        url: '/equipment/maintenance',
        icon: 'build',
      },
      {
        id: 'equipment-diagnostics',
        text: 'Diagnostics',
        url: '/equipment/diagnostics',
        icon: 'troubleshoot',
      },
    ],
  },
  {
    id: 'intelligence',
    text: 'Intelligence',
    icon: 'psychology',
    iconComponent: MessageSquare,
    children: [
      {
        id: 'ai-assistant',
        text: 'AI Assistant',
        url: '/manufacturing-chat',
        icon: 'smart_toy',
      },
      {
        id: 'analytics',
        text: 'Advanced Analytics',
        url: '/explore',
        icon: 'analytics',
      },
      {
        id: 'reports',
        text: 'Reports',
        url: '/reports',
        icon: 'description',
      },
    ],
  },
  {
    id: 'alerts',
    text: 'Alerts',
    url: '/alerts',
    icon: 'notifications',
    iconComponent: AlertCircle,
  },
  {
    id: 'divider-admin',
    divider: true,
    text: '',
  },
  {
    id: 'data',
    text: 'Data Sources',
    icon: 'storage',
    iconComponent: Database,
    children: [
      {
        id: 'data-sources',
        text: 'Configure',
        url: '/datasources',
        icon: 'settings_ethernet',
      },
      {
        id: 'data-upload',
        text: 'Upload Data',
        url: '/data-upload',
        icon: 'upload',
      },
      {
        id: 'data-connections',
        text: 'Connections',
        url: '/connections',
        icon: 'cable',
      },
    ],
  },
  {
    id: 'admin',
    text: 'Administration',
    icon: 'admin_panel_settings',
    iconComponent: Settings,
    children: [
      {
        id: 'admin-users',
        text: 'Users',
        url: '/admin/users',
        icon: 'people',
      },
      {
        id: 'admin-teams',
        text: 'Teams',
        url: '/admin/teams',
        icon: 'groups',
      },
      {
        id: 'admin-settings',
        text: 'Settings',
        url: '/admin/settings',
        icon: 'settings',
      },
      {
        id: 'admin-plugins',
        text: 'Plugins',
        url: '/admin/plugins',
        icon: 'extension',
      },
    ],
  },
  {
    id: 'divider-help',
    divider: true,
    text: '',
  },
  {
    id: 'documentation',
    text: 'Documentation',
    url: '/help',
    icon: 'help',
    iconComponent: HelpCircle,
    external: true,
    target: '_blank',
  },
  {
    id: 'profile',
    text: 'Profile',
    url: '/profile',
    icon: 'person',
    iconComponent: Users,
    hideFromBreadcrumbs: true,
  },
  {
    id: 'sign-out',
    text: 'Sign out',
    url: '/api/auth/signout',
    icon: 'logout',
    iconComponent: LogOut,
    hideFromBreadcrumbs: true,
  },
];

// Manufacturing-specific quick access items
export const quickAccessItems = [
  {
    id: 'qa-oee',
    title: 'Current OEE',
    description: 'Real-time OEE metrics',
    url: '/dashboards/oee',
    icon: TrendingUp,
    color: 'bg-blue-500',
  },
  {
    id: 'qa-alerts',
    title: 'Active Alerts',
    description: 'View and manage alerts',
    url: '/alerts',
    icon: AlertCircle,
    color: 'bg-red-500',
  },
  {
    id: 'qa-equipment',
    title: 'Equipment Status',
    description: 'Live equipment monitoring',
    url: '/equipment',
    icon: Factory,
    color: 'bg-green-500',
  },
  {
    id: 'qa-quality',
    title: 'Quality Metrics',
    description: 'Quality control dashboard',
    url: '/dashboards/quality',
    icon: ShieldCheck,
    color: 'bg-purple-500',
  },
];

// Get flattened list of all navigation items
export function getFlattenedNav(items: NavigationItem[] = navigationConfig): NavigationItem[] {
  const flattened: NavigationItem[] = [];
  
  function flatten(item: NavigationItem) {
    if (!item.divider) {
      flattened.push(item);
    }
    if (item.children) {
      item.children.forEach(flatten);
    }
  }
  
  items.forEach(flatten);
  return flattened;
}

// Find navigation item by URL
export function findNavItemByUrl(url: string, items: NavigationItem[] = navigationConfig): NavigationItem | undefined {
  const flattened = getFlattenedNav(items);
  return flattened.find(item => item.url === url);
}

// Get breadcrumbs for a URL
export function getBreadcrumbs(url: string, items: NavigationItem[] = navigationConfig): NavigationItem[] {
  const breadcrumbs: NavigationItem[] = [];
  
  function findPath(currentItems: NavigationItem[], targetUrl: string, currentPath: NavigationItem[] = []): boolean {
    for (const item of currentItems) {
      if (item.divider || item.hideFromBreadcrumbs) continue;
      
      const newPath = [...currentPath, item];
      
      if (item.url === targetUrl) {
        breadcrumbs.push(...newPath);
        return true;
      }
      
      if (item.children && findPath(item.children, targetUrl, newPath)) {
        return true;
      }
    }
    return false;
  }
  
  findPath(items, url);
  return breadcrumbs;
}