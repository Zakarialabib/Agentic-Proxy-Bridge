import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PROXY_BRIDGE_URL } from '@/lib/config'
import type { MCPServer, Tool } from '@/lib/types'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useMCP() {
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'mcp' || activeTab === 'chat'
  const policy = gatePolling(getPollingPolicy('mcp'), pollingEnabled, isActive)
  const refetchInterval = pollingEnabled && isActive ? 10000 : false
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mcp-status'],
    queryFn: async () => {
      const [serversRes, toolsRes] = await Promise.all([
        fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers`),
        fetch(`${PROXY_BRIDGE_URL}/api/mcp/tools`)
      ])
      if (!serversRes.ok || !toolsRes.ok) throw new Error('Failed to fetch MCP data')
      
      const serversData = await serversRes.json()
      const toolsData = await toolsRes.json()
      return { servers: serversData.servers || [], tools: toolsData.tools || [] }
    },
    ...policy,
    refetchInterval
  })

  const addServer = async (config: { id: string; name: string; command: string; args?: string[]; env?: Record<string, string> }) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['mcp-status'] })
      } else {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to add server')
      }
    } catch (e) {
      throw e
    }
  }

  const removeServer = async (serverId: string) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers/${serverId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['mcp-status'] })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const connectServer = async (serverId: string) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers/${serverId}/connect`, {
        method: 'POST'
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['mcp-status'] })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const disconnectServer = async (serverId: string) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers/${serverId}/disconnect`, {
        method: 'POST'
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['mcp-status'] })
      }
    } catch (e) {
      console.error(e)
    }
  }

  return {
    servers: data?.servers || [],
    tools: data?.tools || [],
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
    addServer,
    removeServer,
    connectServer,
    disconnectServer
  }
}
