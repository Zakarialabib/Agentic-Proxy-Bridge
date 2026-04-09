import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSystemStatusData } from '@/hooks/use-system-status'
import { useModels } from '@/hooks/use-models'
import { usePresets } from '@/hooks/use-presets'
import { useObservability } from '@/hooks/use-observability'
import { useToolsData } from '@/hooks/use-tools-data'
import { useWorklogs } from '@/hooks/use-worklogs'
import { useGateway } from '@/hooks/use-gateway'
import { useKnowledge } from '@/hooks/use-knowledge'
import { useProtocols } from '@/hooks/use-protocols'
import { useOrchestrate } from '@/hooks/use-orchestrate'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useChatStore } from '@/stores/useChatStore'
import { Header } from '@/components/layout/Header'
import { Navigation } from '@/components/layout/Navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { PROXY_PORT } from '@/lib/types'
import { PROXY_BRIDGE_URL } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Save,
  Download,
  FileJson,
  FolderArchive,
  RotateCcw,
  AlertTriangle,
  Wifi,
  Server,
  MemoryStick,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info,
  Zap,
  Brain,
  Layers,
  GitMerge,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PanelSkeleton } from '@/components/Skeletons'

const DashboardPanel = lazy(() => import('@/components/dashboard').then(m => ({ default: m.Dashboard })))
const WorklogPanel = lazy(() => import('@/components/features/WorklogPanel').then(m => ({ default: m.WorklogPanel })))
const GatewayPanel = lazy(() => import('@/components/features/GatewayPanel').then(m => ({ default: m.GatewayPanel })))
const OrchestratePanel = lazy(() => import('@/components/features/OrchestratePanel').then(m => ({ default: m.OrchestratePanel })))
const KnowledgePanel = lazy(() => import('@/components/features/KnowledgePanel').then(m => ({ default: m.KnowledgePanel })))
const ProtocolsPanel = lazy(() => import('@/components/features/ProtocolsPanel').then(m => ({ default: m.ProtocolsPanel })))
const ToolsPanel = lazy(() => import('@/components/features/ToolsPanel').then(m => ({ default: m.ToolsPanel })))
const ObservabilityPanel = lazy(() => import('@/components/features/ObservabilityPanel').then(m => ({ default: m.ObservabilityPanel })))
const ChatPanel = lazy(() => import('@/components/features/ChatPanel').then(m => ({ default: m.ChatPanel })))

