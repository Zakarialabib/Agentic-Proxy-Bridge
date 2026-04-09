import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Send, Sparkles, Settings, RefreshCw, Command, Zap } from 'lucide-react'
import type { ModelPresetConfig, ModelInfo } from '@/lib/types'
import { ModelSelector } from '@/components/model-selector'
import { cn } from '@/lib/utils'
import type { LoadedModelInstance } from '@/hooks/use-models'

interface ChatInputProps {
  isLoading: boolean
  currentModel: string | null
  modelPresets: ModelPresetConfig[]
  selectedModelPreset: string
  inputMessage: string
  onInputChange: (value: string) => void
  onSend: () => void
  onModelSelect: (modelId: string) => void
  onPresetSelect: (presetId: string) => void
  onRefreshModels: () => void
  showModelSelector: boolean
  onShowModelSelector: (show: boolean) => void
  availableModels: ModelInfo[]
  loadedModels: LoadedModelInstance[]
  onLoadModel: (modelId: string) => Promise<void> | void
  onUnloadModel: (modelId: string) => Promise<void> | void
  loadingModel: string | null
  modelError?: string | null
  showAdvancedSettings: boolean
  onShowAdvancedSettings: (show: boolean) => void
  streamingEnabled: boolean
  onStreamingChange: (enabled: boolean) => void
  chatTemperature: number
  chatTopP: number
  chatMinP: number
  chatRepeatPenalty: number
  chatMaxTokens: number
  chatContextLength: number
  chatThinkingMode: boolean
  contextStrategy: 'full' | 'prune' | 'summarize'
  systemPrompt: string
  onTemperatureChange: (value: number) => void
  onTopPChange: (value: number) => void
  onMinPChange: (value: number) => void
  onRepeatPenaltyChange: (value: number) => void
  onMaxTokensChange: (value: number) => void
  onContextLengthChange: (value: number) => void
  onThinkingModeChange: (enabled: boolean) => void
  onContextStrategyChange: (value: 'full' | 'prune' | 'summarize') => void
  onSystemPromptChange: (value: string) => void
}

