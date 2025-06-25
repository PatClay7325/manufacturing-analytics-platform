/**
 * Welcome Panel - Analytics-compatible welcome panel
 * Shows personalized welcome message and quick stats
 */

import React, { useState, useEffect } from 'react';
import { PanelProps } from '@/core/plugins/types';
import { 
  User, Activity, TrendingUp, Clock, 
  BarChart3, Database, Bell, Users,
  Calendar, Zap, Award, Target
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export interface WelcomePanelOptions {
  showGreeting: boolean;
  showStats: boolean;
  showRecentActivity: boolean;
  showTips: boolean;
  customMessage?: string;
}

interface DashboardStats {
  totalDashboards: number;
  totalPanels: number;
  totalDataSources: number;
  totalAlerts: number;
  totalUsers: number;
  lastLogin?: string;
}

interface RecentActivity {
  type: 'dashboard_created' | 'dashboard_viewed' | 'alert_created' | 'datasource_added';
  title: string;
  timestamp: string;
  link?: string;
}

const WelcomePanel: React.FC<PanelProps<WelcomePanelOptions>> = ({
  options,
  width,
  height,
}) => {
  const [userName, setUserName] = useState('User');
  const [stats, setStats] = useState<DashboardStats>({
    totalDashboards: 0,
    totalPanels: 0,
    totalDataSources: 0,
    totalAlerts: 0,
    totalUsers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Fetch user info
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.name) setUserName(data.name);
      })
      .catch(() => {});

    // Fetch stats
    fetchStats();

    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      // Simulate fetching stats - in production, this would be real API calls
      setStats({
        totalDashboards: 24,
        totalPanels: 156,
        totalDataSources: 8,
        totalAlerts: 32,
        totalUsers: 15,
        lastLogin: new Date(Date.now() - 86400000).toISOString(),
      });

      // Simulate recent activity
      setRecentActivity([
        {
          type: 'dashboard_viewed',
          title: 'Production Overview',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          link: '/dashboards/production',
        },
        {
          type: 'alert_created',
          title: 'High Temperature Alert',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          link: '/alerts/1',
        },
        {
          type: 'dashboard_created',
          title: 'Equipment Monitoring',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          link: '/dashboards/equipment',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'dashboard_created':
      case 'dashboard_viewed':
        return <BarChart3 className="h-4 w-4" />;
      case 'alert_created':
        return <Bell className="h-4 w-4" />;
      case 'datasource_added':
        return <Database className="h-4 w-4" />;
    }
  };

  const tips = [
    {
      icon: <Zap className="h-4 w-4" />,
      text: 'Press ? to see keyboard shortcuts',
    },
    {
      icon: <Target className="h-4 w-4" />,
      text: 'Use variables to create dynamic dashboards',
    },
    {
      icon: <Award className="h-4 w-4" />,
      text: 'Star dashboards for quick access',
    },
  ];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Greeting */}
        {options.showGreeting && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">
              {getGreeting()}, {userName}!
            </h2>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {format(currentTime, 'EEEE, MMMM d, yyyy • h:mm a')}
            </p>
            {options.customMessage && (
              <p className="mt-4 text-lg">{options.customMessage}</p>
            )}
          </div>
        )}

        {/* Stats Grid */}
        {options.showStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboards" className="group">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Dashboards</p>
                    <p className="text-2xl font-bold">{stats.totalDashboards}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>

            <Link href="/datasources" className="group">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Data Sources</p>
                    <p className="text-2xl font-bold">{stats.totalDataSources}</p>
                  </div>
                  <Database className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>

            <Link href="/alerts" className="group">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Alerts</p>
                    <p className="text-2xl font-bold">{stats.totalAlerts}</p>
                  </div>
                  <Bell className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Panels</p>
                  <p className="text-2xl font-bold">{stats.totalPanels}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            <Link href="/users" className="group">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    98%
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {options.showRecentActivity && recentActivity.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {recentActivity.map((activity, index) => (
                <Link
                  key={index}
                  href={activity.link || '#'}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="p-2 rounded-full bg-muted">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {options.showTips && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Quick Tips
            </h3>
            <div className="space-y-2">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded bg-background">
                    {tip.icon}
                  </div>
                  <p>{tip.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last login info */}
        {stats.lastLogin && (
          <div className="text-center text-sm text-muted-foreground">
            Last login: {format(new Date(stats.lastLogin), 'PPpp')}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomePanel;