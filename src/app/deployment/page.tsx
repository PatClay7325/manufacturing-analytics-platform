// Force dynamic rendering because: Uses headers() and data fetching functions
export const dynamic = 'force-dynamic';

import { Suspense } from 'react'
import { Metadata } from 'next'
import { headers } from 'next/headers'
import { DeploymentDashboard } from '@/features/deployment/components/DeploymentDashboard'
import { getDeploymentStats, getActiveDeployments } from '@/features/deployment/utils/deployment-data'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type { DeploymentStats, ActiveDeployment } from '@/features/deployment/types'

export const metadata: Metadata = {
  title: 'Enterprise Deployment Manager',
  description: 'Manage and monitor enterprise-scale deployments with 10/10 production readiness',
  openGraph: {
    title: 'Enterprise Deployment Manager',
    description: 'Production-ready deployment orchestration platform',
    type: 'website',
  },
}

// Server-side data fetching with proper caching
async function getDeploymentData(): Promise<{
  stats: DeploymentStats
  activeDeployments: ActiveDeployment[]
}> {
  const [stats, activeDeployments] = await Promise.all([
    getDeploymentStats(),
    getActiveDeployments()
  ])

  return { stats, activeDeployments }
}

export default async function DeploymentPage() {
  const { stats, activeDeployments } = await getDeploymentData()

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Enterprise Deployment Manager
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            10/10 production-ready deployment orchestration with real-time monitoring
          </p>
        </header>

        <Suspense fallback={<LoadingSpinner />}>
          <DeploymentDashboard 
            initialStats={stats}
            initialDeployments={activeDeployments}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}