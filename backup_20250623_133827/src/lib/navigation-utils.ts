import { 
  Plus, LayoutGrid, FolderPlus, Upload, Bell, 
  Home, Compass, List, MessageSquare, Network, 
  BellOff, Layers, Settings, Database, Users, 
  UsersIcon, Plug, SlidersHorizontal, KeyRound,
  HelpCircle, ChevronDown, ChevronRight, Search,
  Clock, Star, Filter, ChevronLeft,
  Factory, Gauge, Wrench, ClipboardList, LineChart,
  Activity, BarChart3, FileText, Zap, Globe, Shield,
  Menu, X, User, LogOut, Code, TestTube, Beaker,
  FlaskConical, GitBranch, Terminal, Bug, Brain,
  Stethoscope, HeartPulse, History, ListOrdered,
  ShieldCheck, LifeBuoy, Keyboard, Info, Upload as UploadIcon,
  Download, SearchIcon, Lock, Cog
} from 'lucide-react';

// Icon mapping from string names to Lucide React components
const iconMap: Record<string, any> = {
  // Operations icons
  'apps': LayoutGrid,
  'home-alt': Home,
  'eye': Activity,
  'chart-line': LineChart,
  'chart-bar': BarChart3,
  'shield-check': ShieldCheck,
  
  // Intelligence icons
  'brain': Brain,
  'comment-alt-share': MessageSquare,
  'chat': MessageSquare,
  'chart-pie': BarChart3,
  'compass': Compass,
  
  // Equipment icons
  'cog': Cog,
  'heart-rate': HeartPulse,
  'wrench': Wrench,
  'stethoscope': Stethoscope,
  'history': History,
  
  // Alerts icons
  'bell': Bell,
  'list-ul': ListOrdered,
  'bell-slash': BellOff,
  
  // Dashboard icons
  'sitemap': Network,
  'user': User,
  'share-alt': Network,
  'globe-alt': Globe,
  'plus': Plus,
  
  // Data icons
  'database': Database,
  'upload': UploadIcon,
  'arrow-down': Download,
  'arrow-up': Upload,
  'search': SearchIcon,
  
  // Admin icons
  'shield': Shield,
  'users-alt': UsersIcon,
  'lock': Lock,
  'office-building': Factory,
  'key-skeleton-alt': KeyRound,
  
  // Settings icons
  'sliders-v-alt': SlidersHorizontal,
  'plug': Plug,
  
  // Help icons
  'question-circle': HelpCircle,
  'document-info': FileText,
  'life-ring': LifeBuoy,
  'keyboard': Keyboard,
  'info-circle': Info,
  
  // Development icons
  'code-branch': GitBranch,
  'bug': Bug,
  'layer-group': Layers,
  'code': Code,
  'tachometer-alt': Gauge
};

export function mapIconStringToComponent(iconName?: string) {
  if (!iconName) return undefined;
  return iconMap[iconName] || Cog; // Default to Cog if icon not found
}

// Convert bootstrap nav structure to DashboardLayout format
export function convertNavTreeForDashboard(navItems: any[]) {
  return navItems.map(item => ({
    id: item.id,
    text: item.text,
    icon: mapIconStringToComponent(item.icon),
    url: item.url,
    section: 'core', // You can enhance this based on item.id
    children: item.children ? convertNavTreeForDashboard(item.children) : undefined
  }));
}