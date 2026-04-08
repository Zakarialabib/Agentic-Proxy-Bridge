import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Zap, Cpu, Loader2, Sparkles } from 'lucide-react'
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
