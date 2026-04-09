import { useQuery } from '@tanstack/react-query'
import { fetchKnowledgeStatus } from '@/lib/agent-api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useKnowledge() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'knowledge'
  const policy = gatePolling(getPollingPolicy('knowledge'), pollingEnabled, isActive)
  const refetchInterval = pollingEnabled && isActive ? 5000 : false
  const query = useQuery({
    queryKey: ['knowledge'],
    queryFn: fetchKnowledgeStatus,
    enabled: isActive,
    ...policy,
    refetchInterval,
  })
  return { knowledge: query.data, isLoading: query.isLoading }
}
