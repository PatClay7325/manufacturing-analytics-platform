/**
 * Getting Started Panel - Grafana-compatible onboarding panel
 * Displays helpful links, documentation, and quick actions for new users
 */

import React from 'react';
import { PanelProps } from '@/core/plugins/types';
import { 
  BookOpen, PlayCircle, FileText, Settings, 
  Database, Users, Bell, BarChart3, 
  ExternalLink, ArrowRight, Zap, GitBranch 
} from 'lucide-react';
import Link from 'next/link';

export interface GettingStartedPanelOptions {
  showBasicPath: boolean;
  showAdvancedPath: boolean;
  customLinks?: Array<{
    title: string;
    description: string;
    url: string;
    icon?: string;
  }>;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  external?: boolean;
}

const GettingStartedPanel: React.FC<PanelProps<GettingStartedPanelOptions>> = ({
  options,
  width,
  height,
}) => {
  const basicActions: QuickAction[] = [
    {
      title: 'Add data source',
      description: 'Connect to databases, APIs, and monitoring systems',
      icon: <Database className="h-5 w-5" />,
      href: '/datasources/new',
    },
    {
      title: 'Create dashboard',
      description: 'Build visualizations for your manufacturing data',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/dashboards/new',
    },
    {
      title: 'Invite users',
      description: 'Add team members to collaborate on dashboards',
      icon: <Users className="h-5 w-5" />,
      href: '/users/new',
    },
    {
      title: 'Configure alerts',
      description: 'Set up notifications for critical conditions',
      icon: <Bell className="h-5 w-5" />,
      href: '/alerting/list',
    },
  ];

  const advancedActions: QuickAction[] = [
    {
      title: 'Plugin catalog',
      description: 'Extend functionality with community plugins',
      icon: <Zap className="h-5 w-5" />,
      href: '/plugins',
    },
    {
      title: 'API documentation',
      description: 'Integrate with external systems via API',
      icon: <GitBranch className="h-5 w-5" />,
      href: '/documentation/api-reference',
    },
    {
      title: 'Dashboard provisioning',
      description: 'Deploy dashboards as code with version control',
      icon: <Settings className="h-5 w-5" />,
      href: '/admin/provisioning',
    },
    {
      title: 'Query performance',
      description: 'Optimize your data queries and visualizations',
      icon: <PlayCircle className="h-5 w-5" />,
      href: '/admin/performance',
    },
  ];

  const resources = [
    {
      title: 'Manufacturing Analytics Guide',
      description: 'Learn best practices for industrial data visualization',
      icon: <BookOpen className="h-4 w-4" />,
      href: '/documentation',
    },
    {
      title: 'Video Tutorials',
      description: 'Step-by-step walkthroughs of key features',
      icon: <PlayCircle className="h-4 w-4" />,
      href: 'https://www.youtube.com/grafana',
      external: true,
    },
    {
      title: 'Community Forums',
      description: 'Get help and share experiences with other users',
      icon: <Users className="h-4 w-4" />,
      href: 'https://community.grafana.com',
      external: true,
    },
  ];

  const renderActionCard = (action: QuickAction) => {
    const CardWrapper = action.external ? 'a' : Link;
    const cardProps = action.external 
      ? { href: action.href, target: '_blank', rel: 'noopener noreferrer' }
      : { href: action.href };

    return (
      <CardWrapper
        key={action.title}
        {...cardProps}
        className="group flex items-start gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
      >
        <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {action.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium flex items-center gap-1">
            {action.title}
            {action.external && <ExternalLink className="h-3 w-3" />}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {action.description}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
      </CardWrapper>
    );
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to Manufacturing Analytics Platform</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get started by connecting your data sources and creating your first dashboard. 
            Follow our quick start guide or explore advanced features.
          </p>
        </div>

        {/* Basic path */}
        {options.showBasicPath && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-sm">1</span>
              Quick Start
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {basicActions.map(renderActionCard)}
            </div>
          </div>
        )}

        {/* Advanced path */}
        {options.showAdvancedPath && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-sm">2</span>
              Advanced Features
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {advancedActions.map(renderActionCard)}
            </div>
          </div>
        )}

        {/* Custom links */}
        {options.customLinks && options.customLinks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Custom Resources</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {options.customLinks.map((link) => renderActionCard({
                title: link.title,
                description: link.description,
                icon: <FileText className="h-5 w-5" />,
                href: link.url,
                external: link.url.startsWith('http'),
              }))}
            </div>
          </div>
        )}

        {/* Resources section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Learning Resources</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {resources.map((resource) => (
              <a
                key={resource.title}
                href={resource.href}
                target={resource.external ? '_blank' : undefined}
                rel={resource.external ? 'noopener noreferrer' : undefined}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="p-1.5 rounded bg-muted">
                  {resource.icon}
                </div>
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-1">
                    {resource.title}
                    {resource.external && <ExternalLink className="h-3 w-3" />}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {resource.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Footer tips */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">💡 Pro Tips</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Use keyboard shortcuts (? to see all) for faster navigation</li>
            <li>• Star your favorite dashboards for quick access</li>
            <li>• Set up dashboard playlists for TV displays in your facility</li>
            <li>• Enable dark mode for better visibility in control rooms</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GettingStartedPanel;