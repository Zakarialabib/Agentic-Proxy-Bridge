// Dashboard Components - Status & Metrics Display

import { useState, useEffect } from 'react'
import * as api from '@/lib/api'
import { MetricsDisplay } from '@/components/inference/MetricsDisplay'
import type { ProxyStatus, PerformanceMetrics, CacheStats } from '@/lib/types'

import { ConnectionMatrix } from './ConnectionMatrix'
import { SystemStats } from './SystemStats'
import { VRAMDisplay } from './VRAMDisplay'

// Main Dashboard Component
export function Dashboard() {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [uptime, setUptime] = useState(0)
  
  useEffect(() => {
    const loadData = async () => {
      const [statusData, metricsData, cacheData] = await Promise.all([
        api.fetchStatus(),
        api.fetchPerformanceMetrics(),
        api.fetchCacheStats(),
      ])
      setStatus(statusData)
      setMetrics(metricsData)
      setCacheStats(cacheData)
    }
    
    loadData()
    
    const interval = setInterval(() => {
      loadData()
      setUptime(prev => prev + 1)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="space-y-4">
      <ConnectionMatrix status={status} />
      <MetricsDisplay status={status} performanceMetrics={metrics} cacheStats={cacheStats} />
      <SystemStats status={status} />
      <VRAMDisplay used={8.5} />
    </div>
  )
}
