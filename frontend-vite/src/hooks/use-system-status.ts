

import { useQuery } from '@tanstack/react-query'
import {
  fetchStatus,
  fetchTools,
} from '@/lib/api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { ProxyStatus, Tool } from '@/lib/types'

export interface UseSystemStatusDataReturn {
  status: ProxyStatus | undefined
  statusLoading: boolean
  statusError: Error | null
  tools: Tool[] | undefined
  toolsLoading: boolean
  toolsError: Error | null
  isLoading: boolean
  hasError: boolean
}

export function useSystemStatusData(): UseSystemStatusDataReturn {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const statusActive = activeTab === 'dashboard' || activeTab === 'chat'
  const toolsActive = activeTab === 'tools' || activeTab === 'orchestrate'
  const statusPolicy = gatePolling(getPollingPolicy('systemStatus'), pollingEnabled, statusActive)
  const toolsPolicy = gatePolling(getPollingPolicy('tools'), pollingEnabled, toolsActive)

  const statusQuery = useQuery({
    queryKey: ['system-status'],
    queryFn: fetchStatus,
    enabled: statusActive,
    ...statusPolicy,
  })

  const toolsQuery = useQuery({
    queryKey: ['tools'],
    queryFn: fetchTools,
    enabled: toolsActive,
    ...toolsPolicy,
  })

  return {
    status: statusQuery.data ?? undefined,
    statusLoading: statusQuery.isLoading,
    statusError: statusQuery.error,
    tools: toolsQuery.data ?? undefined,
    toolsLoading: toolsQuery.isLoading,
    toolsError: toolsQuery.error,
    isLoading: statusQuery.isLoading || toolsQuery.isLoading,
    hasError: !!(statusQuery.error || toolsQuery.error),
  }
}
