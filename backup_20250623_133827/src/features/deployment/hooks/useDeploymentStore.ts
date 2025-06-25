/**
 * Zustand store for deployment state management
 * Simplified version without external dependencies for AnalyticsPlatform demo
 */

import { create } from 'zustand'

interface DeploymentState {
  deployments: any[]
  stats: any
  selectedDeploymentId: string | null
  isLoading: boolean
  error: string | null
  
  updateDeployments: (deployments: any[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useDeploymentStore = create<DeploymentState>((set) => ({
  deployments: [],
  stats: {
    totalDeployments: 0,
    successfulDeployments: 0,
    failedDeployments: 0,
    pendingDeployments: 0,
    averageDeploymentTime: 0,
    deploymentSuccessRate: 0,
    lastDeploymentAt: null,
    complianceScore: 0,
    securityScore: 0
  },
  selectedDeploymentId: null,
  isLoading: false,
  error: null,

  updateDeployments: (deployments) => set({ deployments }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))

// Simplified selectors
export const selectFilteredDeployments = (state: DeploymentState) => state.deployments
export const selectSelectedDeployment = (state: DeploymentState) => null
export const selectDeploymentHealth = (state: DeploymentState) => 100