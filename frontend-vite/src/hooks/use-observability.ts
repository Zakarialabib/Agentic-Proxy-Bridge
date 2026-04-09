import { useQuery } from '@tanstack/react-query'
import { fetchObservabilityDashboard, fetchObservabilityHealth } from '@/lib/agent-api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useObservability() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'observability' || activeTab === 'dashboard'
  const policy = gatePolling(getPollingPolicy('observability'), pollingEnabled, isActive)
  const dashboardInterval = pollingEnabled && isActive ? 3000 : false
  const healthInterval = pollingEnabled && isActive ? 5000 : false
  const dashboardQuery = useQuery({
    queryKey: ['observability-dashboard'],
    queryFn: fetchObservabilityDashboard,
    enabled: isActive,
    ...policy,
    refetchInterval: dashboardInterval,
  });

  const healthQuery = useQuery({
    queryKey: ['observability-health'],
    queryFn: fetchObservabilityHealth,
    enabled: isActive,
    ...policy,
    refetchInterval: healthInterval,
  });

  return {
    dashboard: dashboardQuery.data,
    health: healthQuery.data,
    isLoading: dashboardQuery.isLoading || healthQuery.isLoading,
  }
}
