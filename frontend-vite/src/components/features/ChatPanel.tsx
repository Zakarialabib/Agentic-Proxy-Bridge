import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProxyStatus, ModelPresetConfig, ModelInfo } from '@/lib/types'
import type { LoadedModelInstance } from '@/hooks/use-models'
import { MessageList } from './chat/MessageList'
import { ChatInput } from './chat/ChatInput'
import { ChatSettings } from './chat/ChatSettings'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AgenticPreset } from '@/hooks/use-presets'

interface ChatPanelProps {
  messages: { 
    role: 'user' | 'assistant' | 'system'; 
    content: string; 
    modelUsed?: string;
    reasoning?: unknown;
    toolCalls?: unknown;
    toolResults?: unknown;
    contextSources?: unknown;
  }[]
  isLoading: boolean
  currentModel: string | null
  modelPresets: ModelPresetConfig[]
  selectedModelPreset: string
  status: ProxyStatus | null
  inputMessage: string
  onInputChange: (value: string) => void
  onSend: () => void
  onModelSelect: (modelId: string) => void
  onModelPresetSelect: (presetId: string) => void
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
  activeScenario: string | null
  onScenarioSelect: (scenario: string | null) => void
  presets: AgenticPreset[]
  selectedPresetId: string
  onAgentPresetSelect: (presetId: string) => void
  onApplyPreset: () => void
  onAutotune: () => void
  autotuneRationales: string[]
  autotunePending?: boolean
  reasoningEnabled: boolean
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

export function ChatPanel({
  messages,
  isLoading,
  currentModel,
  modelPresets,
  selectedModelPreset,
  status,
  inputMessage,
  onInputChange,
  onSend,
  onModelSelect,
  onModelPresetSelect,
  onRefreshModels,
  showModelSelector,
  onShowModelSelector,
  availableModels,
  loadedModels,
  onLoadModel,
  onUnloadModel,
  loadingModel,
  modelError,
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
  activeScenario,
  onScenarioSelect,
  presets,
  selectedPresetId,
  onAgentPresetSelect,
  onApplyPreset,
  onAutotune,
  autotuneRationales,
  autotunePending = false,
  reasoningEnabled,
  onTemperatureChange,
  onTopPChange,
  onMinPChange,
  onRepeatPenaltyChange,
  onMaxTokensChange,
  onContextLengthChange,
  onThinkingModeChange,
  onContextStrategyChange,
  onSystemPromptChange,
}: ChatPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 bg-slate-800/30 border-slate-700/50 backdrop-blur-sm flex flex-col h-[600px]">
        <CardHeader className="border-b border-slate-700/50 pb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <CardTitle className="text-white">Agentic Control Space</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Orchestrate models with specialized capabilities, tools, and context profiles.
              </CardDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'code_assistant' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('code_assistant')}
            >
              Code Assistant
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'deep_researcher' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('deep_researcher')}
            >
              Deep Researcher
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'data_analyst' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('data_analyst')}
            >
              Data Analyst
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'quick_chat' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('quick_chat')}
            >
              Quick Chat
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wider">Preset</span>
              <Select value={selectedPresetId} onValueChange={onAgentPresetSelect}>
                <SelectTrigger className="h-7 w-[180px] bg-slate-900/50 border-slate-700 text-slate-200 text-[11px]">
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id} className="text-white text-xs">
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-700 text-slate-300" onClick={onApplyPreset} disabled={!selectedPresetId}>
                Apply
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-cyan-400" onClick={onAutotune} disabled={autotunePending}>
                {autotunePending ? 'Tuning...' : 'Autotune'}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span>Stream: {streamingEnabled ? 'on' : 'off'}</span>
              <span>Reasoning: {reasoningEnabled ? 'on' : 'off'}</span>
              <span>Context: {contextStrategy}</span>
              {selectedPresetId && <span>Active preset: {selectedPresetId}</span>}
            </div>
          </div>
          {autotuneRationales.length > 0 && (
            <div className="mt-2 text-xs text-slate-400 space-y-1">
              {autotuneRationales.map((r, i) => (
                <div key={`${r}-${i}`}>• {r}</div>
              ))}
            </div>
          )}
        </CardHeader>
        
        <MessageList messages={messages} isLoading={isLoading} />
        
        <ChatInput
          isLoading={isLoading}
          currentModel={currentModel}
          modelPresets={modelPresets}
          selectedModelPreset={selectedModelPreset}
          inputMessage={inputMessage}
          onInputChange={onInputChange}
          onSend={onSend}
          onModelSelect={onModelSelect}
          onPresetSelect={onModelPresetSelect}
          onRefreshModels={onRefreshModels}
          showModelSelector={showModelSelector}
          onShowModelSelector={onShowModelSelector}
          availableModels={availableModels}
          loadedModels={loadedModels}
          onLoadModel={onLoadModel}
          onUnloadModel={onUnloadModel}
          loadingModel={loadingModel}
          modelError={modelError}
          showAdvancedSettings={showAdvancedSettings}
          onShowAdvancedSettings={onShowAdvancedSettings}
          streamingEnabled={streamingEnabled}
          onStreamingChange={onStreamingChange}
          chatTemperature={chatTemperature}
          chatTopP={chatTopP}
          chatMinP={chatMinP}
          chatRepeatPenalty={chatRepeatPenalty}
          chatMaxTokens={chatMaxTokens}
          chatContextLength={chatContextLength}
          chatThinkingMode={chatThinkingMode}
          contextStrategy={contextStrategy}
          systemPrompt={systemPrompt}
          onTemperatureChange={onTemperatureChange}
          onTopPChange={onTopPChange}
          onMinPChange={onMinPChange}
          onRepeatPenaltyChange={onRepeatPenaltyChange}
          onMaxTokensChange={onMaxTokensChange}
          onContextLengthChange={onContextLengthChange}
          onThinkingModeChange={onThinkingModeChange}
          onContextStrategyChange={onContextStrategyChange}
          onSystemPromptChange={onSystemPromptChange}
        />
      </Card>

      <ChatSettings status={status} contextStrategy={contextStrategy} />
    </div>
  )
}
