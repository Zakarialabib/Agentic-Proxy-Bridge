'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wifi, Timer, Clock, MemoryStick, Cpu, Microchip, Rocket, Sparkles, Flame, Thermometer, Snowflake } from 'lucide-react'
import type { ProxyStatus, ModelInfo } from '@/lib/types'
import { PROXY_PORT } from '@/lib/types'

interface SidebarProps {
  status: ProxyStatus | null
  models: ModelInfo[]
  uptime: number
}

function ModelStateBadgeComponent({ loaded, state }: { loaded: boolean, state?: 'hot' | 'warm' | 'cold' }) {
  if (!loaded) return <Badge variant="outline" className="text-slate-500 border-slate-600">Unloaded</Badge>
  
  const stateConfig = {
    hot: { icon: Flame, color: 'text-orange-400 bg-orange-500/20 border-orange-500/30', label: 'Hot' },
    warm: { icon: Thermometer, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30', label: 'Warm' },
    cold: { icon: Snowflake, color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30', label: 'Cold' }
  }
  
  const config = stateConfig[state || 'warm']
  const Icon = config.icon
  
  return (
    <Badge className={`${config.color} border flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

export function Sidebar({ status, models, uptime }: SidebarProps) {
  const loadedModels = models.filter(m => m.loaded)

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  return (
    <aside className="hidden lg:block w-72 shrink-0 space-y-4">
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
              <span className="text-xs text-slate-400">LM Studio</span>
              {status?.lmstudio_connected ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Connected</Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Offline</Badge>
              )}
            </div>
            <div className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded">
              http://192.168.1.12:1234
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Timer className="w-3 h-3" />
              <span>12ms latency</span>
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Bridge Proxy</span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                Running
              </Badge>
            </div>
            <div className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded">
              http://localhost:{PROXY_PORT}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Uptime: {formatUptime(uptime)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-purple-400" />
            VRAM Budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <Rocket className="w-3 h-3 mr-1" />
              Speed
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Sparkles className="w-3 h-3 mr-1" />
              Quality
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Active Models
            </span>
            <Badge className="bg-slate-700 text-slate-300 border-0">
              {loadedModels.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadedModels.map(model => (
            <div key={model.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Microchip className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-xs font-medium text-white">{model.name}</p>
                  <p className="text-xs text-slate-500">{model.vram}GB</p>
                </div>
              </div>
              <ModelStateBadgeComponent loaded={true} state="warm" />
            </div>
          ))}
        </CardContent>
      </Card>
    </aside>
  )
}
