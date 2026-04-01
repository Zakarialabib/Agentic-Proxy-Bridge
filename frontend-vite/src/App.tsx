

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChatInterface } from '@/components/chat-interface'
import { 
  Server, 
  MessageSquare, 
  Wrench, 
  Brain, 
  Database, 
  Shield,
  Trash2,
  Check,
  Zap,
  Cpu,
  Activity,
  Send,
  Loader2,
  Terminal,
  Settings,
  BookOpen,
  Search,
  Network,
  GitBranch,
  Clock,
  Layers,
  ArrowRight,
  Play,
  Pause,
  RefreshCw,
  Globe,
  Bot,
  Link2,
  Sparkles,
  Wifi,
  WifiOff,
  Gauge,
  MemoryStick,
  Microchip,
  Flame,
  Snowflake,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  TrendingUp,
  Timer,
  Bolt,
  Rocket,
  Eye,
  Heart,
  HeartPulse,
  TreeDeciduous,
  TreePine,
  Mountain,
  AlertCircle,
  TrendingDown,
  Radio,
  History,
  Inbox,
  Bug,
  Lightbulb,
  GitMerge,
  Scissors,
  Target,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  MinusCircle,
  BarChart3,
  LineChart,
  PieChart,
  Fingerprint,
  Atom,
  Orbit,
  Siren,
  Flag,
  Milestone,
  Download,
  Upload,
  Save,
  RotateCcw,
  Info,
  Monitor,
  Moon,
  Sun,
  Sliders,
  FileJson,
  FolderArchive,
  X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useStatefulChat } from "@/hooks/use-stateful-chat"
import { useSystemStatusData } from "@/hooks/use-system-status"
import { ModelSelector } from "@/components/model-selector"
import { Phase8Dashboard } from "@/components/Phase8Dashboard"

// Types
interface ProxyStatus {
  status: string
  lmstudio_connected: boolean
  tools_registered: number
  approval_mode: string
  active_sessions: number
  documents_indexed: number
  knowledge_graph: { nodes: number; edges: number; documents: { count: number } }
  protocols: {
    mcp: { servers: number; healthy: number; tools: number }
    a2a: { agents: number; available: number }
  }
  async_tasks: { pending: number; total: number }
  pre_triggering: { pre_warmed_tools: number; patterns_loaded: number }
  agentic_features: Record<string, boolean>
}

interface Tool {
  name: string
  description: string
  safety_level: 'autonomous' | 'supervised' | 'manual'
  source?: string
  health?: string
}

interface KnowledgeNode {
  id: string
  type: string
  name: string
  content: string
  layer: string
}

interface MCPServer {
  name: string
  transport: string
  tools_count: number
  health: string
}

interface A2AAgent {
  id: string
  name: string
  capabilities: string[]
  status: string
  current_tasks: number
}

interface AsyncTask {
  id: string
  type: string
  tool_or_agent: string
  status: string
  started_at: number
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  protocol?: string
  pre_triggered?: string[]
}

interface OrchestrationResult {
  orchestration_id: string
  decision: {
    protocol: string
    tools: string[]
    agents: string[]
    reason: string
    async: boolean
  }
  result: Record<string, unknown>
  session_update: {
    session_id: string
    protocol_used: string
    pre_triggered: string[]
  }
}

// Worklog Types
interface WorklogEntry {
  id: string
  taskId: string
  agent: string
  taskName: string
  stage: string
  status: string
  description: string
  timestamp: string
  completedAt?: string
  duration?: number
  createdAt: string
  updatedAt: string
}

// Preset & Gateway Types
interface EmbeddingPreset {
  name: string
  type: string
  instruction_prefix: string
  negative_query_template?: string
  metadata_filters?: Record<string, string>
  mrl_dimension: number
  reranker_mode: 'fast' | 'deep' | 'cascade' | 'hybrid'
  description: string
}

interface MRLPreset {
  dimension: number
  name: string
  speed: string
  quality: string
  use_case: string
}

interface RerankerConfig {
  model: string
  threshold: number
  latency_ms: number
  description: string
}

interface ChatTestPreset {
  id: string
  name: string
  category: 'capabilities' | 'performance' | 'robustness' | 'agentic'
  description: string
  system_prompt: string
  user_prompt: string
  expected_behavior: string[]
  validation: {
    check_tool_calls?: string[]
    check_reasoning?: boolean
    check_code_valid?: boolean
    max_tokens?: number
    expected_patterns?: string[]
  }
  metrics: string[]
}

interface GatewayTransformation {
  input: {
    raw: string
    intent: { type: string; confidence: number }
    context_enrichment: Record<string, unknown>
    instruction_prefix: string
    negative_query?: string
    metadata_filters?: Record<string, string>
  }
  embedding: {
    model: string
    dimension: number
    time_ms: number
    instruction_aware: boolean
  }
  rerank: {
    mode: string
    model: string
    confidence: number
    time_ms: number
    escalated: boolean
  }
  output: {
    results_count: number
    top_results: { content: string; score: number; type: string }[]
    explanation?: string
  }
  total_time_ms: number
}

// Observability Types
interface VRAMTetrisBlock {
  id: string
  name: string
  start: number
  size: number
  temperature: 'hot' | 'warm' | 'cold'
  color: string
  moving?: boolean
  fragment?: boolean
}

interface HorizonNow {
  alerts: { id: string; severity: 'info' | 'warning' | 'critical'; message: string; time: number }[]
  sparklines: { name: string; data: number[]; trend: 'up' | 'down' | 'stable' }[]
  hot_channels: string[]
}

interface HorizonRecent {
  trends: { metric: string; direction: 'improving' | 'declining' | 'stable'; change: number }[]
  patterns: { name: string; badge: string; description: string }[]
  hints: string[]
}

interface HorizonDeep {
  evolution: { date: string; event: string; impact: string }[]
  preset_tree: { name: string; descendants: number; success_rate: number }[]
  learned_patterns: { pattern: string; frequency: number; confidence: number }[]
}

interface ThreeTimeHorizon {
  now: HorizonNow
  recent: HorizonRecent
  deep: HorizonDeep
}

interface HealthOrganism {
  organs: { name: string; health: 'healthy' | 'sick' | 'critical'; pulse_rate: number; last_activity: number }[]
  veins: { from: string; to: string; flow_rate: number; status: 'flowing' | 'congested' | 'blocked' }[]
  breathing_rate: number
  overall_health: number
}

interface ConfidencePoint {
  id: string
  query: string
  x: number
  y: number
  elevation: number
  confidence: number
  color: string
}

interface PresetNode {
  id: string
  name: string
  type: 'trunk' | 'branch' | 'leaf' | 'pruned'
  parent?: string
  children: string[]
  metrics: { success_rate: number; usage_count: number }
  fading?: boolean
  grafting?: boolean
}

interface NarrativePhase {
  name: 'opening' | 'rising_action' | 'climax' | 'resolution' | 'denouement'
  label: string
  description: string
  progress: number
  active: boolean
}

interface SessionNarrative {
  session_id: string
  current_phase: string
  phases: NarrativePhase[]
  quality_score: number
  events: { phase: string; event: string; timestamp: number }[]
}

interface Negotiation {
  id: string
  type: 'vram_pressure' | 'new_preset' | 'model_conflict' | 'resource_limit'
  question: string
  options: { id: string; label: string; action: string }[]
  urgency: 'low' | 'medium' | 'high'
  timestamp: number
}

interface FailureRecord {
  id: string
  type: string
  timestamp: number
  stages: {
    detect: { status: 'pending' | 'complete'; time?: number; details?: string }
    characterize: { status: 'pending' | 'complete'; time?: number; details?: string }
    respond: { status: 'pending' | 'complete'; time?: number; details?: string }
    record: { status: 'pending' | 'complete'; time?: number; details?: string }
    explain: { status: 'pending' | 'complete'; time?: number; details?: string }
    learn: { status: 'pending' | 'complete'; time?: number; details?: string }
  }
  resolved: boolean
}

// Model Info Interface
interface ModelInfo {
  modelKey: string
  displayName: string
  type: 'llm' | 'embedding'
  format: string
  sizeBytes: number
  sizeGB: number
  params: string | null
  architecture: string | null
  quantization: string | null
  loaded: boolean
  // Legacy fields for ModelCard compatibility
  id: string
  name: string
  vram: number
  contextLength: number
  capabilities: string[]
  tps: number
  ttft: number
  bestFor: string
}

interface ModelPresetConfig {
  id: string
  name: string
  model_key: string
  context_length: number
  gpu_offload_ratio: number
  temperature: number
  top_p: number
  top_k: number
  repeat_penalty: number
  max_tokens: number
  system_prompt?: string
  is_default: boolean
  created_at: number
  last_used: number
  usage_count: number
}

const TOTAL_VRAM = 12 // GB
const PROXY_PORT = 3001

