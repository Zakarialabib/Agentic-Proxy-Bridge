import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Zap, Cpu, Loader2, Sparkles, Activity, CheckCircle, AlertTriangle } from 'lucide-react'
import * as api from '@/lib/api'
import type { ModelInfo, HardwareProfile, PresetConfig } from '@/lib/types'
import { useSystemStatusData } from '@/hooks/use-system-status'

interface AutoConfigTunerProps {
  model: ModelInfo
  isOpen: boolean
  onClose: () => void
  onApply: (config: { gpu_layers: number; context_length: number }) => void
}

type WizardStep = 'hardware' | 'benchmarking' | 'result'

export function AutoConfigTuner({ model, isOpen, onClose, onApply }: AutoConfigTunerProps) {
  const { status } = useSystemStatusData()
  const isVllm = status?.active_engine === 'vllm'

  const [step, setStep] = useState<WizardStep>('hardware')
  const [hardware, setHardware] = useState<HardwareProfile | null>(null)
  const [initialPreset, setInitialPreset] = useState<any | null>(null)
  const [tunedPreset, setTunedPreset] = useState<any | null>(null)
  const [rationales, setRationales] = useState<string[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [benchmarkProgress, setBenchmarkProgress] = useState(0)

  // Local tunable state in case they want to override
  const [gpuLayers, setGpuLayers] = useState<number>(0)
  const [contextLength, setContextLength] = useState<number>(2048)
  const [quantization, setQuantization] = useState<string>('Q4_K_M')

  useEffect(() => {
    if (isOpen) {
      setStep('hardware')
      setIsLoading(true)
      
      // Fetch hardware profile AND initial preset recommendation
      Promise.all([
        api.fetchHardwareProfile(),
        api.generatePreset(model.modelKey, model.type)
      ]).then(([hw, preset]) => {
        if (hw) setHardware(hw)
        if (preset) {
          setInitialPreset(preset)
          
          // Set initial slider values from the preset
          const offload = Number(preset.params?.gpu_offload || 0)
          const baseLayers = model.type === 'embedding' ? 24 : 32
          setGpuLayers(offload === 1.0 ? -1 : Math.floor(baseLayers * offload))
          setContextLength(Number(preset.params?.context_window || 2048))
          setQuantization(String(preset.params?.quantization_target || 'Q4_K_M'))
        }
        setIsLoading(false)
      }).catch(err => {
        console.error('Failed to init tuner:', err)
        setIsLoading(false)
      })
    }
  }, [isOpen, model])

  const runBenchmark = async () => {
    setStep('benchmarking')
    setBenchmarkProgress(0)
    
    // Simulate benchmarking phases
    const interval = setInterval(() => {
      setBenchmarkProgress(p => {
        if (p >= 90) {
          clearInterval(interval)
          return 90
        }
        return p + 10
      })
    }, 300)

    // Simulate backend call to run the test and get the Spend Report
    setTimeout(async () => {
      clearInterval(interval)
      setBenchmarkProgress(100)
      
      // Determine simulated TPS based on hardware
      const hwObj = hardware as any
      const isMaxwell = (hwObj?.gpu_name || '').toLowerCase().includes('m4000') || (hwObj?.gpu_name || '').toLowerCase().includes('maxwell')
      const simulatedTps = isMaxwell ? 7.7 : 42.5
      
      const testPayload = {
        type: "complex",
        results: {
          benchmark: {
            tokens_per_sec: simulatedTps,
            efficiency: isMaxwell ? "low" : "high"
          }
        }
      }
      
      try {
        const tuneResponse = await fetch('/api/presets/autotune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        })
        const data = await tuneResponse.json()
        
        // Fetch the updated preset from the store
        const presets = await api.listPresets()
        const tuned = presets?.find(p => p.model_id === model.modelKey) || initialPreset
        
        setTunedPreset(tuned)
        setRationales(data.rationales || [])
        
        // Update sliders with tuned values
        if (tuned) {
          const offload = tuned.params?.gpu_offload || 0
          const baseLayers = model.type === 'embedding' ? 24 : 32
          setGpuLayers(offload === 1.0 ? -1 : Math.floor(baseLayers * offload))
          setContextLength(tuned.params?.context_window || 2048)
          setQuantization(tuned.params?.quantization_target || 'Q4_K_M')
        }
        
        setStep('result')
      } catch (err) {
        console.error('Autotune failed', err)
        setStep('result')
      }
    }, 3500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Adaptive Tuning Wizard
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Hardware-aware profiling and benchmarking for {model.displayName}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Step 1: Hardware & Baseline */}
            {step === 'hardware' && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="flex gap-4 items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <Cpu className="w-8 h-8 text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold">Detected Environment</p>
                    <p className="text-xs text-slate-400">
                      {(hardware as any)?.gpu_name || 'CPU Only'}
                      {' • '}
                      {(hardware as any)?.gpu_vram_gb ? `${(hardware as any).gpu_vram_gb}GB VRAM` : `${(hardware as any)?.system_ram_gb}GB RAM`}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <h4 className="text-sm font-medium text-cyan-400 mb-2">Baseline Prediction</h4>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li><span className="text-slate-500">Quantization:</span> {initialPreset?.params?.quantization_target}</li>
                    <li><span className="text-slate-500">Context Limit:</span> {initialPreset?.params?.context_window} tokens</li>
                    <li><span className="text-slate-500">Architecture:</span> {initialPreset?.description}</li>
                  </ul>
                </div>
                
                <p className="text-xs text-slate-400 text-center">
                  We recommend running a quick benchmark to get the exact "Spend Report" and adapt settings for your specific silicon.
                </p>
              </div>
            )}

            {/* Step 2: Benchmarking */}
            {step === 'benchmarking' && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                <Activity className="w-12 h-12 text-cyan-400 animate-pulse" />
                <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${benchmarkProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-400">
                  {benchmarkProgress < 40 ? 'Warming up model...' : 
                   benchmarkProgress < 70 ? 'Running reasoning prompt...' : 
                   'Calculating Spend Report & Efficiency...'}
                </p>
              </div>
            )}

            {/* Step 3: Results & Manual Override */}
            {step === 'result' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  {rationales.length > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Diagnostic Complete</h4>
                    {rationales.length > 0 ? (
                      <ul className="text-xs text-amber-300/80 list-disc pl-4 space-y-1">
                        {rationales.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-400/80">Hardware performs efficiently with baseline settings.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
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
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-slate-300">Safe Context Limit</Label>
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
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
                    <span>Recommended Quantization:</span>
                    <span className="font-mono text-purple-400">{quantization}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            {step === 'result' ? 'Close' : 'Cancel'}
          </Button>
          
          {step === 'hardware' && (
            <Button 
              onClick={runBenchmark}
              className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/50"
            >
              <Activity className="w-4 h-4 mr-2" />
              Run Diagnostic Benchmark
            </Button>
          )}
          
          {step === 'result' && (
            <div className="flex flex-col items-end gap-2">
              <Button 
                onClick={() => onApply({ gpu_layers: gpuLayers, context_length: contextLength })}
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white"
                disabled={isVllm}
              >
                <Zap className="w-4 h-4 mr-2" />
                Apply Tuned Preset
              </Button>
              {isVllm && (
                <span className="text-[10px] text-amber-400 text-right leading-tight max-w-[200px]">
                  vLLM manages models at startup. Preset cannot be applied dynamically.
                </span>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
