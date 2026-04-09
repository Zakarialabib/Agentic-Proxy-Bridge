import { useQuery } from '@tanstack/react-query'
import { fetchGatewayStatus } from '@/lib/agent-api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useGateway() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'gateway'
  const policy = gatePolling(getPollingPolicy('gateway'), pollingEnabled, isActive)
  const refetchInterval = pollingEnabled && isActive ? 5000 : false
  const query = useQuery({
    queryKey: ['gateway'],
    queryFn: fetchGatewayStatus,
    enabled: isActive,
    ...policy,
    refetchInterval,
  })
  return { gateway: query.data, isLoading: query.isLoading }
}
