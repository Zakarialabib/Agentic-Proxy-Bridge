

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Layers, HeartPulse, Heart, Clock, Radio, History, Inbox, Milestone, Lightbulb,
  Mountain, TreeDeciduous, Flag, MessageSquare, Bug, CheckCircle2, AlertTriangle,
  AlertCircle, Siren, ArrowUpRight, ArrowDownRight, MinusCircle, ArrowRight,
  Fingerprint, Zap, Database
} from 'lucide-react'
import type { 
  VRAMTetrisBlock, ThreeTimeHorizon, HealthOrganism, ConfidencePoint, 
  PresetNode, SessionNarrative, Negotiation, FailureRecord 
} from '@/lib/types'

interface ObservabilityPanelProps {
  vramTetris: VRAMTetrisBlock[]
  threeTimeHorizon: ThreeTimeHorizon | null
  healthOrganism: HealthOrganism | null
  confidencePoints: ConfidencePoint[]
  presetLineage: PresetNode[]
  sessionNarrative: SessionNarrative | null
  negotiations: Negotiation[]
  failures: FailureRecord[]
}

export function ObservabilityPanel({
  vramTetris,
  threeTimeHorizon,
  healthOrganism,
  confidencePoints,
  sessionNarrative,
  negotiations,
  failures,
}: ObservabilityPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-400" />
              VRAM Tetris
              <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">Territory Map</Badge>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Models claim space • Temperature colors indicate activity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-16 bg-slate-900/50 rounded-lg overflow-hidden mb-3">
              {vramTetris?.map((block) => (
                <div
                  key={block.id}
                  className={`absolute top-0 bottom-0 flex items-center justify-center text-xs font-medium transition-all duration-500 ${
                    block.fragment ? 'animate-pulse' : ''
                  } bg-gradient-to-r ${block.color} ${block.moving ? 'animate-bounce' : ''}`}
                  style={{
                    left: `${block.start}%`,
                    width: `${block.size}%`,
                  }}
                  title={block.name}
                >
                  <span className="truncate px-1 text-white drop-shadow-lg">
                    {block.fragment ? '▪' : block.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {vramTetris?.filter(b => !b.fragment && b.name !== 'Empty' && b.name !== 'Potential').map((block) => (
                <div key={block.id} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/50">
                  <span className={`w-2 h-2 rounded-full ${
                    block.temperature === 'hot' ? 'bg-red-400' :
                    block.temperature === 'warm' ? 'bg-orange-400' : 'bg-cyan-400'
                  }`} />
                  <span className="text-slate-300">{block.name}</span>
                  <span className="text-slate-500">{block.size}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <HeartPulse className={`w-5 h-5 ${healthOrganism && healthOrganism.overall_health > 0.7 ? 'text-emerald-400' : healthOrganism && healthOrganism.overall_health > 0.4 ? 'text-amber-400' : 'text-red-400'}`} />
              Health Organism
              <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">Body Metaphor</Badge>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tools as organs • Connections as veins • System breathes with activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <div 
                className="relative"
                style={{ 
                  animation: healthOrganism ? `pulse ${2 / healthOrganism.breathing_rate}s ease-in-out infinite` : 'none'
                }}
              >
                <Heart className={`w-12 h-12 ${
                  healthOrganism && healthOrganism.overall_health > 0.7 ? 'text-emerald-400' :
                  healthOrganism && healthOrganism.overall_health > 0.4 ? 'text-amber-400' : 'text-red-400'
                }`} />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-white">
                  {healthOrganism ? Math.round(healthOrganism.overall_health * 100) : 0}%
                </p>
                <p className="text-xs text-slate-400">Overall Health</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {healthOrganism?.organs?.map((organ, i) => (
                <div key={i} className="text-center">
                  <div 
                    className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                      organ.health === 'healthy' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                      organ.health === 'sick' ? 'bg-amber-500/20 border border-amber-500/30' :
                      'bg-red-500/20 border border-red-500/30 animate-pulse'
                    }`}
                  >
                    {organ.health === 'healthy' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : organ.health === 'sick' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{organ.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Three-Time Horizon
            <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">NOW • RECENT • DEEP</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="p-4 rounded-xl bg-gradient-to-b from-red-500/10 to-transparent border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                <h3 className="font-semibold text-red-400">NOW</h3>
              </div>
              <div className="space-y-2">
                {threeTimeHorizon?.now?.alerts?.map((alert) => (
                  <div key={alert.id} className={`p-2 rounded text-xs ${
                    alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                    alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-700/50 text-slate-300'
                  }`}>
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-amber-400">RECENT</h3>
              </div>
              <div className="space-y-2">
                {threeTimeHorizon?.recent?.trends?.map((trend, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{trend.metric}</span>
                    <span className={
                      trend.direction === 'improving' ? 'text-emerald-400' :
                      trend.direction === 'declining' ? 'text-red-400' : 'text-slate-400'
                    }>
                      {trend.change > 0 ? '+' : ''}{trend.change}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Inbox className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-purple-400">DEEP</h3>
              </div>
              <div className="space-y-2">
                {threeTimeHorizon?.deep?.evolution?.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Milestone className="w-3 h-3 text-purple-400" />
                    <span className="text-slate-500">{ev.date}</span>
                    <span className="text-slate-300">{ev.event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-cyan-400" />
              Session Narrative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${sessionNarrative?.phases?.find(p => p.active)?.progress || 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {sessionNarrative?.phases?.map((phase, i) => (
                <div 
                  key={phase.name}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    phase.active ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-slate-900/50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    phase.progress === 100 ? 'bg-emerald-500 text-white' :
                    phase.active ? 'bg-cyan-500 text-white animate-pulse' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${phase.active ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {phase.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Negotiations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!negotiations || negotiations.length === 0) ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p>No pending negotiations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {negotiations?.map((neg) => (
                  <div 
                    key={neg.id}
                    className={`p-3 rounded-lg border ${
                      neg.urgency === 'high' ? 'bg-red-500/10 border-red-500/30' :
                      neg.urgency === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                      'bg-slate-900/50 border-slate-700'
                    }`}
                  >
                    <p className="text-sm text-slate-300">{neg.question}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {neg.options.map((opt) => (
                        <Button 
                          key={opt.id}
                          size="sm"
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-400" />
              Failure Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!failures || failures.length === 0) ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p>No recent failures</p>
              </div>
            ) : (
              <div className="space-y-4">
                {failures?.map((failure) => (
                  <div key={failure.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <Badge className="bg-red-500/20 text-red-400 border-0">{failure.type}</Badge>
                      {failure.resolved && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
