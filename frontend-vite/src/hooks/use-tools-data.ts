import { useQuery } from '@tanstack/react-query'
import { fetchToolsList } from '@/lib/agent-api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useToolsData() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'tools'
  const policy = gatePolling(getPollingPolicy('tools'), pollingEnabled, isActive)
  const refetchInterval = pollingEnabled && isActive ? 10000 : false
  const toolsQuery = useQuery({
    queryKey: ['tools-list'],
    queryFn: fetchToolsList,
    enabled: isActive,
    ...policy,
    refetchInterval,
  })

  return {
    tools: toolsQuery.data?.tools || [],
    total: toolsQuery.data?.total || 0,
    isLoading: toolsQuery.isLoading,
  }
}
