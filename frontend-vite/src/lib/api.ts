// API Utilities - Centralized Proxy Bridge API Calls
// Uses Bun's optimized fetch with connection pooling

import { z } from 'zod'
import type {
  ProxyStatus,
  Tool,
  KnowledgeNode,
  MCPServer,
  A2AAgent,
  AsyncTask,
  ModelInfo,
  ModelPresetConfig,
  EmbeddingPreset,
  MRLPreset,
  RerankerConfig,
  ChatTestPreset,
  GatewayTransformation,
  ThreeTimeHorizon,
  VRAMTetrisBlock,
  HealthOrganism,
  ConfidencePoint,
  PresetNode,
  SessionNarrative,
  Negotiation,
  FailureRecord,
  AppSettings,
  CacheStats,
  PerformanceMetrics,
  WorklogEntry,
  HardwareProfile,
  ModelRecommendation,
  PresetConfig,
  AgentSession,
  AgentTurn,
  RetrievalResult,
  RerankResult,
  HealthStatus,
  AnomalyAlert,
  PerfectionPoint,
  ToolMetrics,
  CircuitBreakerState,
  ResilienceMode,
  FallbackLevel,
  CapabilityEnvelope,
  ProbeResult,
  PresetLineageNode,
  PrewarmingMetrics,
  TruncationPattern,
  RerankerStats,
  StreamingMode,
  VisionCapability,
  ACIDSession,
  SSEChannel,
  ScoredChunk
} from './types'
import { PROXY_BRIDGE_URL } from './config'

const BASE_URL = PROXY_BRIDGE_URL // Direct backend access to avoid Vite proxy fallbacks

async function fetchProxy<T>(
  endpoint: string,
  options?: RequestInit,
  schema?: z.ZodType<T>
): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    if (!res.ok) {
      let details: unknown = null
      try {
        details = await res.json()
      } catch {
        try {
          details = await res.text()
        } catch {
          details = null
        }
      }
      console.error(`[api] ${res.status} ${res.statusText} for ${endpoint}`, details)
      return null
    }

    let json: unknown
    try {
      json = await res.json()
    } catch (error) {
      console.error(`[api] Failed to parse JSON for ${endpoint}`, error)
      return null
    }

    if (!schema) return json as T

    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      console.error(`[api] Response schema validation failed for ${endpoint}`, parsed.error)
      return null
    }
    return parsed.data
  } catch {
    console.error(`[api] Network error for ${endpoint}`)
    return null
  }
}

// Status & Health
export async function fetchStatus(): Promise<ProxyStatus | null> {
  return fetchProxy<ProxyStatus>('/status')
}

// Models
export async function fetchAvailableModels(): Promise<ModelInfo[] | null> {
  const availableModelSchema = z.object({
    modelKey: z.string(),
    displayName: z.string(),
    type: z.union([z.literal('llm'), z.literal('embedding')]),
    format: z.string(),
    sizeBytes: z.number(),
    sizeGB: z.number(),
    params: z.string().nullable(),
    architecture: z.string().nullable(),
    quantization: z.string().nullable(),
    loaded: z.boolean(),
  })

  const modelsAvailableResponseSchema = z.object({
    models: z.array(availableModelSchema),
    connected: z.boolean().optional(),
  })

  const openAIModelsResponseSchema = z.object({
    data: z.array(
      z.object({
        id: z.string(),
      })
    ),
  })

  const modelsWithMetadata = await fetchProxy('/models/available', undefined, modelsAvailableResponseSchema)
  if (modelsWithMetadata?.models) {
    return modelsWithMetadata.models.map((m) => ({
      modelKey: m.modelKey,
      displayName: m.displayName,
      type: m.type,
      format: m.format,
      sizeBytes: m.sizeBytes,
      sizeGB: m.sizeGB,
      params: m.params,
      architecture: m.architecture,
      quantization: m.quantization,
      loaded: m.loaded,
      id: m.modelKey,
      name: m.displayName,
      vram: m.sizeGB,
      contextLength: m.type === 'llm' ? 8192 : 0,
      capabilities: m.type === 'llm' ? ['chat', 'reasoning'] : ['embedding'],
      tps: m.type === 'llm' ? 30 : 0,
      ttft: m.type === 'llm' ? 150 : 0,
      bestFor:
        m.type === 'embedding'
          ? 'Embeddings, semantic search'
          : m.params
            ? `${m.params} model`
            : 'General chat',
    }))
  }

  const openAIModels = await fetchProxy('/v1/models', undefined, openAIModelsResponseSchema)
  if (!openAIModels?.data) return null

  console.error(
    `[api] /models/available did not return model metadata; falling back to /v1/models (limited model info only)`
  )

  return openAIModels.data.map((m) => ({
    modelKey: m.id,
    displayName: m.id.split('/').pop() || m.id,
    type: m.id.includes('embedding') ? 'embedding' : 'llm',
    format: 'GGUF',
    sizeBytes: 0,
    sizeGB: 0,
    params: null,
    architecture: null,
    quantization: null,
    loaded: false,
    id: m.id,
    name: m.id.split('/').pop() || m.id,
    vram: 0,
    contextLength: 8192,
    capabilities: m.id.includes('embedding') ? ['embedding'] : ['chat'],
    tps: 0,
    ttft: 0,
    bestFor: 'General use',
  }))
}

