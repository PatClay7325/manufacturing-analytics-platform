'use client';

import React, { useState } from 'react';
import { Database, ChevronDown } from 'lucide-react';
import { DataSourceInstanceSettings } from '@/types/datasource';

interface DataSourceSelectorProps {
  dataSources?: DataSourceInstanceSettings[];
  selectedDataSource?: string | null;
  onDataSourceChange?: (dataSourceId?: string) => void;
  className?: string;
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  dataSources,
  selectedDataSource,
  onDataSourceChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selected = dataSources?.find(ds => ds?.uid === selectedDataSource);

  const handleSelect = (dataSourceId: string) => {
    onDataSourceChange(dataSourceId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <div className="flex items-center">
          <Database className="h-4 w-4 mr-2 text-gray-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {selected ? selected?.name : 'Select data source'}
            </div>
            {selected && selected?.meta?.info?.description && (
              <div className="text-xs text-gray-500">{selected?.meta.info?.description}</div>
            )}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {dataSources?.map(dataSource => (
            <button
              key={dataSource?.uid}
              onClick={() => handleSelect(dataSource?.uid)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                dataSource?.uid === selectedDataSource ? 'bg-primary-50' : ''
              }`}
            >
              <div className="flex items-center">
                <Database className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{dataSource?.name}</div>
                  {dataSource?.meta?.info?.description && (
                    <div className="text-xs text-gray-500">{dataSource?.meta.info?.description}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DataSourceSelector;