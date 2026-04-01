

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { Tool } from '@/lib/types'

interface ToolsPanelProps {
  tools: Tool[]
}

function SafetyBadge({ level }: { level: string }) {
  switch (level) {
    case 'autonomous': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Autonomous</Badge>
    case 'supervised': return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Supervised</Badge>
    case 'manual': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Manual</Badge>
    default: return <Badge>{level}</Badge>
  }
}

function HealthIcon({ health }: { health: string }) {
  const { CheckCircle2, AlertTriangle, XCircle, Minus } = require('lucide-react')
  
  switch (health) {
    case 'healthy': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    case 'degraded': return <AlertTriangle className="w-4 h-4 text-amber-400" />
    case 'unavailable': return <XCircle className="w-4 h-4 text-red-400" />
    default: return <Minus className="w-4 h-4 text-slate-400" />
  }
}

export function ToolsPanel({ tools }: ToolsPanelProps) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Tool Registry</CardTitle>
        <CardDescription className="text-slate-400">
          {tools.length} tools available across all protocols
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {tools.map((tool, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">{tool.name}</span>
                  <div className="flex items-center gap-2">
                    {tool.source && (
                      <Badge variant="outline" className={`text-xs ${
                        tool.source.startsWith('mcp') ? 'text-cyan-400 border-cyan-500/30' : 'text-slate-400 border-slate-600'
                      }`}>
                        {tool.source}
                      </Badge>
                    )}
                    {tool.health && <HealthIcon health={tool.health} />}
                    <SafetyBadge level={tool.safety_level} />
                  </div>
                </div>
                <p className="text-sm text-slate-400">{tool.description}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
