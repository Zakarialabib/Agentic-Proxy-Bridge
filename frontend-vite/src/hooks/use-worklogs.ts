import { useQuery } from '@tanstack/react-query'
import { fetchWorklogs } from '@/lib/agent-api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useWorklogs() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'worklog'
  const policy = gatePolling(getPollingPolicy('gateway'), pollingEnabled, isActive)
  const refetchInterval = pollingEnabled && isActive ? 5000 : false
  const worklogQuery = useQuery({
    queryKey: ['worklogs'],
    queryFn: fetchWorklogs,
    enabled: isActive,
    ...policy,
    refetchInterval,
  })

  return {
    worklogs: worklogQuery.data || [],
    isLoading: worklogQuery.isLoading,
  }
}
