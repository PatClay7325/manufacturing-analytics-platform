import React from 'react'

interface ChartLibraryCardProps {
  name: string
  logo?: string
  version: string
  license: string
  bundleSize: string
  chartTypes: number
  color: string
  features: string[]
}

const ChartLibraryCard: React.FC<ChartLibraryCardProps> = ({
  name,
  logo,
  version,
  license,
  bundleSize,
  chartTypes,
  color,
  features
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden border-t-4`} style={{ borderTopColor: color }}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
          {logo && <img src={logo} alt={`${name} logo`} className="h-8" />}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-semibold">{version}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">License</p>
            <p className="font-semibold">{license}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Bundle Size</p>
            <p className="font-semibold">{bundleSize}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Chart Types</p>
            <p className="font-semibold">{chartTypes}+</p>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-2">Key Features</p>
          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartLibraryCard