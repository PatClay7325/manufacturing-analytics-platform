'use client'

import { useState, useEffect } from 'react'
import { getFeatureFlags, setFeatureFlag, FeatureFlags } from '@/config/features'
import { Card } from '@/components/common/Card'

export default function FeatureStatus() {
  // Initialize with a safe default to avoid hydration mismatch
  const [flags, setFlags] = useState<FeatureFlags | null>(null)
  const [isDev, setIsDev] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark that we're on the client
    setIsClient(true)
    // Now safe to get feature flags on client
    setFlags(getFeatureFlags())
    // Check if we're in development mode
    setIsDev(process.env.NODE_ENV === 'development')
  }, [])

  const handleToggle = (feature: keyof FeatureFlags) => {
    if (!flags) return
    const newValue = !flags[feature]
    setFeatureFlag(feature, newValue)
    setFlags(getFeatureFlags())
    
    // Show alert about restart needed for some features
    if (feature === 'useHighcharts') {
      alert('Note: Some components may need a page refresh to reflect this change.')
    }
  }

  // Don't render until we're on the client to avoid hydration mismatch
  if (!isClient || !flags) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Feature Flags Status</h3>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const features = [
    {
      key: 'useHighcharts' as keyof FeatureFlags,
      name: 'Highcharts Visualization',
      description: 'Advanced charting library for all visualizations',
      impact: 'High',
      status: flags.useHighcharts ? 'Active' : 'Inactive'
    },
    {
      key: 'enableWebSocket' as keyof FeatureFlags,
      name: 'WebSocket Real-time Updates',
      description: 'Enable real-time metric updates via WebSocket',
      impact: 'Medium',
      status: flags.enableWebSocket ? 'Active' : 'Inactive'
    },
    {
      key: 'enableMetricsTest' as keyof FeatureFlags,
      name: 'Metrics Test Page',
      description: 'Show metrics test page in navigation',
      impact: 'Low',
      status: flags.enableMetricsTest ? 'Active' : 'Inactive'
    }
  ]

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Feature Flags Status</h3>
        
        <div className="space-y-4">
          {features.map((feature) => (
            <div key={feature.key} className="border-b pb-4 last:border-b-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{feature.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      feature.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {feature.status}
                    </span>
                    <span className={`text-xs ${
                      feature.impact === 'High' 
                        ? 'text-red-600' 
                        : feature.impact === 'Medium' 
                        ? 'text-yellow-600' 
                        : 'text-gray-600'
                    }`}>
                      Impact: {feature.impact}
                    </span>
                  </div>
                </div>
                
                {isDev && (
                  <button
                    onClick={() => handleToggle(feature.key)}
                    className={`ml-4 px-3 py-1 text-sm rounded transition-colors ${
                      flags[feature.key]
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {flags[feature.key] ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Data Source:</strong> All metrics data is stored in PostgreSQL using Prisma ORM.
            Visualization is powered by Highcharts.
          </p>
        </div>
        
        {!isDev && (
          <div className="mt-4 text-sm text-gray-600">
            Feature toggles are only available in development mode.
          </div>
        )}
      </div>
    </Card>
  )
}