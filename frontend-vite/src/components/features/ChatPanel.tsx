import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProxyStatus, ModelPresetConfig } from '@/lib/types'
import { MessageList } from './chat/MessageList'
import { ChatInput } from './chat/ChatInput'
import { ChatSettings } from './chat/ChatSettings'

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
  onPresetSelect: (presetId: string) => void
  onRefreshModels: () => void
  showModelSelector: boolean
  onShowModelSelector: (show: boolean) => void
  showAdvancedSettings: boolean
  onShowAdvancedSettings: (show: boolean) => void
  chatTemperature: number
  chatTopP: number
  chatMinP: number
  chatRepeatPenalty: number
  chatMaxTokens: number
  chatContextLength: number
  chatThinkingMode: boolean
  systemPrompt: string
  activeScenario: string | null
  onScenarioSelect: (scenario: string | null) => void
  onTemperatureChange: (value: number) => void
  onTopPChange: (value: number) => void
  onMinPChange: (value: number) => void
  onRepeatPenaltyChange: (value: number) => void
  onMaxTokensChange: (value: number) => void
  onContextLengthChange: (value: number) => void
  onThinkingModeChange: (enabled: boolean) => void
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
  onPresetSelect,
  onRefreshModels,
  showModelSelector,
  onShowModelSelector,
  showAdvancedSettings,
  onShowAdvancedSettings,
  chatTemperature,
  chatTopP,
  chatMinP,
  chatRepeatPenalty,
  chatMaxTokens,
  chatContextLength,
  chatThinkingMode,
  systemPrompt,
  activeScenario,
  onScenarioSelect,
  onTemperatureChange,
  onTopPChange,
  onMinPChange,
  onRepeatPenaltyChange,
  onMaxTokensChange,
  onContextLengthChange,
  onThinkingModeChange,
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
          
          {/* Scenario Presets */}
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'code_assistant' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('code_assistant')}
            >
              💻 Code Assistant
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'deep_researcher' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('deep_researcher')}
            >
              🔬 Deep Researcher
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'data_analyst' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('data_analyst')}
            >
              📊 Data Analyst
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 transition-all ${activeScenario === 'quick_chat' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              onClick={() => onScenarioSelect('quick_chat')}
            >
              ⚡ Quick Chat
            </Badge>
          </div>
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
          onPresetSelect={onPresetSelect}
          onRefreshModels={onRefreshModels}
          showModelSelector={showModelSelector}
          onShowModelSelector={onShowModelSelector}
          showAdvancedSettings={showAdvancedSettings}
          onShowAdvancedSettings={onShowAdvancedSettings}
          chatTemperature={chatTemperature}
          chatTopP={chatTopP}
          chatMinP={chatMinP}
          chatRepeatPenalty={chatRepeatPenalty}
          chatMaxTokens={chatMaxTokens}
          chatContextLength={chatContextLength}
          chatThinkingMode={chatThinkingMode}
          systemPrompt={systemPrompt}
          onTemperatureChange={onTemperatureChange}
          onTopPChange={onTopPChange}
          onMinPChange={onMinPChange}
          onRepeatPenaltyChange={onRepeatPenaltyChange}
          onMaxTokensChange={onMaxTokensChange}
          onContextLengthChange={onContextLengthChange}
          onThinkingModeChange={onThinkingModeChange}
          onSystemPromptChange={onSystemPromptChange}
        />
      </Card>

      <ChatSettings status={status} />
    </div>
  )
}
