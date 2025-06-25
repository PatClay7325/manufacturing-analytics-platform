'use client';

import { useState } from 'react';
import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';

export default function PrismaDashboardPage() {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manufacturing Dashboard - Prisma Direct Connection</h1>
      
      {showInstructions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Grafana is configured to read directly from your Prisma database!</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">✅ Database Connection Configured:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Datasource: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Manufacturing PostgreSQL</code></li>
                <li>Connection: Direct to your Prisma PostgreSQL database</li>
                <li>Tables accessible: All Prisma models (PerformanceMetric, Equipment, Alert, etc.)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">📊 To create dashboards in Grafana:</h3>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>Access Grafana at <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">http://localhost:3001</a></li>
                <li>Login with admin/admin</li>
                <li>Go to Dashboards → New Dashboard</li>
                <li>Add a new panel and select "Manufacturing PostgreSQL" as the datasource</li>
                <li>Use SQL queries like:
                  <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-2 text-xs overflow-x-auto">
{`SELECT 
  "createdAt" AS time,
  AVG("oeeScore") AS "OEE Score"
FROM "PerformanceMetric"
WHERE $__timeFilter("createdAt")
GROUP BY time
ORDER BY time`}
                  </pre>
                </li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">🔍 Available Prisma Tables:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">PerformanceMetric</code>
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Equipment</code>
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Alert</code>
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">WorkCenter</code>
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">ProductionOrder</code>
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">QualityCheck</code>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowInstructions(false)}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Hide instructions
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Embedded Grafana Dashboard</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <p>Once you create a dashboard in Grafana, you can embed it here by updating the dashboard UID.</p>
          <p className="mt-1">For now, try accessing Grafana directly at: <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">http://localhost:3001</a></p>
        </div>
        
        {/* This will show a placeholder or error until a dashboard is created */}
        <GrafanaEmbed
          dashboardName="manufacturing-overview-prisma"
          height="600px"
          refresh="10s"
          theme="dark"
        />
      </div>

      <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick SQL Examples for Grafana</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold">Current OEE by Equipment:</h3>
            <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 overflow-x-auto">
{`SELECT 
  e.name as "Equipment",
  AVG(pm."oeeScore") as "OEE %"
FROM "PerformanceMetric" pm
JOIN "Equipment" e ON pm."equipmentId" = e.id
WHERE pm."createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY e.name
ORDER BY "OEE %" DESC`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">Production Trend:</h3>
            <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 overflow-x-auto">
{`SELECT 
  date_trunc('hour', "createdAt") as time,
  SUM("productionRate") as "Units/Hour"
FROM "PerformanceMetric"
WHERE $__timeFilter("createdAt")
GROUP BY time
ORDER BY time`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}