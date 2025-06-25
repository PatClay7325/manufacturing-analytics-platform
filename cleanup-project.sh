#!/bin/bash
# Cleanup and refactor Next.js project

set -e

echo "Starting Next.js Project Cleanup..."
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Backup current state
echo -e "${BLUE}Creating backup...${NC}"
timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="backup_${timestamp}"
mkdir -p "$backup_dir"
cp -r src "$backup_dir/" 2>/dev/null || true
cp package.json "$backup_dir/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup created in $backup_dir${NC}"

# Function to safely remove directories
remove_dir() {
    local dir=$1
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo -e "${GREEN}✓ Removed $dir${NC}"
    fi
}

# Function to safely remove files
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        rm -f "$file"
        echo -e "${GREEN}✓ Removed $file${NC}"
    fi
}

echo -e "\n${BLUE}Removing duplicate dashboard pages...${NC}"

# Remove dashboard pages that duplicate Grafana
remove_dir "src/app/Analytics-dashboard"
remove_dir "src/app/analytics-demo"
remove_dir "src/app/dashboard-demo"
remove_dir "src/app/dashboard"
remove_dir "src/app/dashboards/analytics"
remove_dir "src/app/dashboards/analytics-engine-demo"
remove_dir "src/app/dashboards/demo"
remove_dir "src/app/dashboards/folder-demo"
remove_dir "src/app/dashboards/server-demo"
remove_dir "src/app/dashboards/simple-server-demo"
remove_dir "src/app/debug-dashboard"
remove_dir "src/app/enhanced-dashboard"
remove_dir "src/app/persistent-dashboard"
remove_dir "src/app/prometheus-dashboard"
remove_dir "src/app/test-dashboard"
remove_dir "src/app/test-dashboard-display"
remove_dir "src/app/test-prometheus"
remove_dir "src/app/test-simple-dashboard"
remove_dir "src/app/test-working-dashboard"
remove_dir "src/app/variable-dashboard"

# Remove monitoring section (Grafana handles this)
remove_dir "src/app/monitoring"
remove_dir "src/app/api/monitoring"

# Remove Grafana-like API routes
remove_dir "src/app/api/dashboards"
remove_dir "src/app/api/analytics-proxy"
remove_file "src/app/api/prometheus/route.ts"

echo -e "\n${BLUE}Removing duplicate dashboard components...${NC}"

# Remove dashboard components that duplicate Grafana
remove_file "src/components/dashboard/DashboardEditor.tsx"
remove_file "src/components/dashboard/DashboardEditorV2.tsx"
remove_file "src/components/dashboard/DashboardViewer.tsx"
remove_file "src/components/dashboard/DashboardViewerV2.tsx"
remove_file "src/components/dashboard/GridLayout.tsx"
remove_file "src/components/dashboard/PanelEditor.tsx"
remove_file "src/components/dashboard/PanelRenderer.tsx"
remove_file "src/components/dashboard/QueryBuilder.tsx"
remove_file "src/components/dashboard/QueryEditor.tsx"
remove_file "src/components/dashboard/TimeRangePicker.tsx"
remove_file "src/components/dashboard/VariableEditor.tsx"
remove_file "src/components/dashboard/VariableManager.tsx"
remove_file "src/components/dashboard/RefreshPicker.tsx"
remove_file "src/components/dashboard/PrometheusDataSourceDashboard.tsx"
remove_file "src/components/dashboard/PersistentDashboard.tsx"
remove_file "src/components/dashboard/EnhancedDashboard.tsx"

# Remove analytics components (keep only manufacturing-specific ones)
remove_file "src/components/analytics/AnalyticsPanel.tsx"
remove_file "src/components/analytics/DashboardPanel.tsx"

# Clean up unused test files
find src -name "*.test.tsx" -o -name "*.test.ts" | grep -E "(dashboard|monitoring|analytics)" | while read file; do
    remove_file "$file"
done

echo -e "\n${BLUE}Creating Grafana integration components...${NC}"

# Create Grafana integration directory
mkdir -p src/components/grafana
mkdir -p src/services/grafana
mkdir -p src/app/api/grafana-proxy

# Create Grafana embed component
cat > src/components/grafana/GrafanaEmbed.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';

interface GrafanaEmbedProps {
  dashboardUid: string;
  panelId?: number;
  theme?: 'light' | 'dark';
  refresh?: string;
  vars?: Record<string, string>;
  height?: number | string;
  className?: string;
}

