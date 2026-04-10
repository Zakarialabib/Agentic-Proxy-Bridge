// Proxy Bridge Types - Centralized Type Definitions

export interface ProxyStatus {
  status: string
  active_engine?: 'lmstudio' | 'vllm'
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

export interface Tool {
  name: string
  description: string
  schema?: Record<string, unknown>
  safety_level: 'autonomous' | 'supervised' | 'manual'
  source?: string
  health?: string
}

export interface KnowledgeNode {
  id: string
  type: string
  name: string
  content: string
  layer: string
}

export interface MCPServer {
  id: string
  name: string
  transport: string
  tools_count: number
  health: string
  status?: 'connected' | 'disconnected' | 'connecting' | 'error'
  error?: string
}

export interface A2AAgent {
  id: string
  name: string
  capabilities: string[]
  status: string
  current_tasks: number
}

export interface AsyncTask {
  id: string
  type: string
  tool_or_agent: string
  status: string
  started_at: number
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  protocol?: string
  pre_triggered?: string[]
}

export interface OrchestrationResult {
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

export interface WorklogEntry {
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

export interface EmbeddingPreset {
  name: string
  type: string
  instruction_prefix: string
  negative_query_template?: string
  metadata_filters?: Record<string, string>
  mrl_dimension: number
  reranker_mode: 'fast' | 'deep' | 'cascade' | 'hybrid'
  description: string
}

export interface MRLPreset {
  dimension: number
  name: string
  speed: string
  quality: string
  use_case: string
}

export interface RerankerConfig {
  model: string
  threshold: number
  latency_ms: number
  description: string
}

export interface ChatTestPreset {
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

export interface GatewayTransformation {
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

export interface VRAMTetrisBlock {
  id: string
  name: string
  start: number
  size: number
  temperature: 'hot' | 'warm' | 'cold'
  color: string
  moving?: boolean
  fragment?: boolean
}

export interface HorizonNow {
  alerts: { id: string; severity: 'info' | 'warning' | 'critical'; message: string; time: number }[]
  sparklines: { name: string; data: number[]; trend: 'up' | 'down' | 'stable' }[]
  hot_channels: string[]
}

export interface HorizonRecent {
  trends: { metric: string; direction: 'improving' | 'declining' | 'stable'; change: number }[]
  patterns: { name: string; badge: string; description: string }[]
  hints: string[]
}

export interface HorizonDeep {
  evolution: { date: string; event: string; impact: string }[]
  preset_tree: { name: string; descendants: number; success_rate: number }[]
  learned_patterns: { pattern: string; frequency: number; confidence: number }[]
}

export interface ThreeTimeHorizon {
  now: HorizonNow
  recent: HorizonRecent
  deep: HorizonDeep
}

export interface HealthOrganism {
  organs: { name: string; health: 'healthy' | 'sick' | 'critical'; pulse_rate: number; last_activity: number }[]
  veins: { from: string; to: string; flow_rate: number; status: 'flowing' | 'congested' | 'blocked' }[]
  breathing_rate: number
  overall_health: number
}

export interface ConfidencePoint {
  id: string
  query: string
  x: number
  y: number
  elevation: number
  confidence: number
  color: string
}

export interface PresetNode {
  id: string
  name: string
  type: 'trunk' | 'branch' | 'leaf' | 'pruned'
  parent?: string
  children: string[]
  metrics: { success_rate: number; usage_count: number }
  fading?: boolean
  grafting?: boolean
}

export interface NarrativePhase {
  name: 'opening' | 'rising_action' | 'climax' | 'resolution' | 'denouement'
  label: string
  description: string
  progress: number
  active: boolean
}

export interface SessionNarrative {
  session_id: string
  current_phase: string
  phases: NarrativePhase[]
  quality_score: number
  events: { phase: string; event: string; timestamp: number }[]
}

export interface Negotiation {
  id: string
  type: 'vram_pressure' | 'new_preset' | 'model_conflict' | 'resource_limit'
  question: string
  options: { id: string; label: string; action: string }[]
  urgency: 'low' | 'medium' | 'high'
  timestamp: number
}

export interface FailureRecord {
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

export interface ModelInfo {
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
  id: string
  name: string
  vram: number
  contextLength: number
  capabilities: string[]
  tps: number
  ttft: number
  bestFor: string
}

export interface ModelPresetConfig {
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

export interface AppSettings {
  lm_studio: {
    host: string
    port: number
    auto_connect: boolean
  }
  proxy: {
    streaming_enabled: boolean
    logging_enabled: boolean
    log_level: 'debug' | 'info' | 'warn' | 'error'
  }
  retrieval: {
    cache_embeddings: boolean
    default_reranker: 'fast' | 'deep' | 'cascade' | 'hybrid'
  }
  vram: {
    budget_mb: number
    auto_evict: boolean
    pre_warm: boolean
  }
}

export interface CacheStats {
  hits: number
  misses: number
  hit_rate: number
  size: number
}

export interface PerformanceMetrics {
  total_requests: number
  avg_latency_ms: number
  ttft_p50_ms: number
  ttft_p95_ms: number
  tps: number
  success_rate: number
}

export interface HardwareProfile {
  gpu: {
    name: string
    vram_total_mb: number
    vram_available_mb: number
    compute_capability: string
    driver_version: string
  }
  cpu: {
    model: string
    cores: number
    threads: number
    clock_ghz: number
  }
  ram: {
    total_gb: number
    available_gb: number
  }
  os: string
  architecture: string
}

export interface ModelRecommendation {
  model_key: string
  display_name: string
  fit_score: number
  estimated_vram_mb: number
  expected_tps: number
  quantization: string
  reason: string
  alternatives: string[]
}

export interface PresetConfig {
  id: string
  name: string
  model_id: string
  use_case: string
  params: Record<string, unknown>
  performance_profile: {
    expected_tps: number
    expected_ttft_ms: number
    vram_mb: number
  }
  created_at: number
  updated_at: number
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'success' | 'failed'
  started_at: number
  completed_at?: number
  error?: string
}

export interface ToolResult {
  tool_call_id: string
  output: unknown
  duration_ms: number
  success: boolean
  error?: string
}

export interface AgentSession {
  id: string
  workflow: string
  model: string
  status: 'running' | 'paused' | 'completed' | 'failed' | 'branched'
  created_at: number
  updated_at: number
  turns: number
  checkpoints: string[]
  parent_session_id?: string
}

export interface AgentTurn {
  id: string
  session_id: string
  input: string
  steps: AgentStep[]
  result?: AgentResult
  created_at: number
  completed_at?: number
}

export interface AgentStep {
  id: string
  turn_id: string
  type: 'thought' | 'tool_call' | 'tool_result' | 'response'
  content: string
  tool_call?: ToolCall
  tool_result?: ToolResult
  timestamp: number
}

export interface AgentResult {
  output: string
  tool_calls_made: number
  total_duration_ms: number
  success: boolean
  error?: string
}

export interface RetrievalResult {
  documents: {
    content: string
    score: number
    metadata: Record<string, unknown>
    source: string
  }[]
  query: string
  total_time_ms: number
  retrieval_method: string
}

export interface RerankResult {
  chunks: ScoredChunk[]
  query: string
  total_time_ms: number
  reranker_model: string
}

export interface ScoredChunk {
  index: number
  content: string
  score: number
  metadata?: Record<string, unknown>
}

export interface RetrievalConfig {
  top_k: number
  min_score: number
  retrieval_method: 'dense' | 'sparse' | 'hybrid'
  reranker?: 'fast' | 'deep' | 'cascade' | 'hybrid'
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  components: {
    name: string
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency_ms: number
    last_check: number
  }[]
  uptime_seconds: number
  version: string
}

export interface AnomalyAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  metric: string
  current_value: number
  expected_value: number
  deviation: number
  timestamp: number
  message: string
  acknowledged: boolean
}

export interface PerfectionPoint {
  id: string
  tool: string
  score: number
  dimensions: {
    accuracy: number
    latency: number
    reliability: number
    cost: number
  }
  timestamp: number
  baseline_score: number
}

export interface ToolMetrics {
  tool: string
  calls_total: number
  calls_success: number
  calls_failed: number
  avg_latency_ms: number
  p95_latency_ms: number
  error_rate: number
  last_called: number
}

export interface CircuitBreakerState {
  tool: string
  state: 'closed' | 'open' | 'half_open'
  failure_count: number
  failure_threshold: number
  last_failure: number
  recovery_at?: number
}

export interface ResilienceMode {
  mode: 'strict' | 'balanced' | 'lenient'
  fallback_chain: string[]
  timeout_ms: number
  max_retries: number
  circuit_breaker_enabled: boolean
}

export interface FallbackLevel {
  level: number
  strategy: string
  model?: string
  params?: Record<string, unknown>
  trigger_condition: string
}

export interface CapabilityEnvelope {
  capability: string
  supported: boolean
  confidence: number
  requirements: string[]
  limitations: string[]
  version: string
}

export interface ProbeResult {
  probe_id: string
  target: string
  status: 'pass' | 'fail' | 'degraded'
  latency_ms: number
  details: Record<string, unknown>
  timestamp: number
}

export interface PresetLineageNode {
  id: string
  preset_id: string
  parent_id?: string
  generation: number
  changes: string[]
  performance_delta: number
  created_at: number
}

export interface PrewarmingMetrics {
  prewarmed_tools: {
    name: string
    last_warmed: number
    warm_duration_ms: number
    hit_count: number
    miss_count: number
  }[]
  cache_hit_rate: number
  total_warm_time_ms: number
  patterns_detected: string[]
}

export interface TruncationPattern {
  id: string
  type: 'context_overflow' | 'token_limit' | 'intelligent_summary' | 'hard_cut'
  trigger: string
  tokens_before: number
  tokens_after: number
  information_loss_estimate: number
  timestamp: number
}

export interface RerankerStats {
  model: string
  mode: 'fast' | 'deep' | 'cascade' | 'hybrid'
  queries_processed: number
  avg_latency_ms: number
  avg_score_delta: number
  escalation_rate: number
  last_used: number
}

export interface StreamingMode {
  mode: 'token' | 'sentence' | 'chunk' | 'sse'
  chunk_size: number
  buffer_ms: number
  backpressure_enabled: boolean
}

export interface VisionCapability {
  supported: boolean
  max_resolution: string
  max_images_per_request: number
  supported_formats: string[]
  ocr_available: boolean
  video_frame_extraction: boolean
}

export interface ACIDSession {
  session_id: string
  atomic: boolean
  consistent: boolean
  isolated: boolean
  durable: boolean
  operations: {
    id: string
    type: string
    status: 'pending' | 'committed' | 'rolled_back'
    timestamp: number
  }[]
  created_at: number
  completed_at?: number
}

export interface SSEEvent {
  id: string
  event: string
  data: unknown
  retry?: number
  timestamp: number
}

export interface SSEChannel {
  name: string
  status: 'active' | 'closed' | 'error'
  subscribers: number
  events_sent: number
  created_at: number
  last_event_at?: number
}

export const PROXY_PORT = 3001
export const TOTAL_VRAM = 12 // GB
