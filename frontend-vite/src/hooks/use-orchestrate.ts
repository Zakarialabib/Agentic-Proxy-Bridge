import { useQuery } from '@tanstack/react-query'
import { fetchAgents } from '@/lib/agent-api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useOrchestrate() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'orchestrate'
  const policy = gatePolling(getPollingPolicy('systemStatus'), pollingEnabled, isActive)
  const refetchInterval = pollingEnabled && isActive ? 5000 : false
  const query = useQuery({
    queryKey: ['orchestrate'],
    queryFn: fetchAgents,
    enabled: isActive,
    ...policy,
    refetchInterval,
  })
  return { agents: query.data?.agents || [], isLoading: query.isLoading }
}
