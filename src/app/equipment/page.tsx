'use client';

import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EquipmentList from '@/components/equipment/EquipmentList';
import { Equipment } from '@/models/equipment';
import equipmentService from '@/services/equipmentService';

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await equipmentService?.getAllEquipment();
        setEquipment(data);
      } catch (err) {
        setError('Failed to load equipment. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEquipment();
  }, []);

  // Add equipment button
  const actionButton = (
    <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Add Equipment
    </button>
  );

  return (
    <PageLayout 
      title="Equipment Management" 
      actionButton={actionButton}
    >
      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-500">Loading equipment...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <EquipmentList initialEquipment={equipment} />
      )}
    </PageLayout>
  );
}
