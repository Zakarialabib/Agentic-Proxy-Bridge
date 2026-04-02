

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Network, Bot, Wrench, Clock, Pause } from 'lucide-react'
import type { MCPServer, A2AAgent, AsyncTask } from '@/lib/types'

interface ProtocolsPanelProps {
  mcpServers: MCPServer[]
  a2aAgents: A2AAgent[]
  asyncTasks: AsyncTask[]
}

function HealthBadge({ health }: { health: string }) {
  const { CheckCircle2, AlertTriangle, XCircle, Minus } = require('lucide-react')
  
  switch (health) {
    case 'healthy': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Healthy</Badge>
    case 'degraded': return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Degraded</Badge>
    case 'unavailable': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><XCircle className="w-3 h-3" />Offline</Badge>
    default: return <Badge>{health}</Badge>
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'available': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Available</Badge>
    case 'busy': return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Busy</Badge>
    case 'offline': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Offline</Badge>
    case 'pending': return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Pending</Badge>
    case 'running': return <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">Running</Badge>
    case 'completed': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</Badge>
    case 'failed': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Failed</Badge>
    default: return <Badge>{status}</Badge>
  }
}

export function ProtocolsPanel({ mcpServers, a2aAgents, asyncTasks }: ProtocolsPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            MCP Servers (Tool Fabric)
          </CardTitle>
          <CardDescription className="text-slate-400">
            External tool servers via MCP protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {mcpServers.map((server) => (
                <div key={server.name} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{server.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-slate-400 text-xs">{server.transport}</Badge>
                      <HealthBadge health={server.health} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Wrench className="w-4 h-4" />
                    <span>{server.tools_count} tools</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            A2A Agents (Agent Messaging)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Peer agents for delegation and collaboration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {a2aAgents.map((agent) => (
                <div key={agent.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{agent.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-slate-400 text-xs">{agent.current_tasks} tasks</Badge>
                      <StatusBadge status={agent.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export function AsyncTasksPanel({ asyncTasks }: { asyncTasks: AsyncTask[] }) {
  return (
    <Card className="mt-6 bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Async Tasks
        </CardTitle>
        <CardDescription className="text-slate-400">
          Long-running tool executions and agent delegations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          {asyncTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[150px] text-slate-500">
              <Pause className="w-8 h-8 mb-2" />
              <p>No async tasks running</p>
            </div>
          ) : (
            <div className="space-y-2">
              {asyncTasks.map((task) => (
                <div key={task.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white">{task.tool_or_agent}</span>
                    <p className="text-xs text-slate-400">{task.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-slate-400 text-xs">{task.type}</Badge>
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