export default function GrafanaEmbed({
  dashboardUid,
  panelId,
  theme = 'dark',
  refresh = '30s',
  vars = {},
  height = 400,
  className = ''
}: GrafanaEmbedProps) {
  const [embedUrl, setEmbedUrl] = useState('');

  useEffect(() => {
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';
    const baseUrl = `${grafanaUrl}/d/${dashboardUid}`;
    
    const params = new URLSearchParams({
      orgId: '1',
      theme,
      refresh,
      kiosk: 'tv',
      ...vars
    });

    if (panelId) {
      setEmbedUrl(`${baseUrl}?viewPanel=${panelId}&${params.toString()}`);
    } else {
      setEmbedUrl(`${baseUrl}?${params.toString()}`);
    }
  }, [dashboardUid, panelId, theme, refresh, vars]);

  return (
    <div className={`grafana-embed ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        title="Grafana Dashboard"
        style={{ border: 'none' }}
      />
    </div>
  );
}
EOF

# Create Grafana service
cat > src/services/grafana/client.ts << 'EOF'
// Grafana API client for integration

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3001';
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY || '';

export class GrafanaClient {
  private headers: HeadersInit;

  constructor(apiKey?: string) {
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey || GRAFANA_API_KEY}`
    };
  }

  async getDashboards() {
    const response = await fetch(`${GRAFANA_URL}/api/search?type=dash-db`, {
      headers: this.headers
    });
    return response.json();
  }

  async getDashboard(uid: string) {
    const response = await fetch(`${GRAFANA_URL}/api/dashboards/uid/${uid}`, {
      headers: this.headers
    });
    return response.json();
  }

  async getAlerts() {
    const response = await fetch(`${GRAFANA_URL}/api/alerts`, {
      headers: this.headers
    });
    return response.json();
  }

  async queryDatasource(datasourceId: string, query: any) {
    const response = await fetch(`${GRAFANA_URL}/api/ds/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        queries: [query],
        from: 'now-1h',
        to: 'now'
      })
    });
    return response.json();
  }
}

export const grafanaClient = new GrafanaClient();
EOF

# Create Grafana proxy API route
cat > src/app/api/grafana-proxy/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://manufacturing-grafana:3000';
const GRAFANA_USER = process.env.GRAFANA_USER || 'admin';
const GRAFANA_PASS = process.env.GRAFANA_PASS || 'admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  try {
    const response = await fetch(`${GRAFANA_URL}/api/${path}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASS}`).toString('base64')
      }
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}
EOF

echo -e "\n${BLUE}Creating manufacturing dashboard list component...${NC}"

# Create a component to list Grafana dashboards
cat > src/components/grafana/DashboardList.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Dashboard {
  uid: string;
  title: string;
  tags: string[];
  url: string;
}

export default function DashboardList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/grafana-proxy?path=search?type=dash-db');
      const data = await response.json();
      setDashboards(data.filter((d: Dashboard) => 
        d.tags.includes('manufacturing') || d.tags.includes('production')
      ));
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  if (loading) return <div>Loading dashboards...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dashboards.map((dashboard) => (
        <a
          key={dashboard.uid}
          href={`${grafanaUrl}${dashboard.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 border rounded hover:shadow-lg transition-shadow"
        >
          <h3 className="font-semibold">{dashboard.title}</h3>
          <div className="mt-2">
            {dashboard.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-1 text-xs bg-gray-200 rounded mr-1"
              >
                {tag}
              </span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}
EOF

echo -e "\n${BLUE}Updating main dashboard page...${NC}"

# Update the dashboards index page to link to Grafana
cat > src/app/dashboards/page.tsx << 'EOF'
import Link from 'next/link';
import DashboardList from '@/components/grafana/DashboardList';

export default function DashboardsPage() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Manufacturing Dashboards</h1>
        <p className="text-gray-600 mb-4">
          Access real-time manufacturing analytics and monitoring dashboards.
        </p>
        
        <div className="flex gap-4 mb-8">
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Grafana Dashboard
          </a>
          <Link
            href="/dashboards/manufacturing"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Manufacturing Overview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Production Monitoring</h2>
          <p className="text-gray-600 mb-4">
            Real-time production metrics, OEE tracking, and equipment status.
          </p>
          <Link href="/dashboards/production" className="text-blue-600 hover:underline">
            View Production Dashboard →
          </Link>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Quality Analytics</h2>
          <p className="text-gray-600 mb-4">
            Quality metrics, defect analysis, and statistical process control.
          </p>
          <Link href="/dashboards/quality" className="text-blue-600 hover:underline">
            View Quality Dashboard →
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Available Grafana Dashboards</h2>
        <DashboardList />
      </div>
    </div>
  );
}
EOF

echo -e "\n${BLUE}Updating environment variables...${NC}"

# Add Grafana URL to .env.local
if ! grep -q "NEXT_PUBLIC_GRAFANA_URL" .env.local; then
    echo "" >> .env.local
    echo "# Grafana Integration" >> .env.local
    echo "NEXT_PUBLIC_GRAFANA_URL=http://localhost:3001" >> .env.local
    echo "GRAFANA_URL=http://manufacturing-grafana:3000" >> .env.local
    echo "GRAFANA_USER=admin" >> .env.local
    echo "GRAFANA_PASS=admin" >> .env.local
    echo -e "${GREEN}✓ Added Grafana environment variables${NC}"
fi

echo -e "\n${BLUE}Cleaning up unused dependencies...${NC}"

# Remove unused dependencies
npm uninstall @visx/visx recharts d3 victory chart.js react-chartjs-2 2>/dev/null || true

echo -e "\n${BLUE}Creating simplified navigation...${NC}"

# Update the main navigation to focus on manufacturing features
cat > src/components/layout/Navigation.tsx << 'EOF'
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/equipment', label: 'Equipment' },
    { href: '/production', label: 'Production' },
    { href: '/manufacturing-chat', label: 'AI Assistant' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/data-upload', label: 'Data Upload' },
  ];

  return (
    <nav className="bg-gray-800 text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Manufacturing Analytics
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={grafanaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Dashboards ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
EOF

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Cleanup Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Summary of changes:${NC}"
echo "✓ Removed duplicate dashboard implementations"
echo "✓ Created Grafana integration components"
echo "✓ Simplified navigation structure"
echo "✓ Added Grafana embed capabilities"
echo "✓ Cleaned up unused dependencies"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'npm install' to update dependencies"
echo "2. Run 'npm run dev' to test the application"
echo "3. Update any broken imports in remaining files"
echo "4. Test all manufacturing-specific features"
echo ""
echo -e "${BLUE}Backup created in: $backup_dir${NC}"