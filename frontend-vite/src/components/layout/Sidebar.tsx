

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wifi, Timer, Clock, MemoryStick, Cpu, Microchip, Rocket, Sparkles, Flame, Thermometer, Snowflake, Loader2 } from 'lucide-react'
import type { ProxyStatus, ModelInfo } from '@/lib/types'
import { PROXY_PORT } from '@/lib/types'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface SidebarProps {
  status: ProxyStatus | null
  models: { instance_id: string; type: string; load_time_seconds: number }[]
  availableModels: ModelInfo[]
  uptime: number
  selectedModel: string | null
  onModelSelect: (modelId: string) => void
  onLoadModel: (modelId: string) => void
  onUnloadModel: (instanceId: string) => void
  loadingModel: string | null
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

export function Sidebar({ status, models, availableModels, uptime, selectedModel, onModelSelect, onLoadModel, onUnloadModel, loadingModel }: SidebarProps) {
  const { lmStudioHost, lmStudioPort } = useSettingsStore()
  const lmStudioUrl = `http://${lmStudioHost}:${lmStudioPort}`
  const loadedModels = models

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
              {lmStudioUrl}
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
            <Sparkles className="w-4 h-4 text-purple-400" />
            Active Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedModel ?? ''} onValueChange={onModelSelect}>
            <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white h-9 text-xs">
              <SelectValue placeholder="Select a model..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
              {availableModels.length === 0 ? (
                <div className="p-2 text-xs text-slate-500 text-center">No models available</div>
              ) : (
                availableModels.map(model => (
                  <SelectItem key={model.id} value={model.id} className="text-white text-xs">
                    {model.name ?? model.id}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedModel && (
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] flex-1 justify-center">
                {selectedModel}
              </Badge>
            </div>
          )}
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
          {loadedModels.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">No models loaded</p>
          ) : (
            loadedModels.map(model => (
              <div key={model.instance_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Microchip className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{model.instance_id}</p>
                    <p className="text-xs text-slate-500">{model.type} • {model.load_time_seconds}s</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-slate-500 hover:text-red-400 shrink-0"
                  onClick={() => onUnloadModel(model.instance_id)}
                  disabled={loadingModel === model.instance_id}
                >
                  {loadingModel === model.instance_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Snowflake className="w-3 h-3" />}
                </Button>
              </div>
            ))
          )}
          {availableModels.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 mt-2"
              onClick={() => {
                const unloaded = availableModels.find(m => !m.loaded)
                if (unloaded) onLoadModel(unloaded.id)
              }}
              disabled={loadingModel !== null}
            >
              {loadingModel ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Rocket className="w-3 h-3 mr-1" />}
              Load Model
            </Button>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
