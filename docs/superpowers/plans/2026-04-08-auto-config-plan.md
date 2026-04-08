# Auto-Config Tuner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a "Magic Auto-Config" tuner button within the `ModelManager` that suggests and applies optimal load parameters (GPU layers, context length) based on hardware detection and model size.
**Architecture:** Add an `AutoConfigTuner` dialog component that is triggered from `ModelManager`. When a user wants to load a model, they can use this tuner to get the optimal settings.
**Tech Stack:** React, TailwindCSS, `lucide-react`, `shadcn/ui` Dialog.

---

### Task 1: Create Auto-Config Tuner Component

**Files:**
- Create: `/workspace/frontend-vite/src/components/inference/AutoConfigTuner.tsx`

- [ ] **Step 1: Write AutoConfigTuner.tsx**

```tsx
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Zap, Cpu, MemoryStick, Loader2, Sparkles } from 'lucide-react'
import * as api from '@/lib/api'
import type { ModelInfo, HardwareProfile } from '@/lib/types'

interface AutoConfigTunerProps {
  model: ModelInfo
  isOpen: boolean
  onClose: () => void
  onApply: (config: { gpu_layers: number; context_length: number }) => void
}

export function AutoConfigTuner({ model, isOpen, onClose, onApply }: AutoConfigTunerProps) {
  const [hardware, setHardware] = useState<HardwareProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gpuLayers, setGpuLayers] = useState<number>(0)
  const [contextLength, setContextLength] = useState<number>(2048)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      api.fetchHardwareProfile().then(hw => {
        if (hw) {
          setHardware(hw)
          calculateOptimal(hw)
        }
        setIsLoading(false)
      })
    }
  }, [isOpen, model])

  const calculateOptimal = (hw: HardwareProfile) => {
    // Basic heuristic: 
    // 1 GB VRAM ~= ~4-5 GGUF layers for a 7B model. 
    // We try to fit as much as possible into VRAM.
    
    let availableVram = hw.gpu_vram_gb || 0
    if (hw.apple_silicon) {
      availableVram = hw.system_ram_gb * 0.75
    }

    if (availableVram === 0) {
      setGpuLayers(0) // CPU only
      setContextLength(2048)
      return
    }

    const modelSizeGB = model.sizeGB || 4.5
    
    if (availableVram > modelSizeGB + 1) {
      // Full offload
      setGpuLayers(-1) // -1 usually means all layers in LM Studio/llama.cpp
      setContextLength(8192)
    } else {
      // Partial offload (rough estimate)
      const ratio = availableVram / (modelSizeGB + 1)
      const maxLayers = 32 // Assuming ~32 layers for 7B
      setGpuLayers(Math.floor(maxLayers * ratio))
      setContextLength(4096)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Auto-Config Tuner
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Intelligent parameter optimization for {model.displayName} based on your hardware.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex gap-4 items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <Cpu className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-sm font-semibold">Detected Environment</p>
                <p className="text-xs text-slate-400">
                  {hardware?.apple_silicon ? 'Apple Silicon (Unified Memory)' : (hardware?.gpu_name || 'CPU Only')}
                  {' • '}
                  {hardware?.gpu_vram_gb ? `${hardware.gpu_vram_gb}GB VRAM` : `${hardware?.system_ram_gb}GB RAM`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-slate-300">GPU Offload Layers</Label>
                  <span className="text-xs text-cyan-400">{gpuLayers === -1 ? 'Max (All)' : gpuLayers}</span>
                </div>
                <Slider 
                  value={[gpuLayers === -1 ? 100 : gpuLayers]} 
                  max={100} 
                  step={1}
                  onValueChange={([val]) => setGpuLayers(val === 100 ? -1 : val)}
                  className="[&_[role=slider]]:bg-cyan-400 [&_[data-orientation=horizontal]]:bg-slate-700"
                />
                <p className="text-[10px] text-slate-500">More layers = faster generation, but requires more VRAM.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-slate-300">Context Window</Label>
                  <span className="text-xs text-emerald-400">{contextLength} tokens</span>
                </div>
                <Slider 
                  value={[contextLength]} 
                  min={512}
                  max={32768} 
                  step={512}
                  onValueChange={([val]) => setContextLength(val)}
                  className="[&_[role=slider]]:bg-emerald-400 [&_[data-orientation=horizontal]]:bg-slate-700"
                />
                <p className="text-[10px] text-slate-500">Larger context allows more history but uses VRAM quadratically.</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
          <Button 
            onClick={() => onApply({ gpu_layers: gpuLayers, context_length: contextLength })}
            className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Apply & Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Task 2: Integrate Auto-Config Tuner into ModelManager

**Files:**
- Modify: `/workspace/frontend-vite/src/components/inference/ModelManager.tsx`

- [ ] **Step 1: Update ModelManager to open the Tuner dialog**

```tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, Thermometer, Snowflake, MemoryStick, Database, Plus, Minus, Wand2 } from 'lucide-react'
import type { ModelInfo } from '@/lib/types'
import { AutoConfigTuner } from './AutoConfigTuner'

interface ModelManagerProps {
  models: ModelInfo[]
  onToggleModel: (modelKey: string, currentlyLoaded: boolean, config?: any) => void
}

function ModelCard({ model, onToggle, onAutoConfig }: { model: ModelInfo, onToggle: () => void, onAutoConfig: () => void }) {
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
        <div className="flex gap-1">
          {!model.loaded && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAutoConfig}
              className="bg-slate-800/50 hover:bg-slate-700 text-indigo-400 border-indigo-500/30"
              title="Auto Config Tuner"
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          )}
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
  const [tunerModel, setTunerModel] = useState<ModelInfo | null>(null)

  return (
    <>
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MemoryStick className="w-5 h-5 text-cyan-400" />
            Model Selection
          </CardTitle>
          <CardDescription className="text-slate-400">
            Select models to load or use the Magic Tuner to auto-configure parameters for your hardware.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map(model => (
              <ModelCard 
                key={model.id} 
                model={model} 
                onToggle={() => onToggleModel(model.modelKey, model.loaded)}
                onAutoConfig={() => setTunerModel(model)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {tunerModel && (
        <AutoConfigTuner
          model={tunerModel}
          isOpen={true}
          onClose={() => setTunerModel(null)}
          onApply={(config) => {
            onToggleModel(tunerModel.modelKey, false, config)
            setTunerModel(null)
          }}
        />
      )}
    </>
  )
}
```
