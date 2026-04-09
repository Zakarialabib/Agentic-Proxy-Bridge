// Dashboard Components - Status & Metrics Display

import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { MetricsDisplay } from '@/components/inference/MetricsDisplay'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { ProxyStatus, PerformanceMetrics, CacheStats } from '@/lib/types'

import { ConnectionMatrix } from './ConnectionMatrix'
import { SystemStats } from './SystemStats'
import { VRAMDisplay } from './VRAMDisplay'

// Main Dashboard Component
export function Dashboard() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'dashboard'
  const statusPolicy = gatePolling(getPollingPolicy('systemStatus'), pollingEnabled, isActive)
  const metricsPolicy = gatePolling(getPollingPolicy('observability'), pollingEnabled, isActive)

  const statusQuery = useQuery<ProxyStatus | null>({
    queryKey: ['system-status'],
    queryFn: api.fetchStatus,
    enabled: isActive,
    ...statusPolicy,
  })

  const metricsQuery = useQuery<PerformanceMetrics | null>({
    queryKey: ['performance-metrics'],
    queryFn: api.fetchPerformanceMetrics,
    enabled: isActive,
    ...metricsPolicy,
  })

  const cacheStatsQuery = useQuery<CacheStats | null>({
    queryKey: ['cache-stats'],
    queryFn: api.fetchCacheStats,
    enabled: isActive,
    ...metricsPolicy,
  })

  const status = statusQuery.data ?? null
  const metrics = metricsQuery.data ?? null
  const cacheStats = cacheStatsQuery.data ?? null
  
  return (
    <div className="space-y-4">
      <ConnectionMatrix status={status} />
      <MetricsDisplay status={status} performanceMetrics={metrics} cacheStats={cacheStats} />
      <SystemStats status={status} />
      <VRAMDisplay used={8.5} />
    </div>
  )
}
