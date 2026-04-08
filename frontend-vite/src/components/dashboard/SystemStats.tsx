import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cpu, MessageSquare, Wrench, Brain, BookOpen, Sparkles } from 'lucide-react'
import type { ProxyStatus } from '@/lib/types'

interface SystemStatsProps {
  status: ProxyStatus | null
}

export function SystemStats({ status }: SystemStatsProps) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          System Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MessageSquare className="w-3 h-3" />
            Active Sessions
          </div>
          <span className="text-sm font-semibold text-white">{status?.active_sessions || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Wrench className="w-3 h-3" />
            Tools Registered
          </div>
          <span className="text-sm font-semibold text-white">{status?.tools_registered || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Brain className="w-3 h-3" />
            Knowledge Nodes
          </div>
          <span className="text-sm font-semibold text-white">{status?.knowledge_graph?.nodes || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen className="w-3 h-3" />
            Documents
          </div>
          <span className="text-sm font-semibold text-white">{status?.knowledge_graph?.documents?.count || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-3 h-3" />
            Pre-warmed Tools
          </div>
          <span className="text-sm font-semibold text-white">{status?.pre_triggering?.pre_warmed_tools || 0}</span>
        </div>
      </CardContent>
    </Card>
  )
}
