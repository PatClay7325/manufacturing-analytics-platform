// Feature flags configuration
export interface FeatureFlags {
  enableWebSocket: boolean
  enableMetricsTest: boolean
  useRecharts: boolean
}

// Default feature flags
const defaultFlags: FeatureFlags = {
  enableWebSocket: false, // WebSocket disabled by default
  enableMetricsTest: false, // Metrics test page disabled
  useRecharts: true, // Always use Recharts
}

// Get feature flags from localStorage (client-side only)
export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined') {
    return defaultFlags
  }
  
  try {
    const stored = localStorage.getItem('featureFlags')
    if (stored) {
      return { ...defaultFlags, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Failed to load feature flags:', error)
  }
  
  return defaultFlags
}

// Set a feature flag
export function setFeatureFlag(key: keyof FeatureFlags, value: boolean): void {
  if (typeof window === 'undefined') return
  
  try {
    const current = getFeatureFlags()
    const updated = { ...current, [key]: value }
    localStorage.setItem('featureFlags', JSON.stringify(updated))
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('featureFlagsChanged', { 
      detail: { key, value, flags: updated } 
    }))
  } catch (error) {
    console.error('Failed to save feature flag:', error)
  }
}

// Check if a feature is enabled
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags()
  return flags[flag] ?? defaultFlags[flag]
}

// Hook to listen for feature flag changes
export function onFeatureFlagsChange(callback: (flags: FeatureFlags) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {} // No-op on server
  }
  
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent
    callback(customEvent.detail.flags)
  }
  
  window.addEventListener('featureFlagsChanged', handler)
  return () => window.removeEventListener('featureFlagsChanged', handler)
}