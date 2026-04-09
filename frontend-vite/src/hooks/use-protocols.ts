import { useQuery } from '@tanstack/react-query'
import { fetchProtocols } from '@/lib/agent-api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useProtocols() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'protocols'
  const policy = gatePolling(getPollingPolicy('systemStatus'), pollingEnabled, isActive)
  const refetchInterval = pollingEnabled && isActive ? 5000 : false
  const query = useQuery({
    queryKey: ['protocols'],
    queryFn: fetchProtocols,
    enabled: isActive,
    ...policy,
    refetchInterval,
  })
  return { protocols: query.data, isLoading: query.isLoading }
}
