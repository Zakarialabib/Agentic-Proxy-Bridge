import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProxyStatus } from '@/lib/types'

interface ChatSettingsProps {
  status: ProxyStatus | null
}

export function ChatSettings({ status }: ChatSettingsProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Current Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Approval Mode</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-0">{status?.approval_mode || 'supervised'}</Badge>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>MCP Servers</span>
            <Badge className="bg-slate-700 text-slate-300 border-0">{status?.protocols?.mcp?.servers || 0}</Badge>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>A2A Agents</span>
            <Badge className="bg-slate-700 text-slate-300 border-0">{status?.protocols?.a2a?.agents || 0}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs font-mono bg-slate-900/50 p-3 rounded-lg">
            <p className="text-slate-500"># Chat Completions</p>
            <p className="text-cyan-400">POST /v1/chat/completions</p>
            <p className="text-slate-500 mt-2"># Orchestrate</p>
            <p className="text-purple-400">POST /v1/agent/orchestrate</p>
            <p className="text-slate-500 mt-2"># Knowledge Query</p>
            <p className="text-emerald-400">GET /knowledge</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