export function ChatInput({
  isLoading,
  currentModel,
  modelPresets,
  selectedModelPreset,
  inputMessage,
  onInputChange,
  onSend,
  onModelSelect,
  onPresetSelect,
  onRefreshModels,
  showModelSelector,
  onShowModelSelector,
  availableModels,
  loadedModels,
  onLoadModel,
  onUnloadModel,
  loadingModel,
  modelError = null,
  showAdvancedSettings,
  onShowAdvancedSettings,
  streamingEnabled,
  onStreamingChange,
  chatTemperature,
  chatTopP,
  chatMinP,
  chatRepeatPenalty,
  chatMaxTokens,
  chatContextLength,
  chatThinkingMode,
  contextStrategy,
  systemPrompt,
  onTemperatureChange,
  onTopPChange,
  onMinPChange,
  onRepeatPenaltyChange,
  onMaxTokensChange,
  onContextLengthChange,
  onThinkingModeChange,
  onContextStrategyChange,
  onSystemPromptChange,
}: ChatInputProps) {
  
  const estimatedTokens = Math.ceil(inputMessage.length / 4);

  return (
    <div className="p-4 md:p-6 bg-slate-900/40 backdrop-blur-xl border-t border-slate-700/50 relative z-10">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Model Selection Row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => onShowModelSelector(!showModelSelector)}
            variant="outline"
            className={cn(
              "h-8 px-3 text-xs border-slate-700 transition-all duration-300",
              currentModel ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-400'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            {currentModel ? currentModel.split('/').pop() : 'Select Foundation Model'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onRefreshModels}
            className="h-8 w-8 p-0 text-slate-500 hover:text-white"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {modelPresets.length > 0 && (
            <Select value={selectedModelPreset} onValueChange={onPresetSelect}>
              <SelectTrigger className="w-[140px] bg-slate-900/50 border-slate-700 text-slate-300 h-8 text-[10px] uppercase tracking-wider font-semibold">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {modelPresets.map(preset => (
                  <SelectItem key={preset.id} value={preset.id} className="text-white text-xs">
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onShowAdvancedSettings(!showAdvancedSettings)}
            className={cn(
              "h-8 px-2 text-[10px] uppercase tracking-wider font-bold transition-all",
              showAdvancedSettings ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500'
            )}
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Config
          </Button>
        </div>

        {/* Floating Panels */}
        {showModelSelector && (
          <div className="absolute bottom-[100%] left-4 right-4 mb-4 p-4 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 shadow-2xl animate-in fade-in zoom-in-95 fill-mode-both">
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3 text-cyan-400" />
              Available Local Instances
            </h3>
            <ModelSelector 
              selectedModel={currentModel ?? undefined}
              availableModels={availableModels}
              loadedModels={loadedModels}
              onLoadModel={onLoadModel}
              onUnloadModel={onUnloadModel}
              loadingModel={loadingModel}
              error={modelError}
              onModelLoaded={(modelId) => {
                onModelSelect(modelId)
                onShowModelSelector(false)
              }}
              onModelUnloaded={() => {}}
              disabled={isLoading}
            />
          </div>
        )}

        {showAdvancedSettings && (
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-4 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">System Directives</Label>
                  <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-500">Global context</Badge>
                </div>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => onSystemPromptChange(e.target.value)}
                  placeholder="You are a specialized agentic bridge..."
                  className="bg-slate-900/50 border-slate-700 text-white text-xs min-h-[100px] focus-visible:ring-cyan-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Temp</span>
                      <span className="text-cyan-400 font-mono">{chatTemperature}</span>
                    </div>
                    <Slider
                      value={[chatTemperature]}
                      onValueChange={([v]) => onTemperatureChange(v)}
                      min={0} max={2} step={0.1}
                      className="py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Top P</span>
                      <span className="text-cyan-400 font-mono">{chatTopP}</span>
                    </div>
                    <Slider
                      value={[chatTopP]}
                      onValueChange={([v]) => onTopPChange(v)}
                      min={0} max={1} step={0.05}
                      className="py-2"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Reasoning</Label>
                    <div className="flex items-center gap-2 bg-slate-900/40 p-2 rounded-lg border border-slate-700">
                      <Switch
                        checked={chatThinkingMode}
                        onCheckedChange={onThinkingModeChange}
                        className="scale-75 origin-left"
                      />
                      <span className="text-[10px] text-slate-300">Enable thinking</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Streaming</Label>
                    <div className="flex items-center gap-2 bg-slate-900/40 p-2 rounded-lg border border-slate-700">
                      <Switch
                        checked={streamingEnabled}
                        onCheckedChange={onStreamingChange}
                        className="scale-75 origin-left"
                      />
                      <span className="text-[10px] text-slate-300">Stream tokens</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Context Window</Label>
                    <Select value={String(chatContextLength)} onValueChange={(v) => onContextLengthChange(parseInt(v))}>
                      <SelectTrigger className="h-7 bg-slate-900/50 border-slate-700 text-white text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="2048">2K</SelectItem>
                        <SelectItem value="4096">4K</SelectItem>
                        <SelectItem value="8192">8K</SelectItem>
                        <SelectItem value="16384">16K</SelectItem>
                        <SelectItem value="32768">32K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Context Strategy</Label>
                    <Select value={contextStrategy} onValueChange={(v) => onContextStrategyChange(v as 'full' | 'prune' | 'summarize')}>
                      <SelectTrigger className="h-7 bg-slate-900/50 border-slate-700 text-white text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="prune">Prune</SelectItem>
                        <SelectItem value="summarize">Summarize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="relative group">
          <Textarea
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Describe the task or ask a question..."
            className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/30 min-h-[60px] max-h-[200px] resize-none pr-16 py-4 rounded-2xl shadow-inner scrollbar-hide"
          />
          
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
             <div className="text-[9px] font-mono text-slate-500 mr-2 flex flex-col items-end opacity-0 group-focus-within:opacity-100 transition-opacity">
                <span>{inputMessage.length} chars</span>
                <span>~{estimatedTokens} tokens</span>
             </div>
             
             <Button 
              onClick={onSend} 
              disabled={isLoading || !inputMessage.trim() || !currentModel}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl transition-all duration-500",
                inputMessage.trim() && currentModel 
                  ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]" 
                  : "bg-slate-700 text-slate-500"
              )}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Footer shortcuts info */}
        <div className="flex justify-center gap-4 text-[9px] text-slate-600 font-medium uppercase tracking-[0.2em]">
          <span className="flex items-center gap-1"><Command className="w-2.5 h-2.5" /> + ENTER TO SEND</span>
          <span className="flex items-center gap-1">SHIFT + ENTER FOR NEW LINE</span>
        </div>
      </div>
    </div>
  )
}