// Status Pill Component
function StatusPill({ status, label, pulse = false }: { status: 'connected' | 'degraded' | 'disconnected', label: string, pulse?: boolean }) {
  const colors = {
    connected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    degraded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    disconnected: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  
  const dots = {
    connected: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    disconnected: 'bg-red-400'
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[status]} ${pulse && status === 'connected' ? 'animate-pulse' : ''}`} />
      {label}
    </div>
  )
}

// Model State Badge
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

// Health Icon Component
function HealthIcon({ health }: { health: string }) {
  switch (health) {
    case 'healthy': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    case 'degraded': return <AlertTriangle className="w-4 h-4 text-amber-400" />
    case 'unavailable': return <XCircle className="w-4 h-4 text-red-400" />
    default: return <Minus className="w-4 h-4 text-slate-400" />
  }
}

// VRAM Bar Component
function VRAMBar({ used, total }: { used: number, total: number }) {
  const percentage = (used / total) * 100
  const safeZone = 80 // 80% is safe zone
  
  const getGradient = () => {
    if (percentage <= 50) return 'from-emerald-500 to-emerald-400'
    if (percentage <= 75) return 'from-emerald-500 via-amber-400 to-amber-500'
    return 'from-amber-500 via-orange-500 to-red-500'
  }
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">VRAM Usage</span>
        <span className="text-slate-300">{used.toFixed(1)}GB / {total}GB</span>
      </div>
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
        {/* Safe zone marker */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-slate-500/50"
          style={{ left: `${safeZone}%` }}
        />
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Headroom: {(total - used).toFixed(1)}GB</span>
        <span className={percentage > safeZone ? 'text-amber-400' : ''}>
          {percentage.toFixed(0)}% used
        </span>
      </div>
    </div>
  )
}

// Model Card Component
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

export default function ProxyBridgeDashboard() {
  // Use the stateful chat hook
  const { messages, isLoading, error: chatError, currentModel, sendMessage: sendStatefulMessage, setModel } = useStatefulChat()
  
  // Use system status hook
  const {
    status,
    tools,
    availableModels,
    loadedModels,
    isLoading: systemStatusLoading,
    hasError: systemStatusError,
    loadModel,
    unloadModel
  } = useSystemStatusData()
  
  // State
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([])
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [a2aAgents, setA2aAgents] = useState<A2AAgent[]>([])
  const [asyncTasks, setAsyncTasks] = useState<AsyncTask[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [approvalMode, setApprovalMode] = useState<string>('supervised')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uptime, setUptime] = useState(0)
  const [lastActionTime, setLastActionTime] = useState(12)
  const [cacheHitRate, setCacheHitRate] = useState(87)
  
  // Model state
  const [models, setModels] = useState<ModelInfo[]>([])
  const [showModelSelector, setShowModelSelector] = useState(false)

  // Sync models from hook
  useEffect(() => {
    if (availableModels) {
      setModels(availableModels)
    }
  }, [availableModels])

  // Sync approval mode from status
  useEffect(() => {
    if (status?.approval_mode) {
      setApprovalMode(status.approval_mode)
    }
  }, [status?.approval_mode])

  // Chat request construction state
  const [chatTemperature, setChatTemperature] = useState(0.7)
  const [chatMaxTokens, setChatMaxTokens] = useState(2048)
  const [chatContextLength, setChatContextLength] = useState(8192)
  const [chatThinkingMode, setChatThinkingMode] = useState(false)
  const [chatSystemPrompt, setChatSystemPrompt] = useState('')
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  // Model presets state
  const [modelPresets, setModelPresets] = useState<ModelPresetConfig[]>([])
  const [selectedModelPreset, setSelectedModelPreset] = useState<string>('')
  
  // Orchestration state
  const [orchestrationIntent, setOrchestrationIntent] = useState('')
  const [orchestrationMode, setOrchestrationMode] = useState<'adaptive' | 'mcp_only' | 'a2a_only' | 'local_only'>('adaptive')
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResult | null>(null)
  
  // Knowledge graph state
  const [knowledgeQuery, setKnowledgeQuery] = useState('')
  const [knowledgeResults, setKnowledgeResults] = useState<{ nodes: KnowledgeNode[]; paths: string[][] } | null>(null)
  
  // Worklog state
  const [worklogEntries, setWorklogEntries] = useState<WorklogEntry[]>([])
  
  // Index document state
  const [indexDocument, setIndexDocument] = useState('')
  const [indexUrl, setIndexUrl] = useState('')
  const [indexFile, setIndexFile] = useState<File | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  const [isFetchingUrl, setIsFetchingUrl] = useState(false)

  // Preset & Gateway state
  const [embeddingPresets, setEmbeddingPresets] = useState<Record<string, EmbeddingPreset>>({})
  const [mrlPresets, setMrlPresets] = useState<Record<string, MRLPreset>>({})
  const [rerankerConfigs, setRerankerConfigs] = useState<Record<string, RerankerConfig>>({})
  const [chatTestPresets, setChatTestPresets] = useState<ChatTestPreset[]>([])
  const [gatewayLog, setGatewayLog] = useState<GatewayTransformation[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('code_search')
  const [selectedMRL, setSelectedMRL] = useState<string>('standard')
  const [selectedReranker, setSelectedReranker] = useState<string>('cascade')
  const [gatewayQuery, setGatewayQuery] = useState('')
  const [gatewayResult, setGatewayResult] = useState<GatewayTransformation | null>(null)
  const [testPresetId, setTestPresetId] = useState<string>('')
  const [testResult, setTestResult] = useState<{
    preset_name: string
    category: string
    execution: { elapsed_ms: number; success: boolean }
    output: any
  } | null>(null)

  // Observability state
  const [vramTetris, setVramTetris] = useState<VRAMTetrisBlock[]>([])
  const [threeTimeHorizon, setThreeTimeHorizon] = useState<ThreeTimeHorizon | null>(null)
  const [healthOrganism, setHealthOrganism] = useState<HealthOrganism | null>(null)
  const [confidencePoints, setConfidencePoints] = useState<ConfidencePoint[]>([])
  const [presetLineage, setPresetLineage] = useState<PresetNode[]>([])
  const [sessionNarrative, setSessionNarrative] = useState<SessionNarrative | null>(null)
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [failures, setFailures] = useState<FailureRecord[]>([])

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'connection' | 'proxy' | 'retrieval' | 'vram' | 'export'>('connection')
  
  // Settings configuration state
  const [lmStudioHost, setLmStudioHost] = useState('192.168.1.12')
  const [lmStudioPort, setLmStudioPort] = useState(1234)
  const [autoConnect, setAutoConnect] = useState(true)
  const [streamingEnabled, setStreamingEnabled] = useState(true)
  const [loggingEnabled, setLoggingEnabled] = useState(true)
  const [logLevel, setLogLevel] = useState<'debug' | 'info' | 'warn' | 'error'>('info')
  const [cacheEmbeddings, setCacheEmbeddings] = useState(true)
  const [defaultReranker, setDefaultReranker] = useState<'fast' | 'deep' | 'cascade' | 'hybrid'>('cascade')
  const [vramBudget, setVramBudget] = useState(8192)
  const [autoEvict, setAutoEvict] = useState(true)
  const [preWarmModels, setPreWarmModels] = useState(true)

  // Load settings when dialog opens
  useEffect(() => {
    if (settingsOpen) {
      loadSettings()
    }
  }, [settingsOpen])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`/settings`)
      if (res.ok) {
        const data = await res.json()
        setLmStudioHost(data.lm_studio?.host || '192.168.1.12')
        setLmStudioPort(data.lm_studio?.port || 1234)
        setAutoConnect(data.lm_studio?.auto_connect ?? true)
        setStreamingEnabled(data.proxy?.streaming_enabled ?? true)
        setLoggingEnabled(data.proxy?.logging_enabled ?? true)
        setLogLevel(data.proxy?.log_level || 'info')
        setCacheEmbeddings(data.retrieval?.cache_embeddings ?? true)
        setDefaultReranker(data.retrieval?.default_reranker || 'cascade')
        setVramBudget(data.vram?.budget_mb || 8192)
        setAutoEvict(data.vram?.auto_evict ?? true)
        setPreWarmModels(data.vram?.pre_warm ?? true)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  const saveSettings = useCallback(async () => {
    try {
      const settings = {
        lm_studio: {
          host: lmStudioHost,
          port: lmStudioPort,
          auto_connect: autoConnect
        },
        proxy: {
          streaming_enabled: streamingEnabled,
          logging_enabled: loggingEnabled,
          log_level: logLevel
        },
        retrieval: {
          cache_embeddings: cacheEmbeddings,
          default_reranker: defaultReranker
        },
        vram: {
          budget_mb: vramBudget,
          auto_evict: autoEvict,
          pre_warm: preWarmModels
        }
      }
      const res = await fetch(`/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        // Show success
        console.log('Settings saved')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [lmStudioHost, lmStudioPort, autoConnect, streamingEnabled, loggingEnabled, logLevel, cacheEmbeddings, defaultReranker, vramBudget, autoEvict, preWarmModels])

  // Fetch model presets
  const fetchModelPresets = useCallback(async () => {
    try {
      const res = await fetch(`/settings/presets`)
      if (res.ok) {
        const data = await res.json()
        setModelPresets(data.presets || [])
        if (data.presets?.length > 0 && !selectedModelPreset) {
          const defaultPreset = data.presets.find((p: ModelPresetConfig) => p.is_default)
          if (defaultPreset) setSelectedModelPreset(defaultPreset.id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch model presets:', error)
    }
  }, [selectedModelPreset])

  useEffect(() => {
    fetchModelPresets()
  }, [fetchModelPresets])

  // Load a preset into chat settings
  const loadPreset = useCallback((presetId: string) => {
    const preset = modelPresets.find(p => p.id === presetId)
    if (!preset) return
    setSelectedModelPreset(presetId)
    setModel(preset.model_key)
    setChatTemperature(preset.temperature)
    setChatMaxTokens(preset.max_tokens)
    setChatContextLength(preset.context_length)
    if (preset.system_prompt) setChatSystemPrompt(preset.system_prompt)
  }, [modelPresets])

  // Toggle model load/unload via mutations
  const toggleModel = async (modelKey: string, currentlyLoaded: boolean) => {
    try {
      if (currentlyLoaded) {
        // Find the instance ID for this model
        const loadedModel = loadedModels?.data?.find(m => m.instance_id === modelKey)
        if (loadedModel) {
          unloadModel.mutate(loadedModel.instance_id)
        }
      } else {
        loadModel.mutate(modelKey, chatContextLength)
      }
    } catch (error) {
      console.error('Failed to toggle model:', error)
    }
  }

  // Fetch functions
  const fetchKnowledge = useCallback(async () => {
    try {
      const res = await fetch(`/knowledge`)
      if (res.ok) {
        const data = await res.json()
        setKnowledgeNodes(data.nodes || [])
      }
    } catch (error) {
      console.error('Failed to fetch knowledge:', error)
    }
  }, [])

  const fetchWorklog = useCallback(async () => {
    try {
      const res = await fetch('/api/worklog')
      if (res.ok) {
        const data = await res.json()
        setWorklogEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Failed to fetch worklog:', error)
    }
  }, [])

  const fetchMCPServers = useCallback(async () => {
    try {
      const res = await fetch(`/mcp/servers`)
      if (res.ok) {
        const data = await res.json()
        setMcpServers(data.servers)
      }
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error)
    }
  }, [])

  const fetchA2AAgents = useCallback(async () => {
    try {
      const res = await fetch(`/a2a/agents`)
      if (res.ok) {
        const data = await res.json()
        setA2aAgents(data.agents)
      }
    } catch (error) {
      console.error('Failed to fetch A2A agents:', error)
    }
  }, [])

  const fetchAsyncTasks = useCallback(async () => {
    try {
      const res = await fetch(`/async/tasks`)
      if (res.ok) {
        const data = await res.json()
        setAsyncTasks(data.tasks)
      }
    } catch (error) {
      console.error('Failed to fetch async tasks:', error)
    }
  }, [])

  const fetchEmbeddingPresets = useCallback(async () => {
    try {
      const res = await fetch(`/presets/embedding`)
      if (res.ok) {
        const data = await res.json()
        setEmbeddingPresets(data.presets || {})
        setMrlPresets(data.mrl_presets || {})
        setRerankerConfigs(data.reranker_configs || {})
      }
    } catch (error) {
      console.error('Failed to fetch embedding presets:', error)
    }
  }, [])

  const fetchChatTestPresets = useCallback(async () => {
    try {
      const res = await fetch(`/presets/chat-tests`)
      if (res.ok) {
        const data = await res.json()
        setChatTestPresets(data.presets || [])
      }
    } catch (error) {
      console.error('Failed to fetch chat test presets:', error)
    }
  }, [])

  const fetchGatewayLog = useCallback(async () => {
    try {
      const res = await fetch(`/gateway/log`)
      if (res.ok) {
        const data = await res.json()
        setGatewayLog(data.transformations || [])
      }
    } catch (error) {
      console.error('Failed to fetch gateway log:', error)
    }
  }, [])

  const fetchObservabilityHorizon = useCallback(async () => {
    try {
      const res = await fetch(`/observability/horizon`)
      if (res.ok) {
        const data = await res.json()
        setThreeTimeHorizon(data || { now: { alerts: [], sparklines: [], hot_channels: [] }, recent: { trends: [], patterns: [], hints: [] }, deep: { evolution: [], preset_tree: [], learned_patterns: [] } })
      }
    } catch (error) {
      console.error('Failed to fetch observability horizon:', error)
    }
  }, [])

  const fetchObservabilityVRAM = useCallback(async () => {
    try {
      const res = await fetch(`/observability/vram`)
      if (res.ok) {
        const data = await res.json()
        setVramTetris(data.blocks || [])
      }
    } catch (error) {
      console.error('Failed to fetch observability VRAM:', error)
    }
  }, [])

  const fetchObservabilityHealth = useCallback(async () => {
    try {
      const res = await fetch(`/observability/health`)
      if (res.ok) {
        const data = await res.json()
        setHealthOrganism(data || { overall_health: 0, breathing_rate: 1, organs: [], veins: [] })
      }
    } catch (error) {
      console.error('Failed to fetch observability health:', error)
    }
  }, [])

  const fetchObservabilityConfidence = useCallback(async () => {
    try {
      const res = await fetch(`/observability/confidence`)
      if (res.ok) {
        const data = await res.json()
        setConfidencePoints(data.points || [])
      }
    } catch (error) {
      console.error('Failed to fetch observability confidence:', error)
    }
  }, [])

  const fetchObservabilityPresetsLineage = useCallback(async () => {
    try {
      const res = await fetch(`/observability/presets/lineage`)
      if (res.ok) {
        const data = await res.json()
        setPresetLineage(data.presets || [])
      }
    } catch (error) {
      console.error('Failed to fetch observability presets lineage:', error)
    }
  }, [])

  const fetchObservabilityNarrative = useCallback(async () => {
    try {
      const res = await fetch(`/observability/narrative/current`)
      if (res.ok) {
        const data = await res.json()
        setSessionNarrative(data || { phases: [], events: [], current_phase: 'setup' })
      }
    } catch (error) {
      console.error('Failed to fetch observability narrative:', error)
    }
  }, [])

  const fetchObservabilityNegotiations = useCallback(async () => {
    try {
      const res = await fetch(`/observability/negotiations`)
      if (res.ok) {
        const data = await res.json()
        setNegotiations(data.negotiations || [])
      }
    } catch (error) {
      console.error('Failed to fetch observability negotiations:', error)
    }
  }, [])

  const fetchObservabilityFailures = useCallback(async () => {
    try {
      const res = await fetch(`/observability/failures`)
      if (res.ok) {
        const data = await res.json()
        setFailures(data.failures || [])
      }
    } catch (error) {
      console.error('Failed to fetch observability failures:', error)
    }
  }, [])

  const runGatewaySearch = async () => {
    if (!gatewayQuery.trim()) return
    try {
      const res = await fetch(`/gateway/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: gatewayQuery,
          preset_type: selectedPreset,
          mrl_dimension: mrlPresets[selectedMRL]?.dimension || 512,
          reranker_mode: selectedReranker,
          top_k: 5
        })
      })
      if (res.ok) {
        const data = await res.json()
        setGatewayResult(data.transformation)
        fetchGatewayLog()
      }
    } catch (error) {
      console.error('Gateway search failed:', error)
    }
  }

  const runChatTest = async () => {
    if (!testPresetId) return
    try {
      const res = await fetch(`/chat-test/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset_id: testPresetId
        })
      })
      if (res.ok) {
        const data = await res.json()
        setTestResult(data)
      }
    } catch (error) {
      console.error('Chat test failed:', error)
    }
  }

  // Initial load
  useEffect(() => {
    fetchKnowledge()
    fetchWorklog()
    fetchMCPServers()
    fetchA2AAgents()
    fetchAsyncTasks()
    fetchEmbeddingPresets()
    fetchChatTestPresets()
    fetchGatewayLog()
    
    // Fetch observability data
    fetchObservabilityHorizon()
    fetchObservabilityVRAM()
    fetchObservabilityHealth()
    fetchObservabilityConfidence()
    fetchObservabilityPresetsLineage()
    fetchObservabilityNarrative()
    fetchObservabilityNegotiations()
    fetchObservabilityFailures()
    
    const interval = setInterval(() => {
      fetchAsyncTasks()
      fetchGatewayLog()
      setUptime(prev => prev + 1)
      
      // Update observability data periodically
      fetchObservabilityVRAM()
      fetchObservabilityHealth()
      fetchObservabilityConfidence()
      fetchObservabilityPresetsLineage()
      fetchObservabilityNarrative()
      fetchObservabilityNegotiations()
      fetchObservabilityFailures()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [fetchKnowledge, fetchMCPServers, fetchA2AAgents, fetchAsyncTasks, fetchEmbeddingPresets, fetchChatTestPresets, fetchGatewayLog, fetchObservabilityHorizon, fetchObservabilityVRAM, fetchObservabilityHealth, fetchObservabilityConfidence, fetchObservabilityPresetsLineage, fetchObservabilityNarrative, fetchObservabilityNegotiations, fetchObservabilityFailures])

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentModel) return
    
    try {
      setLastActionTime(12)
      await sendStatefulMessage(inputMessage, {
        model: currentModel,
        temperature: chatTemperature,
        maxTokens: chatMaxTokens
      })
      setInputMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  // Set approval mode
  const updateApprovalMode = async (mode: string) => {
    try {
      await fetch(`/approval-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      setApprovalMode(mode)
    } catch (error) {
      console.error('Failed to update approval mode:', error)
    }
  }

  // Orchestrate
  const handleOrchestrate = async () => {
    if (!orchestrationIntent.trim()) return
    
    try {
      const res = await fetch(`/v1/agent/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: orchestrationIntent,
          context: {},
          tools_available: tools?.filter(t => !t.source || t.source === 'local').map(t => t.name) || [],
          agents_available: a2aAgents.map(a => a.id),
          orchestration_mode: orchestrationMode
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setOrchestrationResult(data)
      }
    } catch (error) {
      console.error('Orchestration failed:', error)
    }
  }

  // Query knowledge
  const handleKnowledgeQuery = async () => {
    if (!knowledgeQuery.trim()) return
    
    try {
      const res = await fetch(`/knowledge&query=${encodeURIComponent(knowledgeQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setKnowledgeResults({ nodes: data.nodes, paths: data.paths })
      }
    } catch (error) {
      console.error('Knowledge query failed:', error)
    }
  }

  // Index document
  const handleIndexDocument = async () => {
    if (!indexDocument.trim() && !indexFile && !indexUrl.trim()) return
    
    setIsIndexing(true)
    try {
      let content = indexDocument
      
      // If a file is selected, read its content
      if (indexFile) {
        content = await indexFile.text()
      }
      
      const res = await fetch(`/knowledge/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          url: indexUrl || undefined,
          filename: indexFile?.name || undefined
        })
      })
      
      if (res.ok) {
        setIndexDocument('')
        setIndexUrl('')
        setIndexFile(null)
        fetchKnowledge()
      }
    } catch (error) {
      console.error('Failed to index document:', error)
    } finally {
      setIsIndexing(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIndexFile(file)
      // Optionally read and preview the content
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setIndexDocument(event.target.result as string)
        }
      }
      reader.readAsText(file)
    }
  }

  // Fetch content from URL
  const handleFetchUrl = async () => {
    if (!indexUrl.trim()) return
    
    setIsFetchingUrl(true)
    try {
      // Use a proxy to fetch the URL (to avoid CORS)
      const res = await fetch(`/knowledge/fetch&url=${encodeURIComponent(indexUrl)}`)
      
      if (res.ok) {
        const data = await res.json()
        if (data.content) {
          setIndexDocument(data.content)
        }
      } else {
        console.error('Failed to fetch URL:', res.status)
      }
    } catch (error) {
      console.error('Failed to fetch URL:', error)
    } finally {
      setIsFetchingUrl(false)
    }
  }

  // Safety level badge
  const getSafetyBadge = (level: string) => {
    switch (level) {
      case 'autonomous': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Autonomous</Badge>
      case 'supervised': return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Supervised</Badge>
      case 'manual': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Manual</Badge>
      default: return <Badge>{level}</Badge>
    }
  }

  // Health badge
  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Healthy</Badge>
      case 'degraded': return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Degraded</Badge>
      case 'unavailable': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><XCircle className="w-3 h-3" />Offline</Badge>
      default: return <Badge>{health}</Badge>
    }
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Available</Badge>
      case 'busy': return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Busy</Badge>
      case 'offline': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Offline</Badge>
      case 'pending': return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Pending</Badge>
      case 'running': return <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">Running</Badge>
      case 'completed': return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</Badge>
      case 'failed': return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Failed</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const loadedModelsList = loadedModels?.data || []

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      {/* Top Bar - Always Visible */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Server className="w-5 h-5 text-slate-900" />
                </div>
                {status?.status === 'running' && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">LMStudio Proxy Bridge</h1>
                <p className="text-xs text-slate-400">MCP/A2A • Knowledge Graph • Orchestration</p>
              </div>
            </div>
            
            {/* Status Pills */}
            <div className="hidden md:flex items-center gap-3">
              {status ? (
                <>
                  <StatusPill 
                    status={status.lmstudio_connected ? 'connected' : 'disconnected'} 
                    label={status.lmstudio_connected ? 'LM Studio' : 'Disconnected'}
                    pulse 
                  />
                  <StatusPill 
                    status={status.status === 'running' ? 'connected' : 'disconnected'} 
                    label={`Proxy ${formatUptime(uptime)}`}
                    pulse 
                  />
                  {/* {status.protocols.mcp.healthy === status.protocols.mcp.servers ? (
                    <StatusPill status="connected" label="MCP" />
                  ) : (
                    <StatusPill status="degraded" label="MCP" />
                  )} */}
                  {/* {status.protocols.a2a.available > 0 ? (
                    <StatusPill status="connected" label="A2A" />
                  ) : (
                    <StatusPill status="disconnected" label="A2A" />
                  )} */}
                </>
              ) : (
                <StatusPill status="disconnected" label="Connecting..." />
              )}
            </div>
            
            {/* Settings & Theme */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/5">
                :{PROXY_PORT}
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-white"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-800/30">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-12 p-0 gap-1">
              {[
                { value: 'dashboard', icon: Activity, label: 'Dashboard' },
                { value: 'worklog', icon: BookOpen, label: 'Worklog' },
                { value: 'gateway', icon: Zap, label: 'Gateway' },
                { value: 'orchestrate', icon: Sparkles, label: 'Orchestrate' },
                { value: 'knowledge', icon: Brain, label: 'Knowledge' },
                { value: 'protocols', icon: Network, label: 'Protocols' },
                { value: 'tools', icon: Wrench, label: 'Tools' },
                { value: 'observability', icon: Eye, label: 'Observability' },
                { value: 'performance', icon: Gauge, label: 'Performance' },
                { value: 'chat', icon: MessageSquare, label: 'Chat' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-cyan-500/20 data-[state=active]:to-emerald-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/10 px-4 h-12 rounded-none text-slate-400 hover:text-slate-200 transition-all duration-200"
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* Main Content Area with Sidebar */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Context Sidebar - Collapsible would be ideal but keeping simple for now */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-4">
            {/* Connection Matrix */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  Connection Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* LM Studio */}
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
                    http://192.168.1.12:1234
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Timer className="w-3 h-3" />
                    <span>12ms latency</span>
                  </div>
                </div>
                
                {/* Bridge Proxy */}
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

            {/* VRAM Budget */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                  <MemoryStick className="w-4 h-4 text-purple-400" />
                  VRAM Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* <VRAMBar used={usedVRAM} total={TOTAL_VRAM} /> */}
                
                {/* Quick Actions */}
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
                
                {/* Conflict Warning */}
                {/* {usedVRAM > TOTAL_VRAM * 0.85 && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                      High VRAM usage. Consider unloading models.
                    </p>
                  </div>
                )} */}
              </CardContent>
            </Card>

            {/* Active Models */}
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Active Models
                  </span>
                  <Badge className="bg-slate-700 text-slate-300 border-0">
                    {loadedModelsList.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadedModelsList.map(model => (
                  <div key={model.instance_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <Microchip className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-xs font-medium text-white">{model.instance_id}</p>
                        <p className="text-xs text-slate-500">Loaded {model.load_time_seconds.toFixed(1)}s ago</p>
                      </div>
                    </div>
                    <ModelStateBadge loaded={true} state="warm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="mt-0">
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-purple-300">Knowledge Nodes</p>
                            <p className="text-2xl font-bold text-white">{status?.knowledge_graph?.nodes || 0}</p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-purple-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-cyan-300">MCP Tools</p>
                            <p className="text-2xl font-bold text-white">{status?.protocols?.mcp?.tools || 0}</p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <Network className="w-6 h-6 text-cyan-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-emerald-300">A2A Agents</p>
                            <p className="text-2xl font-bold text-white">{status?.protocols?.a2a?.available || 0}/{status?.protocols?.a2a?.agents || 0}</p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Bot className="w-6 h-6 text-emerald-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-amber-300">Async Tasks</p>
                            <p className="text-2xl font-bold text-white">{status?.async_tasks?.pending || 0}</p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Model Selection */}
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Microchip className="w-5 h-5 text-cyan-400" />
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
                            onToggle={() => toggleModel(model.modelKey, model.loaded)}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Protocol Stack & Pre-triggering */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Layers className="w-5 h-5 text-emerald-400" />
                          Protocol Stack
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* A2A Layer */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-emerald-400 flex items-center gap-2">
                              <Bot className="w-4 h-4" />
                              A2A Layer
                            </span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                              {status?.protocols?.a2a?.available || 0} agents
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {/* {a2aAgents.slice(0, 3).map(agent => (
                              <Badge key={agent.id} variant="outline" className="text-slate-300 border-slate-600 text-xs">
                                {agent.name}
                              </Badge>
                            ))} */}
                          </div>
                        </div>
                        
                        <div className="flex justify-center">
                          <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />
                        </div>
                        
                        {/* MCP Layer */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border border-cyan-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-cyan-400 flex items-center gap-2">
                              <Network className="w-4 h-4" />
                              MCP Layer
                            </span>
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                              {status?.protocols?.mcp?.tools || 0} tools
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {mcpServers.slice(0, 3).map(server => (
                              <Badge key={server.name} variant="outline" className="text-slate-300 border-slate-600 text-xs">
                                {server.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Zap className="w-5 h-5 text-amber-400" />
                          Predictive Pre-triggering
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                            <p className="text-2xl font-bold text-purple-400">{status?.pre_triggering?.pre_warmed_tools || 0}</p>
                            <p className="text-xs text-purple-300">Pre-warmed</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600 text-center">
                            <p className="text-2xl font-bold text-slate-300">{status?.pre_triggering?.patterns_loaded || 0}</p>
                            <p className="text-xs text-slate-400">Patterns</p>
                          </div>
                        </div>
                        
                        <Separator className="bg-slate-700" />
                        
                        <div className="text-xs text-slate-400 space-y-2">
                          <p className="font-medium text-slate-300">Pattern triggers:</p>
                          <div className="space-y-1.5 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-cyan-400">database/*</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-300">file_read, semantic_search</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400">security/*</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-300">security-auditor</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400">test/*</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-300">test-generator</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Settings */}
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2 text-base">
                        <Settings className="w-5 h-5 text-slate-400" />
                        Quick Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-300">Approval Mode</Label>
                          <p className="text-xs text-slate-500 mt-1">Controls tool execution autonomy</p>
                        </div>
                        <div className="flex gap-2">
                          {['autonomous', 'supervised', 'manual'].map((mode) => (
                            <Button
                              key={mode}
                              size="sm"
                              variant={approvalMode === mode ? 'default' : 'outline'}
                              className={approvalMode === mode 
                                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white border-0' 
                                : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'}
                              onClick={() => updateApprovalMode(mode)}
                            >
                              {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Gateway Tab */}
              <TabsContent value="gateway" className="mt-0">
                <div className="space-y-6">
                  {/* Gateway Search Interface */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Zap className="w-5 h-5 text-amber-400" />
                          Gateway Search
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Task-aware preset templates with gateway transformation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-slate-300">Query</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={gatewayQuery}
                              onChange={(e) => setGatewayQuery(e.target.value)}
                              placeholder="e.g., authentication middleware"
                              className="bg-slate-700 border-slate-600 text-white"
                              onKeyDown={(e) => e.key === 'Enter' && runGatewaySearch()}
                            />
                            <Button onClick={runGatewaySearch} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30">
                              <Search className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-slate-400">Preset</Label>
                            <select
                              value={selectedPreset}
                              onChange={(e) => setSelectedPreset(e.target.value)}
                              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white"
                            >
                              {Object.entries(embeddingPresets).map(([key, preset]) => (
                                <option key={key} value={key}>{preset.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">MRL Dim</Label>
                            <select
                              value={selectedMRL}
                              onChange={(e) => setSelectedMRL(e.target.value)}
                              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white"
                            >
                              {Object.entries(mrlPresets).map(([key, preset]) => (
                                <option key={key} value={key}>{preset.name} ({preset.dimension}d)</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Reranker</Label>
                            <select
                              value={selectedReranker}
                              onChange={(e) => setSelectedReranker(e.target.value)}
                              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white"
                            >
                              {Object.entries(rerankerConfigs).map(([key, config]) => (
                                <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {embeddingPresets[selectedPreset] && (
                          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                            <p className="text-xs text-slate-400 mb-1">Instruction Prefix</p>
                            <p className="text-sm text-cyan-400 font-mono">
                              {embeddingPresets[selectedPreset].instruction_prefix}
                            </p>
                            {embeddingPresets[selectedPreset].negative_query_template && (
                              <>
                                <p className="text-xs text-slate-400 mt-2 mb-1">Negative Query</p>
                                <p className="text-sm text-red-400 font-mono">
                                  {embeddingPresets[selectedPreset].negative_query_template}
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Gateway Inspector */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Terminal className="w-5 h-5 text-cyan-400" />
                          Gateway Inspector
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Input/Output transformation log
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {gatewayResult ? (
                          <div className="space-y-4 text-sm">
                            {/* Input */}
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-purple-500/20 text-purple-400">INPUT</Badge>
                                <span className="text-slate-400">{gatewayResult.input.raw}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Intent: </span>
                                  <span className="text-cyan-400">{gatewayResult.input.intent.type}</span>
                                  <span className="text-slate-500"> ({(gatewayResult.input.intent.confidence * 100).toFixed(0)}%)</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Prefix: </span>
                                  <span className="text-emerald-400">{gatewayResult.input.instruction_prefix.slice(0, 30)}...</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Embedding */}
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-cyan-500/20 text-cyan-400">EMBEDDING</Badge>
                                <span className="text-xs text-slate-400">{gatewayResult.embedding.time_ms}ms</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Dimension: </span>
                                  <span className="text-white">{gatewayResult.embedding.dimension}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Model: </span>
                                  <span className="text-white">{gatewayResult.embedding.model}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Rerank */}
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={`${gatewayResult.rerank.mode === 'deep' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  RERANK ({gatewayResult.rerank.mode.toUpperCase()})
                                </Badge>
                                <span className="text-xs text-slate-400">{gatewayResult.rerank.time_ms}ms</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Confidence: </span>
                                  <span className="text-white">{(gatewayResult.rerank.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Escalated: </span>
                                  <span className={gatewayResult.rerank.escalated ? 'text-amber-400' : 'text-emerald-400'}>
                                    {gatewayResult.rerank.escalated ? 'Yes' : 'No'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Output */}
                            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-emerald-500/20 text-emerald-400">OUTPUT</Badge>
                                <span className="text-xs text-slate-400">{gatewayResult.total_time_ms}ms total</span>
                              </div>
                              <div className="text-xs text-slate-300">
                                {gatewayResult.output.results_count} results • {gatewayResult.output.explanation}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
                            <Terminal className="w-12 h-12 mb-2" />
                            <p>Run a gateway search to see transformation</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* MRL & Reranker Presets */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Gauge className="w-5 h-5 text-purple-400" />
                          MRL Dimension Presets
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(mrlPresets).map(([key, preset]) => (
                            <div 
                              key={key}
                              onClick={() => setSelectedMRL(key)}
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                selectedMRL === key 
                                  ? 'bg-purple-500/20 border border-purple-500/30' 
                                  : 'bg-slate-900/50 border border-slate-700/50 hover:border-slate-600'
                              }`}
                            >
                              <p className="font-medium text-white text-sm">{preset.name}</p>
                              <p className="text-xs text-slate-400">{preset.dimension}d</p>
                              <p className="text-xs text-purple-400 mt-1">{preset.speed}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <ArrowRight className="w-5 h-5 text-amber-400" />
                          Reranker Modes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(rerankerConfigs).map(([key, config]) => (
                            <div 
                              key={key}
                              onClick={() => setSelectedReranker(key)}
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                selectedReranker === key 
                                  ? 'bg-amber-500/20 border border-amber-500/30' 
                                  : 'bg-slate-900/50 border border-slate-700/50 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-white text-sm">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
                                <Badge variant="outline" className="text-xs">{config.latency_ms}ms</Badge>
                              </div>
                              <p className="text-xs text-slate-400">{config.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Chat Test Presets */}
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Play className="w-5 h-5 text-emerald-400" />
                        Chat Test Presets
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Built-in test suite for model capabilities, performance, and robustness
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {chatTestPresets.slice(0, 8).map(preset => (
                          <div 
                            key={preset.id}
                            onClick={() => setTestPresetId(preset.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${
                              testPresetId === preset.id 
                                ? 'bg-emerald-500/20 border border-emerald-500/30' 
                                : 'bg-slate-900/50 border border-slate-700/50 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-white text-sm">{preset.name}</p>
                              <Badge className={`text-xs ${
                                preset.category === 'capabilities' ? 'bg-cyan-500/20 text-cyan-400' :
                                preset.category === 'performance' ? 'bg-purple-500/20 text-purple-400' :
                                preset.category === 'robustness' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                {preset.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{preset.description}</p>
                          </div>
                        ))}
                      </div>
                      
                      {testPresetId && (
                        <div className="mt-4 flex justify-end">
                          <Button onClick={runChatTest} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30">
                            <Play className="w-4 h-4 mr-2" />
                            Run Test
                          </Button>
                        </div>
                      )}
                      
                      {testResult && (
                        <div className="mt-6 space-y-4">
                          <h4 className="text-sm font-medium text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                            <Terminal className="w-4 h-4 text-cyan-400" />
                            Test Result: {testResult.preset_name}
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <span className="text-xs text-slate-400 block mb-1">Status</span>
                              <Badge className={testResult.execution?.success ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                                {testResult.execution?.success ? 'Success' : 'Failed'}
                              </Badge>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <span className="text-xs text-slate-400 block mb-1">Latency</span>
                              <span className="text-sm text-amber-400 font-mono">{testResult.execution?.elapsed_ms}ms</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                            <span className="text-xs text-slate-500 block mb-2">Output</span>
                            <ScrollArea className="h-[200px] w-full rounded-md">
                              <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap">
                                {JSON.stringify(testResult.output, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Orchestrate Tab */}
              <TabsContent value="orchestrate" className="mt-0">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Unified Orchestration
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Single endpoint that internally decides MCP vs A2A vs local inference
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-slate-300">Intent</Label>
                        <Textarea
                          value={orchestrationIntent}
                          onChange={(e) => setOrchestrationIntent(e.target.value)}
                          placeholder="e.g., refactor authentication system"
                          className="mt-2 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] focus:border-purple-500/50"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-slate-300">Orchestration Mode</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {(['adaptive', 'mcp_only', 'a2a_only', 'local_only'] as const).map((mode) => (
                            <Button
                              key={mode}
                              size="sm"
                              variant={orchestrationMode === mode ? 'default' : 'outline'}
                              className={orchestrationMode === mode 
                                ? 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0' 
                                : 'border-slate-600 text-slate-400 hover:text-white'}
                              onClick={() => setOrchestrationMode(mode)}
                            >
                              {mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleOrchestrate}
                        disabled={!orchestrationIntent.trim()}
                        className="w-full bg-gradient-to-r from-purple-500 via-violet-500 to-cyan-500 hover:from-purple-600 hover:via-violet-600 hover:to-cyan-600 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Orchestrate
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-emerald-400" />
                        Orchestration Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {orchestrationResult && orchestrationResult.decision ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Protocol Selected</span>
                            <Badge className={`${
                              orchestrationResult.decision?.protocol === 'mcp' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                              orchestrationResult.decision?.protocol === 'a2a' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              'bg-slate-600/20 text-slate-400 border-slate-500/30'
                            } border`}>
                              {orchestrationResult.decision?.protocol?.toUpperCase() || 'N/A'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Reason</span>
                            <span className="text-sm text-slate-400">{orchestrationResult.decision?.reason || 'No decision'}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Async</span>
                            <Badge className={orchestrationResult.decision?.async ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-600/20 text-slate-400 border-slate-500/30'}>
                              {orchestrationResult.decision?.async ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          
                          {orchestrationResult.decision?.tools?.length > 0 && (
                            <div>
                              <span className="text-slate-300 text-sm">Tools</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {orchestrationResult.decision?.tools?.map(t => (
                                  <Badge key={t} variant="outline" className="text-cyan-400 border-cyan-500/30">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {orchestrationResult.decision?.agents?.length > 0 && (
                            <div>
                              <span className="text-slate-300 text-sm">Agents</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {orchestrationResult.decision?.agents?.map(a => (
                                  <Badge key={a} variant="outline" className="text-emerald-400 border-emerald-500/30">{a}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* {orchestrationResult.result.task_id && (
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                              <span className="text-sm text-amber-300">Task ID: {orchestrationResult.result.task_id as string}</span>
                            </div>
                          )} */}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] text-slate-500">
                          <Sparkles className="w-12 h-12 mb-2" />
                          <p>Run orchestration to see results</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Knowledge Tab */}
              <TabsContent value="knowledge" className="mt-0">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Search className="w-5 h-5 text-purple-400" />
                        Query Knowledge Graph
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Navigate concepts, not just retrieve text
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          value={knowledgeQuery}
                          onChange={(e) => setKnowledgeQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleKnowledgeQuery()}
                          placeholder="e.g., authentication middleware"
                          className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500/50"
                        />
                        <Button onClick={handleKnowledgeQuery} className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30">
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {knowledgeResults && (
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {knowledgeResults.nodes.map((node) => (
                              <div key={node.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-white">{node.name}</span>
                                  <Badge variant="outline" className="text-slate-400">{node.type}</Badge>
                                </div>
                                <p className="text-sm text-slate-400 truncate">{node.content.substring(0, 150)}...</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-400" />
                        Index Documentation
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Transform documentation into active knowledge topology
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-slate-300">Document Content</Label>
                          <Textarea
                            value={indexDocument}
                            onChange={(e) => setIndexDocument(e.target.value)}
                            placeholder="Paste documentation content or upload a file..."
                            className="mt-2 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px] focus:border-emerald-500/50"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label className="text-slate-300">Upload</Label>
                          <div className="flex flex-col gap-2 mt-2">
                            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 cursor-pointer transition-colors">
                              <Upload className="w-4 h-4 text-cyan-400" />
                              <span className="text-xs text-slate-300">
                                {indexFile ? indexFile.name : 'Upload File'}
                              </span>
                              <input 
                                type="file" 
                                accept=".txt,.md,.json,.py,.ts,.js,.tsx,.jsx,.html,.css,.yaml,.yml,.xml,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Source URL (optional)</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={indexUrl}
                            onChange={(e) => setIndexUrl(e.target.value)}
                            placeholder="https://docs.example.com/api"
                            className="flex-1 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleFetchUrl}
                            disabled={!indexUrl.trim() || isFetchingUrl}
                            className="border-slate-600 text-slate-400 hover:text-white"
                          >
                            {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button 
                        onClick={handleIndexDocument}
                        disabled={!indexDocument.trim() && !indexFile && !indexUrl.trim()}
                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        {isIndexing ? 'Indexing...' : 'Index Document'}
                      </Button>
                      
                      <Separator className="bg-slate-700" />
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <p className="text-2xl font-bold text-white">{status?.knowledge_graph?.nodes || 0}</p>
                          <p className="text-sm text-purple-300">Concepts</p>
                        </div>
                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          <p className="text-2xl font-bold text-white">{status?.knowledge_graph?.edges || 0}</p>
                          <p className="text-sm text-cyan-300">Relationships</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Protocols Tab */}
              <TabsContent value="protocols" className="mt-0">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Network className="w-5 h-5 text-cyan-400" />
                        MCP Servers (Tool Fabric)
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        External tool servers via MCP protocol
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {mcpServers.map((server) => (
                            <div key={server.name} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">{server.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-slate-400 text-xs">{server.transport}</Badge>
                                  {getHealthBadge(server.health)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Wrench className="w-4 h-4" />
                                <span>{server.tools_count} tools</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Bot className="w-5 h-5 text-emerald-400" />
                        A2A Agents (Agent Messaging)
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Peer agents for delegation and collaboration
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {a2aAgents.map((agent) => (
                            <div key={agent.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">{agent.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-slate-400 text-xs">{agent.current_tasks} tasks</Badge>
                                  {getStatusBadge(agent.status)}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {agent.capabilities.map((cap) => (
                                  <Badge key={cap} variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                <Card className="mt-6 bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Async Tasks
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Long-running tool executions and agent delegations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {asyncTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[150px] text-slate-500">
                          <Pause className="w-8 h-8 mb-2" />
                          <p>No async tasks running</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {asyncTasks.map((task) => (
                            <div key={task.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 flex items-center justify-between">
                              <div>
                                <span className="font-medium text-white">{task.tool_or_agent}</span>
                                <p className="text-xs text-slate-400">{task.id}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-slate-400 text-xs">{task.type}</Badge>
                                {getStatusBadge(task.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tools Tab */}
              <TabsContent value="tools" className="mt-0">
                <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Tool Registry</CardTitle>
                    <CardDescription className="text-slate-400">
                      {/* {tools.length} tools available across all protocols */}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {/* {tools.map((tool, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white">{tool.name}</span>
                              <div className="flex items-center gap-2">
                                {tool.source && (
                                  <Badge variant="outline" className={`text-xs ${
                                    tool.source.startsWith('mcp') ? 'text-cyan-400 border-cyan-500/30' : 'text-slate-400 border-slate-600'
                                  }`}>
                                    {tool.source}
                                  </Badge>
                                )}
                                {tool.health && getHealthBadge(tool.health)}
                                {getSafetyBadge(tool.safety_level)}
                              </div>
                            </div>
                            <p className="text-sm text-slate-400">{tool.description}</p>
                          </div>
                        ))} */}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Observability Tab */}
              <TabsContent value="observability" className="mt-0">
                <div className="space-y-6">
                  {/* Top Row: VRAM Tetris + Health Organism */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* VRAM Tetris - Territory Map */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                          <Layers className="w-5 h-5 text-orange-400" />
                          VRAM Tetris
                          <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">Territory Map</Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Models claim space • Temperature colors indicate activity level
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative h-16 bg-slate-900/50 rounded-lg overflow-hidden mb-3">
                          {vramTetris?.map((block) => (
                            <div
                              key={block.id}
                              className={`absolute top-0 bottom-0 flex items-center justify-center text-xs font-medium transition-all duration-500 ${
                                block.fragment ? 'animate-pulse' : ''
                              } bg-gradient-to-r ${block.color} ${block.moving ? 'animate-bounce' : ''}`}
                              style={{
                                left: `${block.start}%`,
                                width: `${block.size}%`,
                              }}
                              title={block.name}
                            >
                              <span className="truncate px-1 text-white drop-shadow-lg">
                                {block.fragment ? '▪' : block.name}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {vramTetris?.filter(b => !b.fragment && b.name !== 'Empty' && b.name !== 'Potential').map((block) => (
                            <div key={block.id} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/50">
                              <span className={`w-2 h-2 rounded-full ${
                                block.temperature === 'hot' ? 'bg-red-400' :
                                block.temperature === 'warm' ? 'bg-orange-400' : 'bg-cyan-400'
                              }`} />
                              <span className="text-slate-300">{block.name}</span>
                              <span className="text-slate-500">{block.size}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-orange-500" /> Hot
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-gradient-to-r from-orange-500 to-amber-500" /> Warm
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-gradient-to-r from-cyan-500 to-blue-500" /> Cold
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-slate-700 animate-pulse" /> Fragmented
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Health Organism */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                          <HeartPulse className={`w-5 h-5 ${healthOrganism && healthOrganism.overall_health > 0.7 ? 'text-emerald-400' : healthOrganism && healthOrganism.overall_health > 0.4 ? 'text-amber-400' : 'text-red-400'}`} />
                          Health Organism
                          <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">Body Metaphor</Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Tools as organs • Connections as veins • System breathes with activity
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Breathing indicator */}
                        <div className="flex items-center justify-center mb-4">
                          <div 
                            className="relative"
                            style={{ 
                              animation: healthOrganism ? `pulse ${2 / healthOrganism.breathing_rate}s ease-in-out infinite` : 'none'
                            }}
                          >
                            <Heart className={`w-12 h-12 ${
                              healthOrganism && healthOrganism.overall_health > 0.7 ? 'text-emerald-400' :
                              healthOrganism && healthOrganism.overall_health > 0.4 ? 'text-amber-400' : 'text-red-400'
                            }`} />
                          </div>
                          <div className="ml-4">
                            <p className="text-2xl font-bold text-white">
                              {healthOrganism ? Math.round(healthOrganism.overall_health * 100) : 0}%
                            </p>
                            <p className="text-xs text-slate-400">Overall Health</p>
                          </div>
                        </div>

                        {/* Organs */}
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {healthOrganism?.organs?.map((organ, i) => (
                            <div key={i} className="text-center">
                              <div 
                                className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                                  organ.health === 'healthy' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                                  organ.health === 'sick' ? 'bg-amber-500/20 border border-amber-500/30' :
                                  'bg-red-500/20 border border-red-500/30 animate-pulse'
                                }`}
                                style={{
                                  animation: organ.health === 'healthy' ? `pulse ${1 / organ.pulse_rate}s ease-in-out infinite` : 
                                            organ.health === 'sick' ? `pulse ${2 / organ.pulse_rate}s ease-in-out infinite` : 
                                            'pulse 0.3s ease-in-out infinite'
                                }}
                              >
                                {organ.health === 'healthy' ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : organ.health === 'sick' ? (
                                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400" />
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 truncate">{organ.name}</p>
                            </div>
                          ))}
                        </div>

                        {/* Veins (connections) */}
                        <div className="space-y-1">
                          {healthOrganism?.veins?.slice(0, 3).map((vein, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400 truncate w-20">{vein.from}</span>
                              <div className={`flex-1 h-1 rounded-full ${
                                vein.status === 'flowing' ? 'bg-emerald-500/50' :
                                vein.status === 'congested' ? 'bg-amber-500/50' : 'bg-red-500/50'
                              }`} style={{ opacity: vein.flow_rate }}>
                                <div 
                                  className={`h-full rounded-full ${
                                    vein.status === 'flowing' ? 'bg-emerald-400' :
                                    vein.status === 'congested' ? 'bg-amber-400' : 'bg-red-400'
                                  }`}
                                  style={{ width: `${vein.flow_rate * 100}%` }}
                                />
                              </div>
                              <span className="text-slate-400 truncate w-20 text-right">{vein.to}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Three-Time Horizon Panel */}
                  <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-400" />
                        Three-Time Horizon
                        <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">NOW • RECENT • DEEP</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 lg:grid-cols-3">
                        {/* NOW */}
                        <div className="p-4 rounded-xl bg-gradient-to-b from-red-500/10 to-transparent border border-red-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                            <h3 className="font-semibold text-red-400">NOW</h3>
                          </div>
                          
                          {/* Alerts */}
                          <div className="space-y-2 mb-3">
                            {threeTimeHorizon?.now?.alerts?.map((alert) => (
                              <div key={alert.id} className={`p-2 rounded text-xs ${
                                alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                                alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-slate-700/50 text-slate-300'
                              }`}>
                                <div className="flex items-center gap-1">
                                  {alert.severity === 'critical' ? <Siren className="w-3 h-3" /> : 
                                   alert.severity === 'warning' ? <AlertTriangle className="w-3 h-3" /> :
                                   <AlertCircle className="w-3 h-3" />}
                                  {alert.message}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Sparklines */}
                          <div className="space-y-2">
                            {threeTimeHorizon?.now?.sparklines?.map((spark, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 w-16">{spark.name}</span>
                                <div className="flex-1 flex items-end gap-px h-4">
                                  {spark.data.map((val, j) => (
                                    <div 
                                      key={j} 
                                      className={`flex-1 rounded-t ${
                                        spark.trend === 'up' ? 'bg-emerald-500/50' :
                                        spark.trend === 'down' ? 'bg-red-500/50' : 'bg-slate-500/50'
                                      }`}
                                      style={{ height: `${(val / 100) * 100}%` }}
                                    />
                                  ))}
                                </div>
                                {spark.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> :
                                 spark.trend === 'down' ? <ArrowDownRight className="w-3 h-3 text-red-400" /> :
                                 <MinusCircle className="w-3 h-3 text-slate-400" />}
                              </div>
                            ))}
                          </div>

                          {/* Hot Channels */}
                          <div className="mt-3">
                            <p className="text-xs text-slate-500 mb-1">Hot Channels</p>
                            <div className="flex flex-wrap gap-1">
                              {threeTimeHorizon?.now?.hot_channels?.map((ch, i) => (
                                <Badge key={i} className="bg-red-500/20 text-red-400 border-0 text-xs animate-pulse">
                                  {ch}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* RECENT */}
                        <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <History className="w-4 h-4 text-amber-400" />
                            <h3 className="font-semibold text-amber-400">RECENT</h3>
                          </div>

                          {/* Trends */}
                          <div className="space-y-2 mb-3">
                            {threeTimeHorizon?.recent?.trends?.map((trend, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">{trend.metric}</span>
                                <div className="flex items-center gap-1">
                                  {trend.direction === 'improving' ? (
                                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                  ) : trend.direction === 'declining' ? (
                                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                                  ) : (
                                    <MinusCircle className="w-3 h-3 text-slate-400" />
                                  )}
                                  <span className={
                                    trend.direction === 'improving' ? 'text-emerald-400' :
                                    trend.direction === 'declining' ? 'text-red-400' : 'text-slate-400'
                                  }>
                                    {trend.change > 0 ? '+' : ''}{trend.change}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pattern Badges */}
                          <div className="mb-3">
                            <p className="text-xs text-slate-500 mb-1">Patterns</p>
                            <div className="space-y-1">
                              {threeTimeHorizon?.recent?.patterns?.map((pattern, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">{pattern.badge}</Badge>
                                  <span className="text-slate-400">{pattern.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Optimization Hints */}
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Hints</p>
                            <div className="space-y-1">
                              {threeTimeHorizon?.recent?.hints?.map((hint, i) => (
                                <div key={i} className="flex items-start gap-1 text-xs text-slate-400">
                                  <Lightbulb className="w-3 h-3 mt-0.5 text-amber-400" />
                                  <span>{hint}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* DEEP */}
                        <div className="p-4 rounded-xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Inbox className="w-4 h-4 text-purple-400" />
                            <h3 className="font-semibold text-purple-400">DEEP</h3>
                          </div>

                          {/* Evolution Timeline */}
                          <div className="mb-3">
                            <p className="text-xs text-slate-500 mb-1">Evolution</p>
                            <div className="space-y-1">
                              {threeTimeHorizon?.deep?.evolution?.map((ev, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <Milestone className="w-3 h-3 text-purple-400" />
                                  <span className="text-slate-500">{ev.date}</span>
                                  <span className="text-slate-300">{ev.event}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Preset Family Tree Summary */}
                          <div className="mb-3">
                            <p className="text-xs text-slate-500 mb-1">Preset Family Tree</p>
                            <div className="space-y-1">
                              {threeTimeHorizon?.deep?.preset_tree?.map((preset, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-300">{preset.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">{preset.descendants} descendants</span>
                                    <span className="text-purple-400">{Math.round(preset.success_rate * 100)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Learned Patterns */}
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Learned Patterns</p>
                            <div className="space-y-1">
                              {threeTimeHorizon?.deep?.learned_patterns?.map((lp, i) => (
                                <div key={i} className="text-xs">
                                  <code className="text-cyan-400">{lp.pattern}</code>
                                  <span className="text-slate-500 ml-2">×{lp.frequency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Confidence Field + Preset Lineage */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Confidence Field - Landscape */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                          <Mountain className="w-5 h-5 text-teal-400" />
                          Confidence Field
                          <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">Landscape</Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Queries as terrain • Elevation = certainty • Valleys need exploration
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative h-40 bg-gradient-to-b from-slate-900/50 to-slate-800/30 rounded-lg overflow-hidden">
                          {/* Background terrain */}
                          <div className="absolute inset-0 opacity-30">
                            <svg viewBox="0 0 200 100" className="w-full h-full" preserveAspectRatio="none">
                              <path d="M0,100 L0,60 Q25,40 50,50 T100,45 T150,55 T200,40 L200,100 Z" fill="url(#terrainGradient)" />
                              <defs>
                                <linearGradient id="terrainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#10b981" />
                                  <stop offset="100%" stopColor="#1e293b" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </div>
                          
                          {/* Query points */}
                          {confidencePoints?.map((point) => (
                            <div
                              key={point.id}
                              className={`absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150 ${
                                point.confidence > 0.8 ? 'bg-emerald-400 shadow-emerald-400/50 shadow-lg' :
                                point.confidence > 0.6 ? 'bg-amber-400 shadow-amber-400/50 shadow-lg' :
                                'bg-red-400 shadow-red-400/50 shadow-lg'
                              }`}
                              style={{
                                left: `${point.x}%`,
                                top: `${100 - point.elevation}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                              title={`${point.query}: ${Math.round(point.confidence * 100)}%`}
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-emerald-400" /> High confidence
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-amber-400" /> Medium
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-red-400" /> Needs exploration
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-1">
                          {confidencePoints?.slice(0, 4).map((p) => (
                            <div key={p.id} className="text-xs text-center p-1 rounded bg-slate-900/50">
                              <p className="text-slate-300 truncate">{p.query.split(' ')[0]}</p>
                              <p className={`font-mono ${
                                p.confidence > 0.8 ? 'text-emerald-400' :
                                p.confidence > 0.6 ? 'text-amber-400' : 'text-red-400'
                              }`}>{Math.round(p.confidence * 100)}%</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Preset Lineage Tree */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                          <TreeDeciduous className="w-5 h-5 text-green-400" />
                          Preset Lineage
                          <Badge className="bg-slate-700 text-slate-300 border-0 ml-auto text-xs">Family Tree</Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Trunk = base • Branches = explorations • Leaves = candidates
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          {/* Tree visualization */}
                          <svg className="w-full h-48" viewBox="0 0 300 150">
                            {/* Trunk */}
                            <rect x="135" y="120" width="30" height="25" rx="4" fill="#365314" stroke="#84cc16" strokeWidth="1" />
                            <text x="150" y="137" textAnchor="middle" fill="#a3e635" fontSize="8">Base</text>
                            
                            {/* Branches */}
                            <line x1="150" y1="120" x2="80" y2="80" stroke="#4ade80" strokeWidth="2" />
                            <line x1="150" y1="120" x2="150" y2="70" stroke="#4ade80" strokeWidth="2" />
                            <line x1="150" y1="120" x2="220" y2="80" stroke="#4ade80" strokeWidth="2" />
                            
                            {/* Branch nodes */}
                            <rect x="50" y="65" width="60" height="20" rx="4" fill="#14532d" stroke="#22c55e" strokeWidth="1" />
                            <text x="80" y="78" textAnchor="middle" fill="#4ade80" fontSize="8">Code Search</text>
                            
                            <rect x="120" y="55" width="60" height="20" rx="4" fill="#14532d" stroke="#22c55e" strokeWidth="1" />
                            <text x="150" y="68" textAnchor="middle" fill="#4ade80" fontSize="8">Doc Search</text>
                            
                            <rect x="190" y="65" width="60" height="20" rx="4" fill="#14532d" stroke="#22c55e" strokeWidth="1" />
                            <text x="220" y="78" textAnchor="middle" fill="#4ade80" fontSize="8">Bug Search</text>
                            
                            {/* Leaves */}
                            <line x1="80" y1="65" x2="50" y2="35" stroke="#86efac" strokeWidth="1" />
                            <line x1="80" y1="65" x2="110" y2="35" stroke="#86efac" strokeWidth="1" />
                            <line x1="150" y1="55" x2="150" y2="25" stroke="#86efac" strokeWidth="1" />
                            <line x1="220" y1="65" x2="200" y2="35" stroke="#86efac" strokeWidth="1" />
                            <line x1="220" y1="65" x2="240" y2="35" stroke="#86efac" strokeWidth="1" />
                            
                            {/* Leaf nodes */}
                            <circle cx="50" cy="30" r="10" fill="#166534" stroke="#4ade80" strokeWidth="1" />
                            <circle cx="110" cy="30" r="10" fill="#166534" stroke="#4ade80" strokeWidth="1" />
                            <circle cx="150" cy="20" r="10" fill="#166534" stroke="#4ade80" strokeWidth="1" />
                            <circle cx="200" cy="30" r="10" fill="#166534" stroke="#4ade80" strokeWidth="1" />
                            <circle cx="240" cy="30" r="10" fill="#166534" stroke="#4ade80" strokeWidth="1" />
                            
                            {/* Pruned node */}
                            <circle cx="270" cy="80" r="8" fill="#1c1917" stroke="#78716c" strokeWidth="1" strokeDasharray="2,2" className="animate-pulse" opacity="0.5" />
                            <text x="270" y="100" textAnchor="middle" fill="#78716c" fontSize="6">Pruned</text>
                          </svg>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                          <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
                            <p className="text-green-400 font-medium">Trunk</p>
                            <p className="text-slate-400">Conservative base</p>
                          </div>
                          <div className="text-center p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-emerald-400 font-medium">Branches</p>
                            <p className="text-slate-400">Explorations</p>
                          </div>
                          <div className="text-center p-2 rounded bg-lime-500/10 border border-lime-500/20">
                            <p className="text-lime-400 font-medium">Leaves</p>
                            <p className="text-slate-400">Candidates</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Session Narrative + Negotiations + Failures */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Session Narrative Timeline */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                          <Flag className="w-5 h-5 text-cyan-400" />
                          Session Narrative
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Story structure of current session
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Phase progress */}
                        <div className="relative mb-4">
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${sessionNarrative?.phases?.find(p => p.active)?.progress || 0}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Phases */}
                        <div className="space-y-2">
                          {sessionNarrative?.phases?.map((phase, i) => (
                            <div 
                              key={phase.name}
                              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                                phase.active ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-slate-900/50'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                phase.progress === 100 ? 'bg-emerald-500 text-white' :
                                phase.active ? 'bg-cyan-500 text-white animate-pulse' :
                                'bg-slate-700 text-slate-400'
                              }`}>
                                {i + 1}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${phase.active ? 'text-cyan-400' : 'text-slate-300'}`}>
                                  {phase.label}
                                </p>
                                <p className="text-xs text-slate-500">{phase.description}</p>
                              </div>
                              {phase.active && (
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-xs">Active</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Quality Score */}
                        <div className="mt-4 text-center">
                          <p className="text-xs text-slate-500">Quality Score</p>
                          <p className="text-2xl font-bold text-emerald-400">{sessionNarrative?.quality_score || 0}%</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* System Negotiation Panel */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-amber-400" />
                          Negotiations
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          System asks for your input
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(!negotiations || negotiations.length === 0) ? (
                          <div className="text-center py-8 text-slate-500">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                            <p>No pending negotiations</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {negotiations?.map((neg) => (
                              <div 
                                key={neg.id}
                                className={`p-3 rounded-lg border ${
                                  neg.urgency === 'high' ? 'bg-red-500/10 border-red-500/30' :
                                  neg.urgency === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                                  'bg-slate-900/50 border-slate-700'
                                }`}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  {neg.urgency === 'high' ? (
                                    <Siren className="w-4 h-4 text-red-400" />
                                  ) : neg.urgency === 'medium' ? (
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-slate-400" />
                                  )}
                                  <p className="text-sm text-slate-300">{neg.question}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {neg.options.map((opt) => (
                                    <Button 
                                      key={opt.id}
                                      size="sm"
                                      variant="outline"
                                      className="text-xs border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                                    >
                                      {opt.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Failure Learning Feed */}
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                          <Bug className="w-5 h-5 text-red-400" />
                          Failure Learning
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          How failures flow through the system
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(!failures || failures.length === 0) ? (
                          <div className="text-center py-8 text-slate-500">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                            <p>No recent failures</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {failures?.map((failure) => (
                              <div key={failure.id} className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <Badge className="bg-red-500/20 text-red-400 border-0">{failure.type}</Badge>
                                  {failure.resolved && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                                      <Check className="w-3 h-3 mr-1" /> Resolved
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Stage flow */}
                                <div className="flex items-center gap-1">
                                  {(['detect', 'characterize', 'respond', 'record', 'explain', 'learn'] as const).map((stage, i) => {
                                    const stageInfo = failure.stages[stage]
                                    const StageIcon = stage === 'detect' ? AlertCircle :
                                                     stage === 'characterize' ? Fingerprint :
                                                     stage === 'respond' ? Zap :
                                                     stage === 'record' ? Database :
                                                     stage === 'explain' ? MessageSquare :
                                                     Lightbulb
                                    return (
                                      <div key={stage} className="flex items-center">
                                        <div 
                                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            stageInfo.status === 'complete' 
                                              ? 'bg-emerald-500/20 border border-emerald-500/30' 
                                              : 'bg-slate-700 border border-slate-600'
                                          }`}
                                          title={stageInfo.details}
                                        >
                                          <StageIcon className={`w-4 h-4 ${
                                            stageInfo.status === 'complete' ? 'text-emerald-400' : 'text-slate-500'
                                          }`} />
                                        </div>
                                        {i < 5 && (
                                          <ArrowRight className={`w-3 h-3 ${
                                            stageInfo.status === 'complete' ? 'text-emerald-500' : 'text-slate-600'
                                          }`} />
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="mt-0">
                <Phase8Dashboard />
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat" className="mt-0">
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2 bg-slate-800/30 border-slate-700/50 backdrop-blur-sm flex flex-col h-[600px]">
                    <CardHeader className="border-b border-slate-700/50">
                      <CardTitle className="text-white">Chat Interface</CardTitle>
                      <CardDescription className="text-slate-400">
                        Test the proxy with OpenAI-compatible API
                      </CardDescription>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <MessageSquare className="w-12 h-12 mb-2" />
                          <p>Start a conversation to test the proxy</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-xl p-3 ${
                                  msg.role === 'user'
                                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                                    : 'bg-slate-700/50 text-white border border-slate-600'
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.modelUsed && (
                                  <div className="mt-2 text-xs opacity-70">
                                    <span>Model: {msg.modelUsed}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex justify-start">
                              <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600">
                                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="p-4 border-t border-slate-700/50">
                      {/* Model Selector Button */}
                      <div className="mb-3">
                        <Button 
                          onClick={() => setShowModelSelector(!showModelSelector)}
                          className={`w-full mb-2 ${currentModel ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {currentModel ? `Model: ${currentModel}` : 'Select Model'}
                        </Button>
                        {showModelSelector && (
                          <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                            <ModelSelector 
                              selectedModel={currentModel}
                              onModelLoaded={(modelId) => {
                                setModel(modelId)
                                setShowModelSelector(false)
                              }}
                              onModelUnloaded={() => {}}
                              disabled={isLoading}
                            />
                          </div>
                        )}
                      </div>

                      {/* Preset Selection Row */}
                      {modelPresets.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-slate-400">Quick Presets</Label>
                          <Select value={selectedModelPreset} onValueChange={loadPreset}>
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
                          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                          className={`border-slate-600 ${showAdvancedSettings ? 'text-cyan-400 border-cyan-500/30' : 'text-slate-400'} hover:text-white h-8 px-2`}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-400 hover:text-white h-8 px-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Advanced Settings Panel */}
                      {showAdvancedSettings && (
                        <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700 space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs text-slate-400">Temperature: {chatTemperature}</Label>
                              <Slider
                                value={[chatTemperature]}
                                onValueChange={([v]) => setChatTemperature(v)}
                                min={0} max={2} step={0.1}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-400">Max Tokens</Label>
                              <Input
                                type="number"
                                value={chatMaxTokens}
                                onChange={(e) => setChatMaxTokens(parseInt(e.target.value) || 2048)}
                                className="mt-1 h-7 bg-slate-800 border-slate-600 text-white text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-400">Context Length</Label>
                              <Select value={String(chatContextLength)} onValueChange={(v) => setChatContextLength(parseInt(v))}>
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
                                onCheckedChange={setChatThinkingMode}
                              />
                              <Label className="text-xs text-slate-300">Thinking Mode (/think)</Label>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">System Prompt</Label>
                            <Textarea
                              value={chatSystemPrompt}
                              onChange={(e) => setChatSystemPrompt(e.target.value)}
                              placeholder="Optional system prompt..."
                              className="mt-1 h-14 bg-slate-800 border-slate-600 text-white text-xs resize-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Quick status bar */}
                      <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                        {chatThinkingMode && <Badge className="bg-purple-500/20 text-purple-400 border-0 text-[10px]">THINK</Badge>}
                        <span>temp:{chatTemperature}</span>
                        <span>ctx:{chatContextLength >= 1024 ? `${chatContextLength/1024}K` : chatContextLength}</span>
                        <span>max:{chatMaxTokens}</span>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                          placeholder="Type your message..."
                          className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
                        />
                        <Button 
                          onClick={sendMessage} 
                          disabled={isLoading || !inputMessage.trim() || !currentModel}
                          className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-4">
                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-white">Current Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between text-slate-300">
                          <span>Approval Mode</span>
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-0">{approvalMode}</Badge>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>MCP Servers</span>
                          <Badge className="bg-slate-700 text-slate-300 border-0">{status?.protocols?.mcp?.servers || 0}</Badge>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>A2A Agents</span>
                          <Badge className="bg-slate-700 text-slate-300 border-0">{status?.protocols?.a2a?.agents || 0}</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-white">API Endpoints</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-xs font-mono bg-slate-900/50 p-3 rounded-lg">
                          <p className="text-slate-500"># Chat Completions</p>
                          <p className="text-cyan-400">POST /v1/chat/completions</p>
                          <p className="text-slate-500 mt-2"># Orchestrate</p>
                          <p className="text-purple-400">POST /v1/agent/orchestrate</p>
                          <p className="text-slate-500 mt-2"># Knowledge Query</p>
                          <p className="text-emerald-400">GET /knowledge</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Settings
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure LM Studio Proxy Bridge settings
            </DialogDescription>
          </DialogHeader>
          
          {/* Settings Tabs */}
          <div className="flex gap-2 border-b border-slate-700 pb-3 mb-4">
            {[
              { id: 'connection', label: 'Connection', icon: Wifi },
              { id: 'proxy', label: 'Proxy', icon: Server },
              { id: 'retrieval', label: 'Retrieval', icon: Search },
              { id: 'vram', label: 'VRAM', icon: MemoryStick },
              { id: 'export', label: 'Export', icon: Download },
            ].map(tab => (
              <Button
                key={tab.id}
                variant={settingsTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSettingsTab(tab.id as typeof settingsTab)}
                className={settingsTab === tab.id 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                  : 'text-slate-400 hover:text-white'
                }
              >
                <tab.icon className="w-4 h-4 mr-1" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Connection Tab */}
          {settingsTab === 'connection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">LM Studio Host</Label>
                  <Input
                    value={lmStudioHost}
                    onChange={(e) => setLmStudioHost(e.target.value)}
                    className="mt-1.5 bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Port</Label>
                  <Input
                    type="number"
                    value={lmStudioPort}
                    onChange={(e) => setLmStudioPort(parseInt(e.target.value) || 1234)}
                    className="mt-1.5 bg-slate-800 border-slate-600 text-white"
                  />
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
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Connected to LM Studio</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400">LM Studio not connected</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveSettings}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
                >
                  <Save className="w-3 h-3 mr-1" /> Save Settings
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await saveSettings()
                    try {
                      await fetch(`/models/reconnect`, { method: 'POST' })
                      setTimeout(() => { /* Status and models refresh via hooks */ }, 1500)
                    } catch (e) { console.error('Reconnect failed:', e) }
                  }}
                  className="border-slate-600 text-slate-400 hover:text-white"
                >
                  <Wifi className="w-3 h-3 mr-1" /> Save & Reconnect
                </Button>
              </div>
            </div>
          )}

          {/* Proxy Tab */}
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
                  {(['debug', 'info', 'warn', 'error'] as const).map(level => (
                    <Button
                      key={level}
                      size="sm"
                      variant={logLevel === level ? 'default' : 'outline'}
                      onClick={() => setLogLevel(level)}
                      className={logLevel === level 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                        : 'border-slate-600 text-slate-400'
                      }
                    >
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

          {/* Retrieval Tab */}
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
                  {(['fast', 'deep', 'cascade', 'hybrid'] as const).map(mode => (
                    <Button
                      key={mode}
                      size="sm"
                      variant={defaultReranker === mode ? 'default' : 'outline'}
                      onClick={() => setDefaultReranker(mode)}
                      className={defaultReranker === mode 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                        : 'border-slate-600 text-slate-400'
                      }
                    >
                      {mode === 'fast' && <Zap className="w-3 h-3 mr-1" />}
                      {mode === 'deep' && <Brain className="w-3 h-3 mr-1" />}
                      {mode === 'cascade' && <Layers className="w-3 h-3 mr-1" />}
                      {mode === 'hybrid' && <GitMerge className="w-3 h-3 mr-1" />}
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {defaultReranker === 'fast' && 'Fast: 0.6B model, ~45ms, good for quick searches'}
                  {defaultReranker === 'deep' && 'Deep: 4B model, ~5200ms, best accuracy with explanations'}
                  {defaultReranker === 'cascade' && 'Cascade: Fast first, escalate to Deep if confidence < 0.7'}
                  {defaultReranker === 'hybrid' && 'Hybrid: 0.6B filters top-20, 4B reranks top-5'}
                </p>
              </div>
            </div>
          )}

          {/* VRAM Tab */}
          {settingsTab === 'vram' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-slate-300">VRAM Budget (MB)</Label>
                  <span className="text-cyan-400 font-mono">{vramBudget} MB</span>
                </div>
                <Slider
                  value={[vramBudget]}
                  onValueChange={([val]) => setVramBudget(val)}
                  min={4096}
                  max={24576}
                  step={1024}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>4 GB</span>
                  <span>24 GB</span>
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

              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                {/* <p className="text-xs text-purple-300">
                  Current: {usedVRAM.toFixed(1)}GB / {TOTAL_VRAM}GB ({((usedVRAM / TOTAL_VRAM) * 100).toFixed(0)}% used)
                </p> */}
              </div>
            </div>
          )}

          {/* Export Tab */}
          {settingsTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-cyan-500/50"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/settings/export`)
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
                  }}
                >
                  <FileJson className="w-6 h-6 text-cyan-400" />
                  <span>Export Settings</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-purple-500/50"
                  onClick={async () => {
                    try {
                      // Export full project documentation
                      const docs = {
                        exportDate: new Date().toISOString(),
                        settings: {
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
                          preWarmModels
                        },
                        status: status,
                        models: models,
                        tools: tools,
                        knowledgeNodes: knowledgeNodes.slice(0, 100),
                        mcpServers: mcpServers,
                        a2aAgents: a2aAgents
                      }
                      
                      const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `lmstudio-proxy-bridge-export-${new Date().toISOString().split('T')[0]}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch (e) {
                      console.error('Export failed:', e)
                    }
                  }}
                >
                  <FolderArchive className="w-6 h-6 text-purple-400" />
                  <span>Export Project</span>
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-300 mb-3">Import Settings</p>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".json"
                    className="flex-1 bg-slate-800 border-slate-600 text-white"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          const text = await file.text()
                          const data = JSON.parse(text)
                          if (data.settings) {
                            setLmStudioHost(data.settings.lmStudioHost || '192.168.1.12')
                            setLmStudioPort(data.settings.lmStudioPort || 1234)
                            setAutoConnect(data.settings.autoConnect ?? true)
                            setStreamingEnabled(data.settings.streamingEnabled ?? true)
                            setLoggingEnabled(data.settings.loggingEnabled ?? true)
                            setLogLevel(data.settings.logLevel || 'info')
                            setCacheEmbeddings(data.settings.cacheEmbeddings ?? true)
                            setDefaultReranker(data.settings.defaultReranker || 'cascade')
                            setVramBudget(data.settings.vramBudget || 8192)
                            setAutoEvict(data.settings.autoEvict ?? true)
                            setPreWarmModels(data.settings.preWarmModels ?? true)
                          }
                        } catch (err) {
                          console.error('Import failed:', err)
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                  <div className="text-xs text-red-300">
                    <p className="font-medium">Reset to Defaults</p>
                    <p className="mt-1">This will reset all settings to their default values.</p>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="mt-2"
                      onClick={() => {
                        setLmStudioHost('192.168.1.12')
                        setLmStudioPort(1234)
                        setAutoConnect(true)
                        setStreamingEnabled(true)
                        setLoggingEnabled(true)
                        setLogLevel('info')
                        setCacheEmbeddings(true)
                        setDefaultReranker('cascade')
                        setVramBudget(8192)
                        setAutoEvict(true)
                        setPreWarmModels(true)
                      }}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await saveSettings()
                setSettingsOpen(false)
              }}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white"
            >
              <Save className="w-4 h-4 mr-1" />
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Status Bar */}
      <footer className="border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-xl mt-auto">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                Last Action: {lastActionTime}ms
              </span>
              <Separator orientation="vertical" className="h-4 bg-slate-700" />
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Cache Hit: {cacheHitRate}%
              </span>
              <Separator orientation="vertical" className="h-4 bg-slate-700" />
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Alerts: 0
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-purple-400" />
                Knowledge Graph
              </span>
              <span className="flex items-center gap-1">
                <Network className="w-3 h-3 text-cyan-400" />
                MCP/A2A
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Orchestration
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
