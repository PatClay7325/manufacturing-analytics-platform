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
      
      // Check if data is an array or if there's an error
      if (Array.isArray(data)) {
        setDashboards(data.filter((d: Dashboard) => 
          d.tags && (d.tags.includes('manufacturing') || d.tags.includes('production'))
        ));
      } else {
        console.error('Invalid response from Grafana:', data);
        setDashboards([]);
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
      setDashboards([]);
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
