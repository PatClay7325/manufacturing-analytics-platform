'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Equipment } from '@/models/equipment';
import PageLayout from '@/components/layout/PageLayout';
import EquipmentStatusBadge from '@/components/equipment/EquipmentStatusBadge';
import EquipmentMetrics from '@/components/equipment/EquipmentMetrics';
import EquipmentSpecifications from '@/components/equipment/EquipmentSpecifications';
import MaintenanceHistory from '@/components/equipment/MaintenanceHistory';
import equipmentService from '@/services/equipmentService';

export default function EquipmentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'maintenance' | 'specifications'>('overview');

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await equipmentService?.getEquipmentById(id);
        setEquipment(data);
      } catch (err) {
        setError('Failed to load equipment details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEquipment();
  }, [id]);

  // Action button for scheduling maintenance
  const actionButton = (
    <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www?.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      Schedule Maintenance
    </button>
  );

  // Breadcrumbs for navigation
  const breadcrumbs = [
    { label: 'Equipment', href: '/equipment' },
    { label: equipment.name || 'Loading...', href: `/equipment/${id}` }
  ];

  if (loading) {
    return (
      <PageLayout 
        showBreadcrumbs={true} 
        breadcrumbs={breadcrumbs} 
        title="Equipment Details"
      >
        <div className="flex justify-center items-center h-64">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="ml-2 text-gray-500">Loading equipment details...</p>
        </div>
      </PageLayout>
    );
  }

  if (error || !equipment) {
    return (
      <PageLayout 
        showBreadcrumbs={true} 
        breadcrumbs={breadcrumbs} 
        title="Equipment Details"
      >
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error || 'Equipment not found'}</p>
            </div>
          </div>
        </div>
        <Link 
          href="/equipment" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          &larr; Back to equipment list
        </Link>
      </PageLayout>
    );
  }

  const updatedBreadcrumbs = [
    { label: 'Equipment', href: '/equipment' },
    { label: equipment.name, href: `/equipment/${id}` }
  ];

  return (
    <PageLayout 
      title={equipment?.name} 
      showBreadcrumbs={true}
      breadcrumbs={updatedBreadcrumbs}
      actionButton={actionButton}
    >
      <div className="mb-6 flex items-center">
        <EquipmentStatusBadge status={equipment?.status} className="text-sm" />
        <span className="ml-4 text-gray-500">
          {equipment?.manufacturer} {equipment?.model}
        </span>
        {equipment?.serialNumber && (
          <span className="ml-4 text-gray-500">
            S/N: {equipment?.serialNumber}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`${
              activeTab === 'metrics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            aria-current={activeTab === 'metrics' ? 'page' : undefined}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('specifications')}
            className={`${
              activeTab === 'specifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            aria-current={activeTab === 'specifications' ? 'page' : undefined}
          >
            Specifications
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            aria-current={activeTab === 'maintenance' ? 'page' : undefined}
          >
            Maintenance History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Details</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{equipment?.type}</dd>
                </div>
                {equipment?.department && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="mt-1 text-sm text-gray-900">{equipment?.department}</dd>
                  </div>
                )}
                {equipment?.location && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">{equipment?.location}</dd>
                  </div>
                )}
                {equipment?.installationDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Installation Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(equipment?.installationDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {equipment?.lastMaintenanceDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Maintenance</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(equipment?.lastMaintenanceDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {equipment?.nextMaintenanceDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Next Maintenance</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(equipment?.nextMaintenanceDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {equipment?.metrics && equipment?.metrics.length > 0 && (
              <EquipmentMetrics metrics={equipment?.metrics} />
            )}

            {equipment?.tags && equipment?.tags.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {equipment?.(tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {equipment?.notes && (
              <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <p className="text-gray-700">{equipment?.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metrics' && equipment?.metrics && (
          <div className="bg-white shadow rounded-lg">
            <EquipmentMetrics metrics={equipment?.metrics} />
          </div>
        )}

        {activeTab === 'specifications' && equipment?.specifications && (
          <div className="bg-white shadow rounded-lg">
            <EquipmentSpecifications specifications={equipment?.specifications} />
          </div>
        )}

        {activeTab === 'maintenance' && equipment?.maintenanceHistory && (
          <div className="bg-white shadow rounded-lg">
            <MaintenanceHistory maintenanceHistory={equipment?.maintenanceHistory} />
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link 
          href="/equipment" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          &larr; Back to equipment list
        </Link>
      </div>
    </PageLayout>
  );
}