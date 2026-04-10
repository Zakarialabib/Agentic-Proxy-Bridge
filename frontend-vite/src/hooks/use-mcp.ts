import { useState, useEffect, useCallback } from 'react'
import { PROXY_BRIDGE_URL } from '@/lib/config'
import type { MCPServer, Tool } from '@/lib/types'

export function useMCP() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [serversRes, toolsRes] = await Promise.all([
        fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers`),
        fetch(`${PROXY_BRIDGE_URL}/api/mcp/tools`)
      ])

      if (serversRes.ok && toolsRes.ok) {
        const serversData = await serversRes.json()
        const toolsData = await toolsRes.json()
        setServers(serversData.servers || [])
        setTools(toolsData.tools || [])
      } else {
        setError('Failed to fetch MCP data')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [fetchStatus])

  const addServer = async (config: { id: string; name: string; command: string; args?: string[]; env?: Record<string, string> }) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        await fetchStatus()
      } else {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to add server')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add server')
      throw e
    }
  }

  const removeServer = async (serverId: string) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers/${serverId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchStatus()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove server')
    }
  }

  const connectServer = async (serverId: string) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers/${serverId}/connect`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchStatus()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect server')
    }
  }

  const disconnectServer = async (serverId: string) => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/mcp/servers/${serverId}/disconnect`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchStatus()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect server')
    }
  }

  return {
    servers,
    tools,
    isLoading,
    error,
    refresh: fetchStatus,
    addServer,
    removeServer,
    connectServer,
    disconnectServer
  }
}
