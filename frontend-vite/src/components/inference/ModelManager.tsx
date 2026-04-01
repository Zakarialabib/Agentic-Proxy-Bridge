'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, Thermometer, Snowflake, MemoryStick, Database, Plus, Minus } from 'lucide-react'
import type { ModelInfo } from '@/lib/types'

interface ModelManagerProps {
  models: ModelInfo[]
  onToggleModel: (modelKey: string, currentlyLoaded: boolean) => void
}

function ModelCard({ model, onToggle }: { model: ModelInfo, onToggle: () => void }) {
  const typeColor = model.type === 'llm'
    ? 'from-cyan-500/10 to-emerald-500/10 border-cyan-500/20'
    : 'from-purple-500/10 to-pink-500/10 border-purple-500/20'

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${
      model.loaded 
        ? `bg-gradient-to-br ${typeColor} shadow-lg` 
        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white text-sm truncate">{model.displayName}</h4>
            <ModelStateBadge loaded={model.loaded} state="warm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400">{model.type}</Badge>
            {model.params && <span>{model.params}</span>}
            {model.quantization && <span className="text-slate-500">{String(model.quantization)}</span>}
          </div>
        </div>
        <Button
          size="sm"
          variant={model.loaded ? "destructive" : "default"}
          onClick={onToggle}
          className={model.loaded 
            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" 
            : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
          }
        >
          {model.loaded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="text-center p-2 rounded-lg bg-slate-900/50">
          <MemoryStick className="w-3 h-3 mx-auto mb-1 text-purple-400" />
          <p className="text-[10px] text-slate-400">Size</p>
          <p className="text-xs font-semibold text-white">{model.sizeGB}GB</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-900/50">
          <Database className="w-3 h-3 mx-auto mb-1 text-cyan-400" />
          <p className="text-[10px] text-slate-400">Format</p>
          <p className="text-xs font-semibold text-white">{model.format}</p>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-500 truncate">{model.modelKey}</p>
    </div>
  )
}

function ModelStateBadge({ loaded, state }: { loaded: boolean, state?: 'hot' | 'warm' | 'cold' }) {
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

export function ModelManager({ models, onToggleModel }: ModelManagerProps) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MemoryStick className="w-5 h-5 text-cyan-400" />
          Model Selection
        </CardTitle>
        <CardDescription className="text-slate-400">
          Select models to load. VRAM budget is dynamically calculated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map(model => (
            <ModelCard 
              key={model.id} 
              model={model} 
              onToggle={() => onToggleModel(model.modelKey, model.loaded)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