export default function App() {
  const queryClient = useQueryClient()
  const { status } = useSystemStatusData()
  const {
    availableModels,
    loadedModels,
    loadModel,
    unloadModel,
    refreshModels,
    error: modelsError,
  } = useModels()
  const { presets, autotune } = usePresets()
  const {
    activeTab,
    setActiveTab,
    theme,
    lmStudioHost,
    lmStudioPort,
    autoConnect,
    streamingEnabled,
    loggingEnabled,
    logLevel,
    cacheEmbeddings,
    defaultReranker,
    vramBudget,
    autoEvict,
    preWarmModels,
    // Chat orchestration strategy lives in the chat store so all send paths share it.
    setLmStudioConnection,
    setAutoConnect,
    setStreamingEnabled,
    setLoggingEnabled,
    setLogLevel,
    setCacheEmbeddings,
    setDefaultReranker,
    setVramBudget,
    setAutoEvict,
    setPreWarmModels,
  } = useSettingsStore()
  const chatStore = useChatStore()
  const { dashboard: obsDashboard, health: obsHealth } = useObservability()
  const { tools: agentTools } = useToolsData()
  const { worklogs } = useWorklogs()
  const { gateway } = useGateway()
  const { knowledge } = useKnowledge()
  const { protocols } = useProtocols()
  const { agents } = useOrchestrate()
  const [uptime, setUptime] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'connection' | 'proxy' | 'retrieval' | 'vram' | 'export'>('connection')
  const [loadingModel, setLoadingModel] = useState<string | null>(null)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [selectedPresetId, setSelectedPresetId] = useState('')

  useEffect(() => {
    if (settingsOpen) loadSettings()
  }, [settingsOpen])

  useEffect(() => {
    const interval = setInterval(() => setUptime((p) => p + 1), 3000)
    return () => clearInterval(interval)
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY_BRIDGE_URL}/settings`)
      if (res.ok) {
        const data = await res.json()
        setLmStudioConnection(data.lm_studio?.host ?? 'localhost', data.lm_studio?.port ?? 1234)
        setAutoConnect(data.lm_studio?.auto_connect ?? true)
        setStreamingEnabled(data.proxy?.streaming_enabled ?? true)
        setLoggingEnabled(data.proxy?.logging_enabled ?? true)
        setLogLevel(data.proxy?.log_level ?? 'info')
        setCacheEmbeddings(data.retrieval?.cache_embeddings ?? true)
        setDefaultReranker(data.retrieval?.default_reranker ?? 'cascade')
        setVramBudget(data.vram?.budget_mb ?? 8192)
        setAutoEvict(data.vram?.auto_evict ?? true)
        setPreWarmModels(data.vram?.pre_warm ?? true)
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }, [])

  const saveSettings = useCallback(async () => {
    try {
      await fetch(`${PROXY_BRIDGE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lm_studio: { host: lmStudioHost, port: lmStudioPort, auto_connect: autoConnect },
          proxy: { streaming_enabled: streamingEnabled, logging_enabled: loggingEnabled, log_level: logLevel },
          retrieval: { cache_embeddings: cacheEmbeddings, default_reranker: defaultReranker },
          vram: { budget_mb: vramBudget, auto_evict: autoEvict, pre_warm: preWarmModels },
        }),
      })
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }, [lmStudioHost, lmStudioPort, autoConnect, streamingEnabled, loggingEnabled, logLevel, cacheEmbeddings, defaultReranker, vramBudget, autoEvict, preWarmModels])

  const models = availableModels ?? []
  const loadedModelIds = useMemo(
    () => new Set((loadedModels?.data ?? []).map((m) => m.instance_id)),
    [loadedModels]
  )

  const handleLoadModel = useCallback(async (modelId: string) => {
    setLoadingModel(modelId)
    try {
      await loadModel.mutateAsync(modelId)
    } finally {
      setLoadingModel(null)
    }
  }, [loadModel])

  const handleUnloadModel = useCallback(async (instanceId: string) => {
    setLoadingModel(instanceId)
    try {
      await unloadModel.mutateAsync(instanceId)
    } finally {
      setLoadingModel(null)
    }
  }, [unloadModel])

  const handleModelSelect = useCallback((modelId: string) => {
    chatStore.setModel(modelId)
  }, [chatStore])

  const resetScenario = useCallback(() => {
    setActiveScenario(null)
    chatStore.setParams({
      temperature: 0.7,
      topP: 0.9,
      minP: 0.05,
      repeatPenalty: 1.05,
      maxTokens: 2048,
      contextWindow: 4096,
      thinkingMode: false,
      contextStrategy: 'full',
      systemPrompt: '',
    })
  }, [chatStore])

  const handleScenarioSelect = useCallback((scenario: string | null) => {
    if (!scenario || scenario === activeScenario) {
      resetScenario()
      return
    }
    setActiveScenario(scenario)
    if (scenario === 'code_assistant') {
      chatStore.setParams({
        temperature: 0.2,
        topP: 0.9,
        minP: 0.05,
        repeatPenalty: 1.05,
        maxTokens: 2048,
        contextWindow: 8192,
        thinkingMode: true,
        contextStrategy: 'prune',
        systemPrompt: 'You are a meticulous coding assistant. Provide concise, correct solutions and explain tradeoffs.',
      })
    } else if (scenario === 'deep_researcher') {
      chatStore.setParams({
        temperature: 0.4,
        topP: 0.9,
        minP: 0.05,
        repeatPenalty: 1.05,
        maxTokens: 4096,
        contextWindow: 16384,
        thinkingMode: true,
        contextStrategy: 'summarize',
        systemPrompt: 'You are a deep research agent. Ask clarifying questions and cite sources when available.',
      })
    } else if (scenario === 'data_analyst') {
      chatStore.setParams({
        temperature: 0.3,
        topP: 0.8,
        minP: 0.05,
        repeatPenalty: 1.1,
        maxTokens: 2048,
        contextWindow: 8192,
        thinkingMode: true,
        contextStrategy: 'prune',
        systemPrompt: 'You are a data analyst. Provide structured analysis, tables, and clear conclusions.',
      })
    } else if (scenario === 'quick_chat') {
      chatStore.setParams({
        temperature: 0.9,
        topP: 0.95,
        minP: 0.05,
        repeatPenalty: 1.0,
        maxTokens: 1024,
        contextWindow: 4096,
        thinkingMode: false,
        contextStrategy: 'full',
        systemPrompt: 'You are a fast, friendly chat assistant. Keep replies short and direct.',
      })
    }
  }, [activeScenario, chatStore, resetScenario])

  const handleSend = useCallback(async () => {
    const input = chatStore.draftMessage
    if (!input.trim()) return

    const selectedModel = chatStore.selectedModel
    if (!selectedModel) {
      chatStore.addMessage({
        role: 'assistant',
        content: 'Please select a model before sending a message.',
        timestamp: Date.now(),
      })
      return
    }

    if (!loadedModelIds.has(selectedModel)) {
      setLoadingModel(selectedModel)
      try {
        await loadModel.mutateAsync(selectedModel)
      } catch (error) {
        chatStore.addMessage({
          role: 'assistant',
          content: `Error loading model: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        })
        return
      } finally {
        setLoadingModel(null)
      }
    }

    await chatStore.sendStreamingMessage(input, { stream: streamingEnabled })
    chatStore.setDraftMessage('')
  }, [chatStore, loadedModelIds, loadModel, streamingEnabled])

  const handleRefreshActive = useCallback(() => {
    const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] })
    switch (activeTab) {
      case 'dashboard':
        invalidate('system-status')
        invalidate('models-available')
        invalidate('models-loaded')
        invalidate('performance-metrics')
        invalidate('cache-stats')
        invalidate('observability-dashboard')
        invalidate('observability-health')
        break
      case 'worklog':
        invalidate('worklogs')
        break
      case 'gateway':
        invalidate('gateway')
        break
      case 'orchestrate':
        invalidate('orchestrate')
        invalidate('tools-list')
        break
      case 'knowledge':
        invalidate('knowledge')
        break
      case 'protocols':
        invalidate('protocols')
        break
      case 'tools':
        invalidate('tools-list')
        break
      case 'observability':
        invalidate('observability-dashboard')
        invalidate('observability-health')
        break
      case 'chat':
        invalidate('models-available')
        invalidate('models-loaded')
        invalidate('system-status')
        break
      default:
        break
    }
  }, [activeTab, queryClient])

  const handleApplyPreset = useCallback(() => {
    const preset = presets.find((p) => p.id === selectedPresetId)
    if (!preset) return
    const params = preset.params || {}
    chatStore.setParams({
      temperature: (params.temperature as number) ?? chatStore.temperature,
      topP: (params.top_p as number) ?? chatStore.topP,
      minP: (params.min_p as number) ?? chatStore.minP,
      repeatPenalty: (params.repeat_penalty as number) ?? chatStore.repeatPenalty,
      maxTokens: (params.max_tokens as number) ?? chatStore.maxTokens,
      contextWindow: (params.context_window as number) ?? chatStore.contextWindow,
      contextStrategy: (params.context_strategy as 'full' | 'prune' | 'summarize') ?? chatStore.contextStrategy,
      systemPrompt: preset.system_prompt ?? chatStore.systemPrompt,
    })
  }, [chatStore, presets, selectedPresetId])

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ErrorBoundary><DashboardPanel /></ErrorBoundary>
      case 'worklog':
        return <ErrorBoundary><WorklogPanel entries={worklogs} /></ErrorBoundary>
      case 'gateway':
        return <ErrorBoundary><GatewayPanel
          gatewayQuery=""
          onQueryChange={() => {}}
          onSearch={() => {}}
          embeddingPresets={gateway?.embeddingPresets || {}}
          mrlPresets={gateway?.mrlPresets || {}}
          rerankerConfigs={gateway?.rerankerConfigs || {}}
          chatTestPresets={gateway?.chatTestPresets || []}
          gatewayResult={null}
          selectedPreset=""
          selectedMRL=""
          selectedReranker=""
          testPresetId=""
          onPresetChange={() => {}}
          onMRLChange={() => {}}
          onRerankerChange={() => {}}
          onTestPresetChange={() => {}}
          onRunTest={() => {}}
        /></ErrorBoundary>
      case 'orchestrate':
        return <ErrorBoundary><OrchestratePanel tools={agentTools || []} agents={agents || []} /></ErrorBoundary>
      case 'knowledge':
        return <ErrorBoundary><KnowledgePanel
          status={status ?? null}
          knowledgeQuery=""
          onQueryChange={() => {}}
          onQuerySubmit={() => {}}
          knowledgeResults={knowledge?.results || null}
          indexDocument=""
          onIndexDocumentChange={() => {}}
          indexUrl=""
          onIndexUrlChange={() => {}}
          indexFile={null}
          onFileSelect={() => {}}
          isIndexing={false}
          isFetchingUrl={false}
          onIndexSubmit={() => {}}
          onFetchUrl={() => {}}
        /></ErrorBoundary>
      case 'protocols':
        return <ErrorBoundary><ProtocolsPanel 
          mcpServers={protocols?.mcpServers || []} 
          a2aAgents={protocols?.a2aAgents || []} 
          asyncTasks={protocols?.asyncTasks || []} 
        /></ErrorBoundary>
      case 'tools':
        return <ErrorBoundary><ToolsPanel tools={agentTools || []} /></ErrorBoundary>
      case 'observability':
        return <ErrorBoundary><ObservabilityPanel
          vramTetris={[]}
          threeTimeHorizon={obsDashboard?.connectionPool || null}
          healthOrganism={obsHealth?.overall || null}
          confidencePoints={[]}
          presetLineage={[]}
          sessionNarrative={obsDashboard?.overall || null}
          negotiations={[]}
          failures={obsDashboard?.recommendations || []}
        /></ErrorBoundary>
      case 'chat':
        return <ErrorBoundary><ChatPanel
          messages={chatStore.messages.map(m => ({
            role: m.role,
            content: m.content,
            modelUsed: m.modelUsed,
            reasoning: (m as any).reasoning,
            toolCalls: (m as any).toolCalls,
            toolResults: (m as any).toolResults,
            contextSources: (m as any).contextSources,
          }))}
          isLoading={chatStore.isLoading}
          currentModel={chatStore.selectedModel || null}
          modelPresets={[]}
          selectedModelPreset=""
          status={status ?? null}
          inputMessage={chatStore.draftMessage}
          onInputChange={(value) => chatStore.setDraftMessage(value)}
          onSend={handleSend}
          onModelSelect={handleModelSelect}
          onModelPresetSelect={() => {}}
          onRefreshModels={refreshModels}
          showModelSelector={showModelSelector}
          onShowModelSelector={setShowModelSelector}
          availableModels={models}
          loadedModels={loadedModels?.data ?? []}
          onLoadModel={handleLoadModel}
          onUnloadModel={handleUnloadModel}
          loadingModel={loadingModel}
          modelError={modelsError ? modelsError.message : null}
          showAdvancedSettings={showAdvancedSettings}
          onShowAdvancedSettings={setShowAdvancedSettings}
          streamingEnabled={streamingEnabled}
          onStreamingChange={setStreamingEnabled}
          chatTemperature={chatStore.temperature}
          chatTopP={chatStore.topP}
          chatMinP={chatStore.minP}
          chatRepeatPenalty={chatStore.repeatPenalty}
          chatMaxTokens={chatStore.maxTokens}
          chatContextLength={chatStore.contextWindow}
          chatThinkingMode={chatStore.thinkingMode}
          systemPrompt={chatStore.systemPrompt}
          activeScenario={activeScenario}
          onScenarioSelect={handleScenarioSelect}
          presets={presets}
          selectedPresetId={selectedPresetId}
          onAgentPresetSelect={setSelectedPresetId}
          onApplyPreset={handleApplyPreset}
          onAutotune={autotune.run}
          autotuneRationales={autotune.rationales}
          autotunePending={autotune.isPending}
          reasoningEnabled={chatStore.thinkingMode}
          contextStrategy={chatStore.contextStrategy}
          onTemperatureChange={(v) => chatStore.setParams({ temperature: v })}
          onTopPChange={(v) => chatStore.setParams({ topP: v })}
          onMinPChange={(v) => chatStore.setParams({ minP: v })}
          onRepeatPenaltyChange={(v) => chatStore.setParams({ repeatPenalty: v })}
          onMaxTokensChange={(v) => chatStore.setParams({ maxTokens: v })}
          onContextLengthChange={(v) => chatStore.setParams({ contextWindow: v })}
          onThinkingModeChange={(v) => chatStore.setParams({ thinkingMode: v })}
          onContextStrategyChange={(v) => chatStore.setParams({ contextStrategy: v })}
          onSystemPromptChange={(v) => chatStore.setParams({ systemPrompt: v })}
        /></ErrorBoundary>
      default:
        return null
    }
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <Header
        status={status ?? null}
        uptime={uptime}
        onSettingsClick={() => setSettingsOpen(true)}
        onRefresh={handleRefreshActive}
      />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <Sidebar
            status={status ?? null}
            models={loadedModels?.data ?? []}
            availableModels={models}
            uptime={uptime}
            selectedModel={chatStore.selectedModel}
            onModelSelect={handleModelSelect}
            onLoadModel={handleLoadModel}
            onUnloadModel={handleUnloadModel}
            loadingModel={loadingModel}
          />
          <div className="flex-1 min-w-0">
            <ErrorBoundary>
              <Suspense fallback={<PanelSkeleton title sections={2} />}>
                {renderPanel()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings className="w-5 h-5 text-cyan-400" />
              Settings
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure LM Studio Proxy Bridge settings
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b border-slate-700 pb-3 mb-4">
            {[
              { id: 'connection' as const, label: 'Connection', icon: Wifi },
              { id: 'proxy' as const, label: 'Proxy', icon: Server },
              { id: 'retrieval' as const, label: 'Retrieval', icon: Search },
              { id: 'vram' as const, label: 'VRAM', icon: MemoryStick },
              { id: 'export' as const, label: 'Export', icon: Download },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={settingsTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSettingsTab(tab.id)}
                className={settingsTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}
              >
                <tab.icon className="w-4 h-4 mr-1" />
                {tab.label}
              </Button>
            ))}
          </div>

          {settingsTab === 'connection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">LM Studio Host</Label>
                  <Input value={lmStudioHost} onChange={(e) => setLmStudioConnection(e.target.value, lmStudioPort)} className="mt-1.5 bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Port</Label>
                  <Input type="number" value={lmStudioPort} onChange={(e) => setLmStudioConnection(lmStudioHost, parseInt(e.target.value) || 1234)} className="mt-1.5 bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Auto Connect</p>
                    <p className="text-xs text-slate-400">Automatically connect to LM Studio on startup</p>
                  </div>
                  <Switch checked={autoConnect} onCheckedChange={setAutoConnect} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">Connection Status</p>
                <div className="flex items-center gap-2">
                  {status?.lmstudio_connected ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Connected to LM Studio</span></>
                  ) : (
                    <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400">LM Studio not connected</span></>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSettings} className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30">
                  <Save className="w-3 h-3 mr-1" /> Save Settings
                </Button>
              </div>
            </div>
          )}

          {settingsTab === 'proxy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-medium">Streaming Enabled</p>
                    <p className="text-xs text-slate-400">Stream responses token by token</p>
                  </div>
                  <Switch checked={streamingEnabled} onCheckedChange={setStreamingEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Logging Enabled</p>
                    <p className="text-xs text-slate-400">Log all requests and responses</p>
                  </div>
                  <Switch checked={loggingEnabled} onCheckedChange={setLoggingEnabled} />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Log Level</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(['debug', 'info', 'warn', 'error'] as const).map((level) => (
                    <Button key={level} size="sm" variant={logLevel === level ? 'default' : 'outline'} onClick={() => setLogLevel(level)} className={logLevel === level ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'border-slate-600 text-slate-400'}>
                      {level.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div className="text-xs text-amber-300">
                    <p className="font-medium">Proxy Port: {PROXY_PORT}</p>
                    <p className="mt-1">The proxy bridge runs on port {PROXY_PORT} and provides OpenAI-compatible endpoints.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'retrieval' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Cache Embeddings</p>
                    <p className="text-xs text-slate-400">Cache generated embeddings for faster retrieval</p>
                  </div>
                  <Switch checked={cacheEmbeddings} onCheckedChange={setCacheEmbeddings} />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Default Reranker Mode</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['fast', 'deep', 'cascade', 'hybrid'] as const).map((mode) => (
                    <Button key={mode} size="sm" variant={defaultReranker === mode ? 'default' : 'outline'} onClick={() => setDefaultReranker(mode)} className={defaultReranker === mode ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'border-slate-600 text-slate-400'}>
                      {mode === 'fast' && <Zap className="w-3 h-3 mr-1" />}
                      {mode === 'deep' && <Brain className="w-3 h-3 mr-1" />}
                      {mode === 'cascade' && <Layers className="w-3 h-3 mr-1" />}
                      {mode === 'hybrid' && <GitMerge className="w-3 h-3 mr-1" />}
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'vram' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-slate-300">VRAM Budget (MB)</Label>
                  <span className="text-cyan-400 font-mono">{vramBudget} MB</span>
                </div>
                <Slider value={[vramBudget]} onValueChange={([v]) => setVramBudget(v)} min={4096} max={24576} step={1024} className="w-full" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>4 GB</span><span>24 GB</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Auto Evict</p>
                    <p className="text-xs text-slate-400">Automatically evict models when VRAM is low</p>
                  </div>
                  <Switch checked={autoEvict} onCheckedChange={setAutoEvict} />
                </div>
                <Separator className="bg-slate-700" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Pre-warm Models</p>
                    <p className="text-xs text-slate-400">Pre-load frequently used models</p>
                  </div>
                  <Switch checked={preWarmModels} onCheckedChange={setPreWarmModels} />
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-cyan-500/50" onClick={async () => {
                  try {
                    const res = await fetch(`${PROXY_BRIDGE_URL}/settings/export`)
                    if (res.ok) {
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'proxy-settings.json'
                      a.click()
                      URL.revokeObjectURL(url)
                    }
                  } catch (e) {
                    console.error('Export failed:', e)
                  }
                }}>
                  <FileJson className="w-6 h-6 text-cyan-400" />
                  <span>Export Settings</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-purple-500/50" onClick={async () => {
                  try {
                    const docs = {
                      exportDate: new Date().toISOString(),
                      settings: { lmStudioHost, lmStudioPort, autoConnect, streamingEnabled, loggingEnabled, logLevel, cacheEmbeddings, defaultReranker, vramBudget, autoEvict, preWarmModels },
                    }
                    const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `lmstudio-proxy-export-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (e) {
                    console.error('Export failed:', e)
                  }
                }}>
                  <FolderArchive className="w-6 h-6 text-purple-400" />
                  <span>Export Project</span>
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-300 mb-3">Import Settings</p>
                <Input type="file" accept=".json" className="flex-1 bg-slate-800 border-slate-600 text-white" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    try {
                      const text = await file.text()
                      const data = JSON.parse(text)
                      if (data.settings) {
                        setLmStudioConnection(data.settings.lmStudioHost ?? 'localhost', data.settings.lmStudioPort ?? 1234)
                        setAutoConnect(data.settings.autoConnect ?? true)
                        setStreamingEnabled(data.settings.streamingEnabled ?? true)
                        setLoggingEnabled(data.settings.loggingEnabled ?? true)
                        setLogLevel(data.settings.logLevel ?? 'info')
                        setCacheEmbeddings(data.settings.cacheEmbeddings ?? true)
                        setDefaultReranker(data.settings.defaultReranker ?? 'cascade')
                        setVramBudget(data.settings.vramBudget ?? 8192)
                        setAutoEvict(data.settings.autoEvict ?? true)
                        setPreWarmModels(data.settings.preWarmModels ?? true)
                      }
                    } catch (err) {
                      console.error('Import failed:', err)
                    }
                  }
                }} />
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                  <div className="text-xs text-red-300">
                    <p className="font-medium">Reset to Defaults</p>
                    <p className="mt-1">This will reset all settings to their default values.</p>
                    <Button size="sm" variant="destructive" className="mt-2" onClick={() => {
                      setLmStudioConnection('localhost', 1234)
                      setAutoConnect(true)
                      setStreamingEnabled(true)
                      setLoggingEnabled(true)
                      setLogLevel('info')
                      setCacheEmbeddings(true)
                      setDefaultReranker('cascade')
                      setVramBudget(8192)
                      setAutoEvict(true)
                      setPreWarmModels(true)
                    }}>
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setSettingsOpen(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={async () => { await saveSettings(); setSettingsOpen(false) }} className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white">
              <Save className="w-4 h-4 mr-1" />
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-xl mt-auto">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/5">:{PROXY_PORT}</Badge>
              <span>LMStudio Proxy Bridge</span>
              <span className="text-slate-500">
                Proxy: {PROXY_BRIDGE_URL ? PROXY_BRIDGE_URL : 'relative'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-purple-400" /> Knowledge Graph</span>
              <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-cyan-400" /> MCP/A2A</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> Orchestration</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
