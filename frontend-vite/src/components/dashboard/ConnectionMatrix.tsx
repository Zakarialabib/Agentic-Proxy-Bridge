import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wifi } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { ProxyStatus } from '@/lib/types'

interface ConnectionMatrixProps {
  status: ProxyStatus | null
}

export function ConnectionMatrix({ status }: ConnectionMatrixProps) {
  const { lmStudioHost, lmStudioPort } = useSettingsStore()
  const lmStudioUrl = `http://${lmStudioHost}:${lmStudioPort}`
  
  return (
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          Connection Matrix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {status?.active_engine === 'vllm' ? 'vLLM' : 'LM Studio'}
            </span>
            {status?.lmstudio_connected ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Connected</Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Offline</Badge>
            )}
          </div>
          <div className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded">
            {lmStudioUrl}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">MCP Servers</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-xs">
              {status?.protocols?.mcp?.healthy || 0}/{status?.protocols?.mcp?.servers || 0}
            </Badge>
          </div>
          <div className="text-xs text-slate-300">
            {status?.protocols?.mcp?.tools || 0} tools available
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">A2A Agents</span>
            <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs">
              {status?.protocols?.a2a?.available || 0}/{status?.protocols?.a2a?.agents || 0}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
