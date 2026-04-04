import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tool } from '@/lib/types'
import { Wrench, Zap, Brain, GitBranch } from 'lucide-react'

interface OrchestratePanelProps {
  tools: Tool[]
  agents: any[]
}

export function OrchestratePanel({ tools, agents }: OrchestratePanelProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-cyan-400" />
            Tool Orchestration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tools.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tools registered</p>
              <p className="text-sm">Tools will appear here when the proxy registers them</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <div key={tool.name} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{tool.name}</span>
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      {tool.safety_level}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{tool.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            Agent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No active agent sessions</p>
              <p className="text-sm">Agent sessions will appear here when triggered</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent: any) => (
                <div key={agent.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{agent.name}</span>
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {agent.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{agent.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
