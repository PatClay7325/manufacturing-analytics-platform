import React from 'react';

interface EquipmentSpecificationsProps {
  specifications: Record<string, string | number>;
  className?: string;
}

export default function EquipmentSpecifications({ specifications, className = '' }: EquipmentSpecificationsProps) {
  // Get sorted specification keys
  const specKeys = Object.keys(specifications).sort();

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} data-testid="equipment-specifications">
      <div className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Specifications</h3>
      </div>

      {specKeys.length === 0 ? (
        <div className="px-6 py-5 text-center text-gray-500">
          No specifications available for this equipment
        </div>
      ) : (
        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {specKeys.map((key) => (
              <div key={key} className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">{key}</dt>
                <dd className="mt-1 text-sm text-gray-900">{specifications[key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}