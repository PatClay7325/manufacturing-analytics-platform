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
