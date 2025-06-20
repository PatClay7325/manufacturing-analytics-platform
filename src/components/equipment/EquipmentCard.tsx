import React from 'react';
import Link from 'next/link';
import { Equipment, EquipmentSummary } from '@/models/equipment';
import EquipmentStatusBadge from './EquipmentStatusBadge';

interface EquipmentCardProps {
  equipment?: Equipment | EquipmentSummary;
  className?: string;
}

export default function EquipmentCard({ equipment, className = '' }: EquipmentCardProps) {
  return (
    <div 
      className={`bg-white shadow rounded-lg overflow-hidden transition hover:shadow-md ${className}`}
      data-testid="equipment-card"
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 
              className="text-lg font-medium text-gray-900 mb-1" 
              data-testid="equipment-name"
            >
              {equipment?.name}
            </h3>
            <p 
              className="text-sm text-gray-500 mb-3" 
              data-testid="equipment-type"
            >
              {equipment?.type}
            </p>
          </div>
          <EquipmentStatusBadge status={equipment?.status} />
        </div>

        <div className="mt-4 space-y-2">
          {equipment?.location && (
            <div className="flex items-start">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-gray-400 mt-0.5 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              <span className="text-sm text-gray-600">{equipment?.location}</span>
            </div>
          )}

          {equipment?.nextMaintenanceDate && (
            <div className="flex items-start">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-gray-400 mt-0.5 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              <span className="text-sm text-gray-600">
                Next Maintenance: {new Date(equipment?.nextMaintenanceDate).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {'metrics' in equipment && equipment?.metrics && (
            (() => {
              // Check if it's EquipmentSummary with metrics object
              if (!Array.isArray(equipment?.metrics) && 'oee' in equipment?.metrics && equipment?.metrics.oee !== undefined) {
                return (
                  <div className="flex items-start">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 text-gray-400 mt-0.5 mr-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      OEE: {equipment?.metrics.oee}%
                    </span>
                  </div>
                );
              }
              // Check if it's Equipment with metrics array
              if (Array.isArray(equipment?.metrics)) {
                const oeeMetric = equipment?.metrics.find(m => m?.name.toLowerCase() === 'oee');
                if (oeeMetric) {
                  return (
                    <div className="flex items-start">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-gray-400 mt-0.5 mr-2" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                        />
                      </svg>
                      <span className="text-sm text-gray-600">
                        OEE: {oeeMetric?.value}%
                      </span>
                    </div>
                  );
                }
              }
              return null;
            })()
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
        <Link 
          href={` />equipment/${equipment?.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
        >
          View Details &rarr;
        </Link>
      </div>
    </div>
  );
}