export async function fetchLoadedModels(): Promise<{ data: { instance_id: string; type: string; load_time_seconds: number }[]; count: number } | null> {
  return fetchProxy<{ data: any[]; count: number }>('/models/loaded')
}

export async function loadModel(modelId: string, config?: { context_length?: number; gpu_layers?: number; tensor_split?: number[] }): Promise<{ instance_id: string; type: string; load_time_seconds: number; status: string } | null> {
  return fetchProxy('/models/load', {
    method: 'POST',
    body: JSON.stringify({ model: modelId, ...config }),
  })
}

export async function unloadModel(modelId: string): Promise<{ instance_id: string; status: string } | null> {
  return fetchProxy('/models/unload', {
    method: 'POST',
    body: JSON.stringify({ model: modelId }),
  })
}

export async function getModelStats(modelId: string): Promise<{ model_id: string; memory_usage_mb: number; tokens_processed: number; avg_tps: number; uptime_seconds: number; requests_total: number } | null> {
  return fetchProxy(`/models/stats/${encodeURIComponent(modelId)}`)
}

// Hardware
export async function fetchHardwareProfile(): Promise<HardwareProfile | null> {
  return fetchProxy<HardwareProfile>('/hardware/profile')
}

export async function fetchRecommendations(): Promise<ModelRecommendation[] | null> {
  const data = await fetchProxy<{ recommendations: ModelRecommendation[] }>('/hardware/recommendations')
  return data?.recommendations ?? null
}

// Retrieval
export async function retrieveDocuments(
  query: string,
  docs: string[],
  config: { top_k?: number; min_score?: number; retrieval_method?: 'dense' | 'sparse' | 'hybrid' }
): Promise<RetrievalResult | null> {
  return fetchProxy('/retrieval/documents', {
    method: 'POST',
    body: JSON.stringify({ query, docs, config }),
  })
}

export async function rerankChunks(
  query: string,
  chunks: string[],
  topK = 5
): Promise<RerankResult | null> {
  return fetchProxy('/retrieval/rerank', {
    method: 'POST',
    body: JSON.stringify({ query, chunks, top_k: topK }),
  })
}

// Agent
export async function createAgentSession(
  workflow: string,
  model: string
): Promise<AgentSession | null> {
  return fetchProxy('/agent/sessions', {
    method: 'POST',
    body: JSON.stringify({ workflow, model }),
  })
}

export async function executeAgentTurn(
  sessionId: string,
  input: string
): Promise<AgentTurn | null> {
  return fetchProxy(`/agent/sessions/${encodeURIComponent(sessionId)}/turns`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  })
}

export async function getAgentSession(id: string): Promise<AgentSession | null> {
  return fetchProxy(`/agent/sessions/${encodeURIComponent(id)}`)
}

export async function branchSession(
  sessionId: string,
  fromCheckpoint: string
): Promise<AgentSession | null> {
  return fetchProxy(`/agent/sessions/${encodeURIComponent(sessionId)}/branch`, {
    method: 'POST',
    body: JSON.stringify({ from_checkpoint: fromCheckpoint }),
  })
}

