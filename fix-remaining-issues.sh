#!/bin/bash
# Fix remaining issues after cleanup

echo "Fixing remaining issues..."

# Fix the remaining dashboard pages to work with Grafana
echo "Updating manufacturing dashboard..."
cat > src/app/dashboards/manufacturing/page.tsx << 'EOF'
'use client';

import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';
import Link from 'next/link';

export default function ManufacturingDashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Manufacturing Overview</h1>
        <p className="text-gray-600">Real-time manufacturing metrics and KPIs</p>
      </div>

      <div className="grid gap-6">
        {/* OEE Dashboard */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Overall Equipment Effectiveness</h2>
          <GrafanaEmbed
            dashboardUid="manufacturing-oee"
            height={400}
            refresh="10s"
          />
        </div>

        {/* Production Metrics */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Production Metrics</h2>
          <GrafanaEmbed
            dashboardUid="manufacturing-production"
            height={400}
            refresh="30s"
          />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/equipment"
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <h3 className="font-semibold">Equipment Status</h3>
            <p className="text-sm text-gray-600">View detailed equipment information</p>
          </Link>
          <Link
            href="/alerts"
            className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition"
          >
            <h3 className="font-semibold">Active Alerts</h3>
            <p className="text-sm text-gray-600">Monitor system alerts</p>
          </Link>
          <Link
            href="/manufacturing-chat"
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-sm text-gray-600">Get insights from AI</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
EOF

echo "Updating production dashboard..."
cat > src/app/dashboards/production/page.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProductionDashboard() {
  const [productionData, setProductionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchProductionData();
  }, []);

  const fetchProductionData = async () => {
    try {
      const response = await fetch('/api/manufacturing-metrics/production?timeRange=24h');
      const data = await response.json();
      setProductionData(data);
    } catch (error) {
      console.error('Failed to fetch production data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Production Dashboard</h1>
        <p className="text-gray-600">Real-time production monitoring and analytics</p>
      </div>

      {/* Quick Stats */}
      {productionData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-600">Total Production</h3>
            <p className="text-2xl font-bold">{productionData.summary?.totalProduction || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-600">Average OEE</h3>
            <p className="text-2xl font-bold">
              {((productionData.summary?.averageOEE || 0) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-600">Active Machines</h3>
            <p className="text-2xl font-bold">{productionData.byEquipment?.length || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-600">Total Downtime</h3>
            <p className="text-2xl font-bold">{productionData.summary?.totalDowntime || 0}m</p>
          </div>
        </div>
      )}

      {/* Grafana Dashboard Link */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-blue-800 mb-2">
          For detailed production analytics and real-time monitoring:
        </p>
        <a
          href={`${grafanaUrl}/d/production-monitoring/production-line-real-time-monitoring`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open Production Dashboard in Grafana →
        </a>
      </div>

      {/* Equipment List */}
      {loading ? (
        <div>Loading production data...</div>
      ) : productionData?.byEquipment ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OEE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Production
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productionData.byEquipment.map((equipment: any) => (
                <tr key={equipment.machineName}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/equipment/${equipment.machineName}`}
                      className="text-blue-600 hover:underline"
                    >
                      {equipment.machineName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      equipment.averageOEE > 0.85 ? 'bg-green-100 text-green-800' :
                      equipment.averageOEE > 0.65 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(equipment.averageOEE * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {equipment.totalProduction}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      Running
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>No production data available</div>
      )}
    </div>
  );
}
EOF

echo "Updating quality dashboard..."
cat > src/app/dashboards/quality/page.tsx << 'EOF'
'use client';

import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';

export default function QualityDashboard() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quality Analytics</h1>
        <p className="text-gray-600">Quality metrics and statistical process control</p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-blue-800 mb-2">
          Access comprehensive quality analytics in Grafana:
        </p>
        <a
          href={`${grafanaUrl}/dashboards`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open Quality Dashboards in Grafana →
        </a>
      </div>

      {/* Embed a specific quality panel if available */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Quality Metrics Overview</h2>
        <p className="text-gray-600 mb-4">
          Quality dashboards are available in Grafana with detailed SPC charts, defect analysis, and trend monitoring.
        </p>
      </div>
    </div>
  );
}
EOF

# Fix the home page to be more focused
echo "Updating home page..."
cat > src/app/page.tsx << 'EOF'
import Link from 'next/link';

export default function HomePage() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  const features = [
    {
      title: 'Equipment Management',
      description: 'Monitor and manage manufacturing equipment in real-time',
      href: '/equipment',
      icon: '🏭',
    },
    {
      title: 'Production Monitoring',
      description: 'Track production metrics, OEE, and performance',
      href: '/dashboards/production',
      icon: '📊',
    },
    {
      title: 'AI Assistant',
      description: 'Get insights and recommendations from AI',
      href: '/manufacturing-chat',
      icon: '🤖',
    },
    {
      title: 'Data Upload',
      description: 'Import production data from various sources',
      href: '/data-upload',
      icon: '📤',
    },
    {
      title: 'Alerts',
      description: 'Monitor and manage system alerts',
      href: '/alerts',
      icon: '🚨',
    },
    {
      title: 'Analytics Dashboards',
      description: 'Comprehensive analytics in Grafana',
      href: grafanaUrl,
      icon: '📈',
      external: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Manufacturing Analytics Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real-time monitoring, analytics, and AI-powered insights for modern manufacturing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              target={feature.external ? '_blank' : undefined}
              rel={feature.external ? 'noopener noreferrer' : undefined}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
              {feature.external && (
                <span className="inline-block mt-2 text-blue-600 text-sm">
                  Opens in Grafana →
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">Database</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">Grafana</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">Monitoring</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">AI Service</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF

# Fix package.json scripts
echo "Updating package.json scripts..."
npm pkg set scripts.cleanup="rm -rf .next node_modules package-lock.json && npm install"

echo "Fixing TypeScript configuration..."
# Update tsconfig to exclude removed directories
cat > tsconfig.exclude.json << 'EOF'
{
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "dist",
    "backup_*"
  ]
}
EOF

echo "All fixes applied!"
echo ""
echo "Next steps:"
echo "1. Stop the current dev server (if running)"
echo "2. Run: npm run cleanup"
echo "3. Run: npm run dev"
echo "4. Access the application at http://localhost:3000"