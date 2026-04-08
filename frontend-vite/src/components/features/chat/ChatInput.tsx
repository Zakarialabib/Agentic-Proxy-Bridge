import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Send, Sparkles, Settings, RefreshCw } from 'lucide-react'
import type { ModelPresetConfig } from '@/lib/types'
import { ModelSelector } from '@/components/model-selector'

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
  showAdvancedSettings: boolean
  onShowAdvancedSettings: (show: boolean) => void
  chatTemperature: number
  chatMaxTokens: number
  chatContextLength: number
  chatThinkingMode: boolean
  onTemperatureChange: (value: number) => void
  onMaxTokensChange: (value: number) => void
  onContextLengthChange: (value: number) => void
  onThinkingModeChange: (enabled: boolean) => void
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
  showAdvancedSettings,
  onShowAdvancedSettings,
  chatTemperature,
  chatMaxTokens,
  chatContextLength,
  chatThinkingMode,
  onTemperatureChange,
  onMaxTokensChange,
  onContextLengthChange,
  onThinkingModeChange,
}: ChatInputProps) {
  return (
    <div className="p-4 border-t border-slate-700/50">
      <div className="mb-3">
        <Button 
          onClick={() => onShowModelSelector(!showModelSelector)}
          className={`w-full mb-2 ${currentModel ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {currentModel ? `Model: ${currentModel}` : 'Select Model'}
        </Button>
        {showModelSelector && (
          <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
            <ModelSelector 
              selectedModel={currentModel ?? undefined}
              onModelLoaded={(modelId) => {
                onModelSelect(modelId)
                onShowModelSelector(false)
              }}
              onModelUnloaded={() => {}}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {modelPresets.length > 0 && (
        <div className="mb-3">
          <Label className="text-xs text-slate-400">Quick Presets</Label>
          <Select value={selectedModelPreset} onValueChange={onPresetSelect}>
            <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white h-8 text-xs">
              <SelectValue placeholder="Load preset..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {modelPresets.map(preset => (
                <SelectItem key={preset.id} value={preset.id} className="text-white text-xs">
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-1 items-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onShowAdvancedSettings(!showAdvancedSettings)}
          className={`border-slate-600 ${showAdvancedSettings ? 'text-cyan-400 border-cyan-500/30' : 'text-slate-400'} hover:text-white h-8 px-2`}
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefreshModels}
          className="border-slate-600 text-slate-400 hover:text-white h-8 px-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showAdvancedSettings && (
        <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-400">Temperature: {chatTemperature}</Label>
              <Slider
                value={[chatTemperature]}
                onValueChange={([v]) => onTemperatureChange(v)}
                min={0} max={2} step={0.1}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Max Tokens</Label>
              <Input
                type="number"
                value={chatMaxTokens}
                onChange={(e) => onMaxTokensChange(parseInt(e.target.value) || 2048)}
                className="mt-1 h-7 bg-slate-800 border-slate-600 text-white text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Context Length</Label>
              <Select value={String(chatContextLength)} onValueChange={(v) => onContextLengthChange(parseInt(v))}>
                <SelectTrigger className="mt-1 h-7 bg-slate-800 border-slate-600 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="2048" className="text-white text-xs">2K</SelectItem>
                  <SelectItem value="4096" className="text-white text-xs">4K</SelectItem>
                  <SelectItem value="8192" className="text-white text-xs">8K</SelectItem>
                  <SelectItem value="16384" className="text-white text-xs">16K</SelectItem>
                  <SelectItem value="32768" className="text-white text-xs">32K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={chatThinkingMode}
                onCheckedChange={onThinkingModeChange}
              />
              <Label className="text-xs text-slate-300">Thinking Mode (/think)</Label>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
        {chatThinkingMode && <Badge className="bg-purple-500/20 text-purple-400 border-0 text-[10px]">THINK</Badge>}
        <span>temp:{chatTemperature}</span>
        <span>ctx:{chatContextLength >= 1024 ? `${chatContextLength/1024}K` : chatContextLength}</span>
        <span>max:{chatMaxTokens}</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder="Type your message..."
          className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
        />
        <Button 
          onClick={onSend} 
          disabled={isLoading || !inputMessage.trim() || !currentModel}
          className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