// ACE
export async function generateACE(body: Record<string, unknown>): Promise<{ session_id: string; trace_id: string; status: string } | null> {
  return fetchProxy('/ace/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function traceACE(sessionId: string): Promise<{ session_id: string; events: unknown[]; duration_ms: number } | null> {
  return fetchProxy(`/ace/trace/${encodeURIComponent(sessionId)}`)
}

// Presets
export async function generatePreset(modelId: string, useCase: string): Promise<PresetConfig | null> {
  return fetchProxy('/presets/generate', {
    method: 'POST',
    body: JSON.stringify({ model_id: modelId, use_case: useCase }),
  })
}

export async function listPresets(): Promise<PresetConfig[] | null> {
  const data = await fetchProxy<{ presets: PresetConfig[] }>('/presets')
  return data?.presets ?? null
}

export async function applyPreset(id: string): Promise<{ success: boolean; applied_config: PresetConfig } | null> {
  return fetchProxy(`/presets/${encodeURIComponent(id)}/apply`, {
    method: 'POST',
  })
}

export async function deletePreset(id: string): Promise<boolean | null> {
  return fetchProxy(`/presets/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// Observability
export async function fetchObservabilityHealth(): Promise<HealthStatus | null> {
  return fetchProxy('/api/observability/health')
}

export async function fetchObservabilityAnalytics(tool?: string): Promise<ToolMetrics[] | null> {
  const endpoint = tool
    ? `/observability/analytics/${encodeURIComponent(tool)}`
    : '/observability/analytics'
  const data = await fetchProxy<{ metrics: ToolMetrics[] }>(endpoint)
  return data?.metrics ?? null
}

export async function fetchObservabilityPerfection(): Promise<PerfectionPoint[] | null> {
  const data = await fetchProxy<{ points: PerfectionPoint[] }>('/observability/perfection')
  return data?.points ?? null
}

export async function fetchObservabilityAlerts(): Promise<AnomalyAlert[] | null> {
  const data = await fetchProxy<{ alerts: AnomalyAlert[] }>('/observability/alerts')
  return data?.alerts ?? null
}

export async function fetchObservabilityReports(type?: string): Promise<Record<string, unknown>[] | null> {
  const endpoint = type
    ? `/observability/reports/${encodeURIComponent(type)}`
    : '/observability/reports'
  const data = await fetchProxy<{ reports: Record<string, unknown>[] }>(endpoint)
  return data?.reports ?? null
}

export async function fetchObservabilityRegressions(): Promise<{ regressions: { tool: string; metric: string; before: number; after: number; severity: string }[] } | null> {
  return fetchProxy('/observability/regressions')
}

export async function fetchObservabilityProbing(): Promise<ProbeResult[] | null> {
  const data = await fetchProxy<{ probes: ProbeResult[] }>('/observability/probing')
  return data?.probes ?? null
}

export async function fetchObservabilitySharding(): Promise<{ shards: { id: string; size: number; models: string[]; vram_mb: number }[] } | null> {
  return fetchProxy('/observability/sharding')
}

export async function fetchObservabilityPrewarming(): Promise<PrewarmingMetrics | null> {
  return fetchProxy('/observability/prewarming')
}

export async function fetchObservabilityTruncation(): Promise<TruncationPattern[] | null> {
  const data = await fetchProxy<{ patterns: TruncationPattern[] }>('/observability/truncation')
  return data?.patterns ?? null
}

export async function fetchObservabilityReranker(): Promise<RerankerStats | null> {
  return fetchProxy('/observability/reranker')
}

export async function fetchObservabilityVRAM(): Promise<VRAMTetrisBlock[] | null> {
  const data = await fetchProxy<{ blocks: VRAMTetrisBlock[] }>('/observability/vram')
  return data?.blocks ?? null
}

export async function fetchObservabilityPresets(): Promise<PresetLineageNode[] | null> {
  const data = await fetchProxy<{ lineage: PresetLineageNode[] }>('/observability/presets')
  return data?.lineage ?? null
}

export async function fetchObservabilityStreaming(): Promise<StreamingMode | null> {
  return fetchProxy('/observability/streaming')
}

export async function fetchObservabilityVision(): Promise<VisionCapability | null> {
  return fetchProxy('/observability/vision')
}

export async function fetchObservabilityResilience(): Promise<ResilienceMode | null> {
  return fetchProxy('/observability/resilience')
}

export async function fetchObservabilityHorizon(): Promise<ThreeTimeHorizon | null> {
  return fetchProxy('/observability/horizon')
}

export async function fetchObservabilityConfidence(): Promise<ConfidencePoint[] | null> {
  const data = await fetchProxy<{ points: ConfidencePoint[] }>('/observability/confidence')
  return data?.points ?? null
}

export async function fetchObservabilityPresetsLineage(): Promise<PresetNode[] | null> {
  const data = await fetchProxy<{ presets: PresetNode[] }>('/observability/presets/lineage')
  return data?.presets ?? null
}

export async function fetchObservabilityNarrative(sessionId: string): Promise<SessionNarrative | null> {
  return fetchProxy(`/observability/narrative/${sessionId}`)
}

export async function fetchObservabilityNegotiations(): Promise<Negotiation[] | null> {
  const data = await fetchProxy<{ negotiations: Negotiation[] }>('/observability/negotiations')
  return data?.negotiations ?? null
}

export async function fetchObservabilityFailures(): Promise<FailureRecord[] | null> {
  const data = await fetchProxy<{ failures: FailureRecord[] }>('/observability/failures')
  return data?.failures ?? null
}

// SSE
export async function createSSEConnection(channel: string): Promise<SSEChannel | null> {
  return fetchProxy('/sse/connect', {
    method: 'POST',
    body: JSON.stringify({ channel }),
  })
}

// MCP
export async function listMCPTools(): Promise<{ tools: Tool[] } | null> {
  return fetchProxy('/api/mcp/tools')
}

export async function callMCPTool(name: string, args: Record<string, unknown>): Promise<{ result: unknown; duration_ms: number; success: boolean } | null> {
  return fetchProxy('/mcp/tools/call', {
    method: 'POST',
    body: JSON.stringify({ name, args }),
  })
}

// Tools
export async function fetchTools(): Promise<Tool[] | null> {
  const data = await fetchProxy<{ tools: Tool[] }>('/api/tools/list')
  return data?.tools ?? null
}

// Knowledge Graph
export async function fetchKnowledgeNodes(): Promise<KnowledgeNode[] | null> {
  const data = await fetchProxy<{ nodes: KnowledgeNode[] }>('/knowledge')
  return data?.nodes ?? null
}

export async function queryKnowledge(query: string): Promise<{ nodes: KnowledgeNode[]; paths: string[][] } | null> {
  return fetchProxy(`/knowledge?query=${encodeURIComponent(query)}`)
}

export async function indexDocument(content: string, url?: string, filename?: string): Promise<{ success: boolean; docId: string; nodesAdded: number } | null> {
  return fetchProxy('/knowledge/index', {
    method: 'POST',
    body: JSON.stringify({ content, url, filename }),
  })
}

export async function fetchUrl(url: string): Promise<{ content: string } | null> {
  return fetchProxy(`/knowledge/fetch?url=${encodeURIComponent(url)}`)
}

// Protocols - MCP & A2A
export async function fetchMCPServers(): Promise<MCPServer[] | null> {
  const data = await fetchProxy<{ servers: MCPServer[] }>('/api/mcp/servers')
  return data?.servers ?? null
}

export async function fetchA2AAgents(): Promise<A2AAgent[] | null> {
  const data = await fetchProxy<{ agents: A2AAgent[] }>('/a2a/agents')
  return data?.agents ?? null
}

export async function fetchAsyncTasks(): Promise<AsyncTask[] | null> {
  const data = await fetchProxy<{ tasks: AsyncTask[] }>('/async/tasks')
  return data?.tasks ?? null
}

// Model Presets
export async function fetchModelPresets(): Promise<ModelPresetConfig[] | null> {
  const data = await fetchProxy<{ presets: ModelPresetConfig[] }>('/settings/presets')
  return data?.presets ?? null
}

export async function createModelPreset(preset: Partial<ModelPresetConfig>): Promise<ModelPresetConfig | null> {
  return fetchProxy('/settings/presets', {
    method: 'POST',
    body: JSON.stringify(preset),
  })
}

export async function deleteModelPreset(id: string): Promise<boolean | null> {
  return fetchProxy(`/settings/presets/${id}`, { method: 'DELETE' })
}

// Embedding & Gateway
export async function fetchEmbeddingPresets(): Promise<{ presets: Record<string, EmbeddingPreset>; mrl_presets: Record<string, MRLPreset>; reranker_configs: Record<string, RerankerConfig> } | null> {
  return fetchProxy('/presets/embedding')
}

export async function fetchChatTestPresets(): Promise<ChatTestPreset[] | null> {
  const data = await fetchProxy<{ presets: ChatTestPreset[] }>('/presets/chat-tests')
  return data?.presets ?? null
}

export async function runGatewaySearch(
  query: string,
  presetType: string,
  mrlDimension: number,
  rerankerMode: string,
  topK = 5
): Promise<GatewayTransformation | null> {
  return fetchProxy('/gateway/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      preset_type: presetType,
      mrl_dimension: mrlDimension,
      reranker_mode: rerankerMode,
      top_k: topK,
    }),
  })
}

export async function runChatTest(presetId: string): Promise<any | null> {
  return fetchProxy('/chat-test/run', {
    method: 'POST',
    body: JSON.stringify({ preset_id: presetId }),
  })
}

export async function fetchGatewayLog(): Promise<GatewayTransformation[] | null> {
  const data = await fetchProxy<{ transformations: GatewayTransformation[] }>('/gateway/log')
  return data?.transformations ?? null
}

// Settings
export async function fetchSettings(): Promise<AppSettings | null> {
  return fetchProxy('/settings')
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings | null> {
  return fetchProxy('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
}

export async function updateApprovalMode(mode: string): Promise<boolean | null> {
  return fetchProxy('/approval-mode', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  })
}

// Cache & Metrics
export async function fetchCacheStats(): Promise<CacheStats | null> {
  return fetchProxy('/cache/stats')
}

export async function clearCache(): Promise<boolean | null> {
  return fetchProxy('/cache/clear', { method: 'POST' })
}

export async function fetchPerformanceMetrics(): Promise<PerformanceMetrics | null> {
  return fetchProxy('/metrics')
}

export async function fetchWorklogs(): Promise<WorklogEntry[]> {
  try {
    const data = await fetchProxy<WorklogEntry[]>('/api/worklog/')
    return data || []
  } catch (error) {
    console.error('Failed to fetch worklogs:', error)
    return []
  }
}

// Chat
export async function sendChatMessage(
  model: string,
  messages: { role: string; content: string }[],
  options?: {
    temperature?: number
    max_tokens?: number
    stream?: boolean
  }
): Promise<any> {
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2048,
      stream: options?.stream ?? false,
    }),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Chat failed')
  }
  
  return res.json()
}

export async function sendStatefulChat(
  model: string,
  input: string,
  previousResponseId?: string,
  store = true
): Promise<any> {
  const res = await fetch(`${BASE_URL}/chat/stateful`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input,
      previous_response_id: previousResponseId,
      store,
    }),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Stateful chat failed')
  }
  
  return res.json()
}

// Embeddings
export async function generateEmbedding(
  model: string,
  input: string
): Promise<{ embedding: number[]; model: string } | null> {
  const data = await fetchProxy<{ data: { embedding: number[] }[]; model: string }>('/v1/embeddings', {
    method: 'POST',
    body: JSON.stringify({ model, input }),
  })
  
  if (!data?.data?.[0]) return null
  
  return {
    embedding: data.data[0].embedding,
    model: data.model,
  }
}

// Reranking
export async function rerankDocuments(
  model: string,
  query: string,
  documents: string[],
  topN = 3
): Promise<{ results: { text: string; score: number }[]; model: string } | null> {
  return fetchProxy('/v1/rerank', {
    method: 'POST',
    body: JSON.stringify({
      model,
      query,
      documents,
      top_n: topN,
    }),
  })
}

// Orchestration
export async function orchestrate(
  intent: string,
  toolsAvailable: string[],
  agentsAvailable: string[],
  orchestrationMode: 'adaptive' | 'mcp_only' | 'a2a_only' | 'local_only' = 'adaptive'
): Promise<any> {
  return fetchProxy('/v1/agent/orchestrate', {
    method: 'POST',
    body: JSON.stringify({
      intent,
      context: {},
      tools_available: toolsAvailable,
      agents_available: agentsAvailable,
      orchestration_mode: orchestrationMode,
    }),
  })
}

export async function previewTrigger(
  message: string,
  overrides?: {
    orchestration_mode?: string
    context_strategy?: string
    max_steps?: number
    tool_budget?: number
  }
): Promise<{ trigger_profile: any; resolved: any } | null> {
  return fetchProxy('/v1/agent/trigger-preview', {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...overrides,
    }),
  })
}
