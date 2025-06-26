import React from 'react';
import { Maintenance, MaintenanceType } from '@/models/equipment';

interface MaintenanceHistoryProps {
  maintenanceHistory?: Maintenance[];
  className?: string;
}

export default function MaintenanceHistory({ maintenanceHistory, className = '' }: MaintenanceHistoryProps) {
  // Sort maintenance history by start time (newest first)
  const sortedHistory = [...maintenanceHistory].sort((a, b) => {
    return new Date(b?.startTime).getTime() - new Date(a?.startTime).getTime();
  });

  // Function to get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to get maintenance type badge color
  const getTypeBadgeColor = (type: MaintenanceType) => {
    switch (type) {
      case 'preventive':
        return 'bg-blue-100 text-blue-800';
      case 'corrective':
        return 'bg-orange-100 text-orange-800';
      case 'predictive':
        return 'bg-purple-100 text-purple-800';
      case 'condition-based':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} data-testid="maintenance-history">
      <div className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Maintenance History</h3>
      </div>

      {sortedHistory.length === 0 ? (
        <div className="px-6 py-5 text-center text-gray-500">
          No maintenance history available for this equipment
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedHistory?.map((maintenance) => (
                <tr key={maintenance?.id} data-testid={`maintenance-row-${maintenance?.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Start: {new Date(maintenance?.startTime).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">End: {new Date(maintenance?.endTime).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {maintenance?.maintenanceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      <div>{maintenance?.description || maintenance?.workOrderNumber}</div>
                      {maintenance?.laborHours && (
                        <span className="text-xs text-gray-500 block mt-1">
                          Labor: {maintenance.laborHours} hours
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {maintenance?.workOrderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {maintenance?.materialCost ? `$${maintenance.materialCost.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}