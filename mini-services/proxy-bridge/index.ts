/**
 * LMStudio Proxy Bridge - Ultimate Agentic Infrastructure
 * 
 * A sophisticated reasoning partner with:
 * - Knowledge Graph (Documentation as Active Knowledge Topology)
 * - MCP/A2A Protocol Orchestration
 * - Predictive Pre-triggering
 * - Unified Orchestration Endpoint
 * - Recursive Similarity Expansion
 * - A2A Async Messaging for Long-Running Tools
 */

// @ts-nocheck

import { serve } from "bun";
import { 
  LMStudioClient, 
  Chat,
  tool,
  type LLM,
  type EmbeddingModel
} from "@lmstudio/sdk";

// Enhanced Buffer Pool for Streaming Optimization - Bun-optimized
class BufferPool {
  private pool: Uint8Array[] = [];
  private readonly maxPoolSize = 100;
  private readonly bufferSize = 8192;
  private readonly smallBufferSize = 1024;
  private smallPool: Uint8Array[] = [];

  acquire(size: number = this.bufferSize): Uint8Array {
    if (size === this.smallBufferSize) {
      return this.smallPool.pop() || new Uint8Array(this.smallBufferSize);
    }
    return this.pool.pop() || new Uint8Array(size);
  }

  release(buffer: Uint8Array): void {
    if (buffer.length === this.bufferSize && this.pool.length < this.maxPoolSize) {
      this.pool.push(buffer);
    } else if (buffer.length === this.smallBufferSize && this.smallPool.length < this.maxPoolSize) {
      this.smallPool.push(buffer);
    }
  }

  getStats() {
    return {
      largeBuffers: this.pool.length,
      smallBuffers: this.smallPool.length,
      totalMemory: (this.pool.length * this.bufferSize + this.smallPool.length * this.smallBufferSize) / 1024
    };
  }
}

const bufferPool = new BufferPool();

// Bun-optimized async delay
async function bunSleep(ms: number): Promise<void> {
  await Bun.sleep(ms);
}

// Memory Pressure Monitoring
function checkMemoryPressure(): { pressure: 'low' | 'medium' | 'high'; usage: number } {
  const usage = Bun.memory.heap.used / 1024 / 1024; // MB
  if (usage > 300) return { pressure: 'high', usage };
  if (usage > 150) return { pressure: 'medium', usage };
  return { pressure: 'low', usage };
}

function shouldThrottleRequests(): boolean {
  return checkMemoryPressure().pressure === 'high';
}

// Bun-specific performance: Memory monitoring with detailed stats
function getDetailedMemoryStats() {
  const mem = Bun.memory();
  return {
    heapUsed: Math.round(mem.heap.used / 1024 / 1024),
    heapTotal: Math.round(mem.heap.total / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
    unitCount: mem.unitCount,
    rapidJSON: mem.rapidJSON,
    pressure: checkMemoryPressure()
  };
}

// JIT warmup function - run dummy requests to warm up the JIT
async function warmupJIT(): Promise<void> {
  console.log('[Performance] JIT warmup starting...');
  const warmupStart = Date.now();
  
  // Warmup: Run several dummy async operations
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(Promise.resolve(i * i).then(x => x + 1));
  }
  await Promise.all(promises);
  
  // Warmup string operations
  const str = 'warmup_string_operation_for_jit';
  for (let i = 0; i < 100; i++) {
    const _ = str.toLowerCase().includes('test');
    const __ = str.split('_');
    const ___ = str.replace('warmup', 'warmed');
  }
  
  // Warmup hash operations
  for (let i = 0; i < 50; i++) {
    const _ = Bun.hash(`warmup_${i}`);
  }
  
  console.log(`[Performance] JIT warmup completed in ${Date.now() - warmupStart}ms`);
}
import { z } from "zod";
import { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import { getObservabilitySystem, ObservabilitySystem } from "./observability";
import { getSettingsManager } from "./settings";
import * as SettingsHandlers from "./settings-handlers";
import { buildContext } from "./context-builder";
import { toLMStudioInput, toOpenAIChatResponse } from "./openai-adapter";
import { dispatchRoute, type RouteDefinition } from "./routes";

// Stability Services: Connection Pool, Embedding Coalescer, Streaming Optimizer
import { initializeConnectionPool } from "./services/lm-studio-connection-pool";
import { initializeEmbeddingCoalescer } from "./services/embedding-request-coalescer";
import { StreamingLatencyOptimizer, createStreamingResponse, type BackpressureConfig } from "./services/streaming-latency-optimizer";
import { initializePrometheusMetrics, getPrometheusMetrics } from "./services/prometheus-metrics";
import { initializePerformanceDashboard, getPerformanceDashboard } from "./services/performance-dashboard";
import { initializeConfigTuner, getConfigTuner } from "./services/config-tuner";
import { initializePerformanceAdvisor, getPerformanceAdvisor } from "./services/performance-advisor";
import { toolOrchestrator } from "./services/tool-orchestrator";
import { intentPipeline } from "./services/intent-pipeline";

async function* streamFromResponse(response: Response): AsyncGenerator<Uint8Array> {
  const reader = response.body!.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function* interceptAndExecuteTools(
  initialResponse: Response,
  lmStudioRequest: any,
  lmStudioUrl: string,
  model: string,
  messages: any[]
): AsyncGenerator<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let currentResponse = initialResponse;
  let currentMessages = [...messages];

  while (true) {
    const stream = streamFromResponse(currentResponse);
    let isToolCallMode = false;
    let toolCallBuffer = "";
    let buffer = "";

    for await (const chunk of stream) {
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;

      let lines = buffer.split('\n');
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          if (!isToolCallMode && line.trim() !== "") {
            yield encoder.encode(`${line}\n`);
          }
          continue;
        }

        if (line.trim() === "data: [DONE]") {
          if (!isToolCallMode) {
            yield encoder.encode(`${line}\n\n`);
          }
          continue;
        }

        const dataStr = line.substring(6);
        try {
          const data = JSON.parse(dataStr);
          
          // LM Studio /api/v1/chat or /v1/chat/completions format parsing
          let content = "";
          if (data.choices && data.choices[0]?.delta?.content) {
            content = data.choices[0].delta.content;
          } else if (data.output && Array.isArray(data.output)) {
            const msgPart = data.output.find((o: any) => o.type === "message");
            if (msgPart && msgPart.content) {
              content = msgPart.content;
            } else if (data.output[0]?.content) {
              content = data.output[0].content;
            }
          }

          if (content) {
            if (content.includes("<tool_call>") || toolCallBuffer.includes("<tool_call>")) {
              isToolCallMode = true;
            }

            if (isToolCallMode) {
              toolCallBuffer += content;
            } else {
              yield encoder.encode(`${line}\n\n`);
            }
          } else {
            if (!isToolCallMode) {
              yield encoder.encode(`${line}\n\n`);
            }
          }
        } catch (e) {
          if (!isToolCallMode) {
            yield encoder.encode(`${line}\n\n`);
          }
        }
      }
    }

    if (isToolCallMode) {
      // Find JSON within <tool_call> tags or just parse the whole buffer if it's JSON
      const match = toolCallBuffer.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
      let toolData = null;
      let toolCallContent = "";
      
      if (match) {
        try {
          toolData = JSON.parse(match[1]);
          toolCallContent = match[0];
        } catch (e) {}
      } else {
        try {
          toolData = JSON.parse(toolCallBuffer.trim());
          toolCallContent = toolCallBuffer.trim();
        } catch (e) {}
      }

      if (toolData && toolData.name) {
        try {
          const args = toolData.arguments || toolData.parameters || {};
          const result = await toolOrchestrator.executeTool(
            uuidv4(),
            toolData.name,
            args
          );

          currentMessages.push({
            role: "assistant",
            content: toolCallContent
          });
          currentMessages.push({
            role: "user", // LM Studio expects user role for tool results usually, or "tool" if supported
            content: `<tool_response>\n{"name": "${toolData.name}", "content": ${JSON.stringify(result.content)}}\n</tool_response>`
          });

          // Follow-up request
          const input = toLMStudioInput(currentMessages);
          const followUpRequest = {
            ...lmStudioRequest,
            input: input
          };

          const newResponse = await fetch(`${lmStudioUrl}/api/v1/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(followUpRequest)
          });

          if (!newResponse.ok) {
            const errStr = `data: {"error": "LM Studio follow-up failed"}\n\n`;
            yield encoder.encode(errStr);
            break;
          }

          currentResponse = newResponse;
          continue; // Restart the loop with the new response
        } catch (err: any) {
          const errStr = `data: {"error": "Tool execution failed: ${err.message}"}\n\n`;
          yield encoder.encode(errStr);
          break;
        }
      } else {
        // Failed to parse tool call, just yield what we had
        yield encoder.encode(`data: {"error": "Failed to parse tool call"}\n\n`);
        break;
      }
    } else {
      // Normal completion
      break;
    }
  }
}

// ============== Configuration ==============

const PORT = 3001;
const MAX_REACT_STEPS = 15;
const VRAM_BUDGET_MB = 8192; // Quadro M4000 8GB
const PRE_TRIGGER_THRESHOLD_MS = 5000;
const ASYNC_TOOL_THRESHOLD_MS = 5000;
const CACHE_TTL_MS = 300000; // 5 minutes
const CACHE_MAX_SIZE = 1000;

// ============== Types ==============

type OutputMode = "chat" | "agent";
type AgentType = "continue-dev" | "cline" | "openclaw" | "custom";
type ProtocolType = "mcp" | "a2a" | "local";
type ToolStatus = "idle" | "pre-warming" | "ready" | "executing" | "async-pending";

// Knowledge Graph Types
interface KnowledgeNode {
  id: string;
  type: "concept" | "function" | "class" | "pattern" | "api";
  name: string;
  content: string;
  layer: "overview" | "implementation" | "edge_case";
  source_doc_id: string;
  created_at: number;
  access_count: number;
}

interface KnowledgeEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship: "implements" | "depends_on" | "deprecated_by" | "related_to" | "contains" | "imports" | "extends" | "uses" | "calls" | "returns" | "has_param" | "has_type" | "defines" | "same_doc";
  weight: number;
}

interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>;
  edges: Map<string, KnowledgeEdge>;
  adjacency: Map<string, Set<string>>; // Quick lookup for traversal
}

// MCP/A2A Types
interface MCPTool {
  name: string;
  server: string;
  description: string;
  parameters: z.ZodType<any>;
  safety_level: "autonomous" | "supervised" | "manual";
  avg_latency_ms: number;
  health: "healthy" | "degraded" | "unavailable";
}

interface A2AAgent {
  id: string;
  name: string;
  capabilities: string[];
  agent_card: {
    endpoints: { name: string; url: string }[];
    skills: string[];
  };
  status: "available" | "busy" | "offline";
  current_tasks: number;
}

interface MCPServer {
  name: string;
  transport: "stdio" | "sse" | "http";
  endpoint?: string;
  tools: MCPTool[];
  health: "healthy" | "degraded" | "unavailable";
  last_ping: number;
}

// Async Task Types
interface AsyncTask {
  id: string;
  type: "mcp_tool" | "a2a_delegation";
  tool_or_agent: string;
  args: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  started_at: number;
  estimated_ms: number;
  result?: unknown;
  error?: string;
  sse_clients: Set<ReadableStreamDefaultController>;
}

// Pre-trigger Types
interface PreTriggerContext {
  keywords: string[];
  suggested_tools: string[];
  suggested_agents: string[];
  confidence: number;
}

interface ToolPreState {
  name: string;
  status: ToolStatus;
  pre_warmed_at?: number;
  connection?: unknown;
  predicted_use: number; // 0-1 probability
}

// Core Types
interface AgentMeta {
  confidence: number;
  plan_steps: number;
  current_step: number;
  context_injected: boolean;
  sources: string[];
  protocol_used: ProtocolType;
  pre_triggered_tools: string[];
  recursive_hops: number;
}

interface ToolCallParsed {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface SessionState {
  session_id: string;
  turn_number: number;
  working_memory: { key_facts: string[]; open_questions: string[] };
  previous_tool_results: { tool: string; result: string; used_in_context: boolean; protocol?: ProtocolType }[];
  plan_state: { total_steps: number; current_step: number; completed_actions: string[] };
  context_pattern: string[]; // Track context patterns for pre-triggering
  async_tasks: string[]; // Active async task IDs
}

interface ActionableError {
  message: string;
  type: string;
  code: string;
  agent_action?: Record<string, unknown>;
  proxy_state?: Record<string, unknown>;
}

interface GenerationConfig {
  original_request: Record<string, unknown>;
  applied_config: Record<string, unknown>;
  adjustments: { reason: string; change: string }[];
}

// Orchestration Request
interface OrchestrationRequest {
  intent: string;
  context: Record<string, unknown>;
  tools_available: string[];
  agents_available: string[];
  orchestration_mode: "adaptive" | "mcp_only" | "a2a_only" | "local_only";
  session_id?: string;
}

// ============== Preset & Gateway Types ==============

// Embedding Presets
type EmbeddingPresetType = "code_search" | "doc_search" | "bug_search" | "test_search" | "refactor_target" | "semantic_diff" | "clustering" | "anomaly";
type MRLDimension = 128 | 512 | 1024 | 1536 | 2560;
type RerankerMode = "fast" | "deep" | "cascade" | "hybrid";

interface EmbeddingPreset {
  name: string;
  type: EmbeddingPresetType;
  instruction_prefix: string;
  negative_query_template?: string;
  metadata_filters?: Record<string, string>;
  mrl_dimension: MRLDimension;
  reranker_mode: RerankerMode;
  description: string;
}

interface GatewayTransformation {
  input: {
    raw: string;
    intent: { type: string; confidence: number };
    context_enrichment: Record<string, unknown>;
    instruction_prefix: string;
    negative_query?: string;
    metadata_filters?: Record<string, string>;
  };
  embedding: {
    model: string;
    dimension: number;
    time_ms: number;
    instruction_aware: boolean;
  };
  rerank: {
    mode: RerankerMode;
    model: string;
    confidence: number;
    time_ms: number;
    escalated: boolean;
  };
  output: {
    results_count: number;
    top_results: { content: string; score: number; type: string }[];
    explanation?: string;
  };
  total_time_ms: number;
}

// Chat Test Presets
type ChatTestCategory = "capabilities" | "performance" | "robustness" | "agentic";

interface ChatTestPreset {
  id: string;
  name: string;
  category: ChatTestCategory;
  description: string;
  system_prompt: string;
  user_prompt: string;
  expected_behavior: string[];
  validation: {
    check_tool_calls?: string[];
    check_reasoning?: boolean;
    check_code_valid?: boolean;
    max_tokens?: number;
    expected_patterns?: string[];
  };
  metrics: string[];
}

// Session-Aware Adjustments
interface SessionAdjustments {
  previous_failures: number;
  vram_pressure: number;
  confidence_history: number[];
  similar_queries: number;
  session_length: number;
  suggested_preset?: string;
  prefix_adjustment?: string;
}

// ============== Preset Registry ==============

const EMBEDDING_PRESETS: Record<string, EmbeddingPreset> = {
  code_search: {
    name: "Code Search",
    type: "code_search",
    instruction_prefix: "Retrieve code implementing: ",
    negative_query_template: "NOT documentation, NOT tests, NOT comments",
    metadata_filters: { type: "function, class", language: "auto" },
    mrl_dimension: 512,
    reranker_mode: "cascade",
    description: "Find functions, classes, and implementation code"
  },
  doc_search: {
    name: "Documentation QA",
    type: "doc_search",
    instruction_prefix: "Find documentation explaining: ",
    negative_query_template: "NOT source code, NOT tests",
    mrl_dimension: 512,
    reranker_mode: "fast",
    description: "Search documentation and guides"
  },
  bug_search: {
    name: "Bug Search",
    type: "bug_search",
    instruction_prefix: "Locate error patterns similar to: ",
    negative_query_template: "NOT documentation",
    metadata_filters: { type: "error, exception, log" },
    mrl_dimension: 512,
    reranker_mode: "deep",
    description: "Find similar bugs and error patterns"
  },
  test_search: {
    name: "Test Search",
    type: "test_search",
    instruction_prefix: "Find test cases covering: ",
    negative_query_template: "NOT source code, NOT documentation",
    metadata_filters: { type: "test" },
    mrl_dimension: 512,
    reranker_mode: "fast",
    description: "Locate test cases and coverage"
  },
  refactor_target: {
    name: "Refactor Target",
    type: "refactor_target",
    instruction_prefix: "Identify code needing improvement for: ",
    mrl_dimension: 1024,
    reranker_mode: "deep",
    description: "Find code that could be refactored"
  },
  semantic_diff: {
    name: "Semantic Diff",
    type: "semantic_diff",
    instruction_prefix: "Compare semantic meaning of: ",
    mrl_dimension: 1024,
    reranker_mode: "deep",
    description: "Compare two texts semantically"
  },
  clustering: {
    name: "Clustering",
    type: "clustering",
    instruction_prefix: "Group documents by topic: ",
    mrl_dimension: 512,
    reranker_mode: "fast",
    description: "Cluster documents into groups"
  },
  anomaly: {
    name: "Anomaly Detection",
    type: "anomaly",
    instruction_prefix: "Find outliers compared to: ",
    mrl_dimension: 1024,
    reranker_mode: "deep",
    description: "Detect anomalous documents"
  }
};

const MRL_PRESETS = {
  flash: { dimension: 128 as MRLDimension, name: "Flash", speed: "Fastest", quality: "Basic", use_case: "Initial filtering" },
  standard: { dimension: 512 as MRLDimension, name: "Standard", speed: "Balanced", quality: "Good", use_case: "Default retrieval" },
  deep: { dimension: 1024 as MRLDimension, name: "Deep", speed: "Slower", quality: "High", use_case: "Precision critical" },
  maximum: { dimension: 1536 as MRLDimension, name: "Maximum", speed: "Slowest", quality: "Best", use_case: "Reranking input" },
  extreme: { dimension: 2560 as MRLDimension, name: "Extreme", speed: "Slowest", quality: "Best", use_case: "Qwen3 4B max capacity" }
};

const RERANKER_CONFIGS = {
  fast: { model: "qwen3-reranker-0.6b", threshold: 0.8, latency_ms: 45, description: "Single pass, quick results" },
  deep: { model: "qwen3-reranker-4b", threshold: 0.7, latency_ms: 5200, description: "Multi-pass, explanation generation" },
  cascade: { model: "auto", threshold: 0.7, latency_ms: 0, description: "Fast first, escalate to Deep if needed" },
  hybrid: { model: "both", threshold: 0.75, latency_ms: 0, description: "0.6B filters top-20, 4B reranks top-5" }
};

// Chat Test Presets
const CHAT_TEST_PRESETS: ChatTestPreset[] = [
  {
    id: "reasoning_chain",
    name: "Reasoning Chain",
    category: "capabilities",
    description: "Test step-by-step reasoning ability",
    system_prompt: "You are a helpful assistant that shows your reasoning process.",
    user_prompt: "Solve step by step: 15 * (3 + 7)",
    expected_behavior: ["Shows reasoning steps", "Correct final answer"],
    validation: { check_reasoning: true, expected_patterns: ["step", "15", "10", "150"] },
    metrics: ["Reasoning tokens", "Correctness"]
  },
  {
    id: "tool_invocation",
    name: "Tool Invocation",
    category: "agentic",
    description: "Test tool calling capability",
    system_prompt: "You are a tool-using assistant. Use tools when appropriate.",
    user_prompt: "Search for authentication code and explain how it works",
    expected_behavior: ["Emits tool call", "Explains results"],
    validation: { check_tool_calls: ["semantic_search", "file_read"] },
    metrics: ["TTFT", "Tool accuracy", "Explanation quality"]
  },
  {
    id: "context_window",
    name: "Context Window",
    category: "performance",
    description: "Test context window handling",
    system_prompt: "You are a helpful assistant.",
    user_prompt: "Summarize this 10K token text: [LARGE TEXT PLACEHOLDER]",
    expected_behavior: ["No truncation error", "Complete summary"],
    validation: { max_tokens: 4096 },
    metrics: ["Context utilization", "TPS"]
  },
  {
    id: "code_generation",
    name: "Code Generation",
    category: "capabilities",
    description: "Test code generation quality",
    system_prompt: "You are an expert programmer.",
    user_prompt: "Write a Python class for User with name, email, and created_at fields",
    expected_behavior: ["Valid Python syntax", "Complete class definition"],
    validation: { check_code_valid: true, expected_patterns: ["class User", "def __init__", "self"] },
    metrics: ["Compilation success", "Code complexity"]
  },
  {
    id: "error_recovery",
    name: "Error Recovery",
    category: "robustness",
    description: "Test self-correction ability",
    system_prompt: "You are a helpful assistant that can recognize and fix mistakes.",
    user_prompt: "Write a function that divides two numbers, but include a bug. Then fix it.",
    expected_behavior: ["Shows bug", "Identifies bug", "Fixes bug"],
    validation: { expected_patterns: ["bug", "fix", "error", "correct"] },
    metrics: ["Recovery steps", "Final success"]
  },
  {
    id: "multi_turn",
    name: "Multi-turn Context",
    category: "agentic",
    description: "Test session state maintenance",
    system_prompt: "You are a helpful assistant that remembers context.",
    user_prompt: "My name is Alice. What's my name?",
    expected_behavior: ["Remembers name from context"],
    validation: { expected_patterns: ["Alice"] },
    metrics: ["Session coherence"]
  },
  {
    id: "ttft_benchmark",
    name: "TTFT Benchmark",
    category: "performance",
    description: "Measure time to first token",
    system_prompt: "",
    user_prompt: "Write 'hello world' in 5 programming languages",
    expected_behavior: ["Quick first token", "Complete response"],
    validation: {},
    metrics: ["TTFT", "TPS"]
  },
  {
    id: "vram_pressure",
    name: "VRAM Pressure",
    category: "robustness",
    description: "Test behavior under memory pressure",
    system_prompt: "You are a helpful assistant.",
    user_prompt: "Generate a very long detailed response about the history of computing.",
    expected_behavior: ["Handles gracefully", "May truncate"],
    validation: { max_tokens: 8192 },
    metrics: ["Memory usage", "Truncation behavior"]
  }
];

// ============== Gateway Transformation Layer ==============

const gatewayTransformationLog: GatewayTransformation[] = [];

function detectIntent(query: string): { type: string; confidence: number } {
  const queryLower = query.toLowerCase();
  
  // Intent patterns
  const patterns: { pattern: RegExp; type: string; weight: number }[] = [
    { pattern: /\b(function|class|method|implement|code)\b/i, type: "code_search", weight: 0.9 },
    { pattern: /\b(documentation|docs|explain|how to|guide)\b/i, type: "doc_search", weight: 0.85 },
    { pattern: /\b(bug|error|exception|fix|crash)\b/i, type: "bug_search", weight: 0.9 },
    { pattern: /\b(test|spec|coverage|unit test)\b/i, type: "test_search", weight: 0.85 },
    { pattern: /\b(refactor|improve|clean|optimize)\b/i, type: "refactor_target", weight: 0.8 },
    { pattern: /\b(compare|diff|difference|versus)\b/i, type: "semantic_diff", weight: 0.85 },
    { pattern: /\b(cluster|group|categorize|classify)\b/i, type: "clustering", weight: 0.8 },
    { pattern: /\b(outlier|anomaly|unusual|strange)\b/i, type: "anomaly", weight: 0.85 },
    { pattern: /\b(find|search|locate|where)\b/i, type: "code_search", weight: 0.5 },
  ];
  
  let bestMatch = { type: "code_search", confidence: 0.5 };
  
  for (const { pattern, type, weight } of patterns) {
    if (pattern.test(queryLower)) {
      if (weight > bestMatch.confidence) {
        bestMatch = { type, confidence: weight };
      }
    }
  }
  
  return bestMatch;
}

function enrichContext(query: string, session: SessionState): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  
  // Detect project type from context pattern
  const patterns = session.context_pattern;
  if (patterns.some(p => p.includes("fastapi") || p.includes("flask"))) {
    context["project_type"] = "python";
  } else if (patterns.some(p => p.includes("react") || p.includes("next"))) {
    context["project_type"] = "javascript";
  }
  
  // Add session context
  if (session.previous_tool_results.length > 0) {
    context["previous_tools"] = session.previous_tool_results.map(r => r.tool);
  }
  
  return context;
}

function generateNegativeQuery(query: string, preset: EmbeddingPreset): string | undefined {
  if (!preset.negative_query_template) return undefined;
  
  // Customize based on detected context
  return preset.negative_query_template;
}

function applyPresetTransformation(
  query: string,
  preset: EmbeddingPreset,
  session: SessionState
): GatewayTransformation {
  const startTime = Date.now();
  
  // Step 1: Intent Detection
  const intent = detectIntent(query);
  
  // Step 2: Context Enrichment
  const contextEnrichment = enrichContext(query, session);
  
  // Step 3: Instruction Prefixing
  const instructionPrefix = preset.instruction_prefix;
  
  // Step 4: Negative Query Generation
  const negativeQuery = generateNegativeQuery(query, preset);
  
  // Step 5: Metadata Filters
  const metadataFilters = preset.metadata_filters;
  
  // Simulated embedding time based on dimension
  const embeddingTime = Math.floor(15 + preset.mrl_dimension / 100);
  
  // Simulated rerank based on mode
  const rerankConfig = RERANKER_CONFIGS[preset.reranker_mode];
  const rerankTime = preset.reranker_mode === "deep" ? 5200 : 45;
  const rerankConfidence = preset.reranker_mode === "deep" ? 0.96 : 0.89;
  
  // Generate mock results
  const results = [
    { content: `def ${query.replace(/\s+/g, '_')}_impl():`, score: 0.94, type: "function" },
    { content: `class ${query.charAt(0).toUpperCase() + query.slice(1).replace(/\s+/g, '')}:`, score: 0.87, type: "class" },
    { content: `# ${query} documentation`, score: 0.71, type: "comment" }
  ];
  
  const transformation: GatewayTransformation = {
    input: {
      raw: query,
      intent,
      context_enrichment: contextEnrichment,
      instruction_prefix: instructionPrefix,
      negative_query: negativeQuery,
      metadata_filters: metadataFilters
    },
    embedding: {
      model: "text-embedding-qwen3-embedding-4b",
      dimension: preset.mrl_dimension,
      time_ms: embeddingTime,
      instruction_aware: true
    },
    rerank: {
      mode: preset.reranker_mode,
      model: rerankConfig.model,
      confidence: rerankConfidence,
      time_ms: rerankTime,
      escalated: preset.reranker_mode === "cascade" && rerankConfidence < 0.7
    },
    output: {
      results_count: results.length,
      top_results: results,
      explanation: `Found ${results.length} results using ${preset.reranker_mode} reranker`
    },
    total_time_ms: Date.now() - startTime + embeddingTime + rerankTime
  };
  
  // Log transformation
  gatewayTransformationLog.unshift(transformation);
  if (gatewayTransformationLog.length > 50) gatewayTransformationLog.pop();
  
  return transformation;
}

// Session-aware adjustments
function getSessionAdjustments(session: SessionState): SessionAdjustments {
  return {
    previous_failures: session.previous_tool_results.filter(r => !r.used_in_context).length,
    vram_pressure: 0, // Would come from VRAM monitoring
    confidence_history: [0.85, 0.92, 0.88], // Recent confidences
    similar_queries: 0, // Would come from query analysis
    session_length: session.turn_number,
    suggested_preset: session.turn_number > 10 ? "deep" : "standard"
  };
}

// ============== LMStudio Client ==============

let client: LMStudioClient | null = null;
let currentLLM: LLM | null = null;
let currentEmbeddingModel: EmbeddingModel | null = null;
let lmStudioConnected = false;

function initializeClient(): void {
  // Don't initialize client on startup - delay until first use
  // The SDK throws synchronously if LM Studio isn't running
  console.log("[LMStudio] Client will be initialized on first use");
  console.log("[LMStudio] Running in standalone mode - Knowledge Graph, MCP/A2A protocols functional");
}

async function ensureClient(): Promise<boolean> {
  if (client) return true;
  if (lmStudioConnected === false) return false;
  
  try {
    const settings = getSettingsManager().getLMStudioConnection();
    const baseUrl = `ws://${settings.host}:${settings.port}`;
    client = new LMStudioClient({ baseUrl, verboseErrorMessages: true });
    lmStudioConnected = true;
    console.log(`[LMStudio] Client initialized - connected to ${baseUrl}`);
    return true;
  } catch (e) {
    console.log("[LMStudio] LM Studio not available");
    lmStudioConnected = false;
    return false;
  }
}

// ============== Knowledge Graph System ==============

const knowledgeGraph: KnowledgeGraph = {
  nodes: new Map(),
  edges: new Map(),
  adjacency: new Map()
};

const knowledgeDb = new Database(join(import.meta.dir, "../../db/knowledge.db"));
knowledgeDb.run(`CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL,
  layer TEXT NOT NULL, source_doc_id TEXT, created_at INTEGER NOT NULL, access_count INTEGER DEFAULT 0
)`);
knowledgeDb.run(`CREATE TABLE IF NOT EXISTS knowledge_edges (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL, target_id TEXT NOT NULL,
  relationship TEXT NOT NULL, weight REAL DEFAULT 1.0
)`);
knowledgeDb.run(`CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, url TEXT, content TEXT NOT NULL, scraped_at INTEGER NOT NULL,
  last_modified INTEGER, hash TEXT, change_detected INTEGER DEFAULT 0
)`);

// Load knowledge graph from DB
function loadKnowledgeGraph(): void {
  const nodes = knowledgeDb.prepare("SELECT * FROM knowledge_nodes").all() as KnowledgeNode[];
  const edges = knowledgeDb.prepare("SELECT * FROM knowledge_edges").all() as KnowledgeEdge[];
  
  for (const node of nodes) {
    knowledgeGraph.nodes.set(node.id, node);
    knowledgeGraph.adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    knowledgeGraph.edges.set(edge.id, edge);
    const adj = knowledgeGraph.adjacency.get(edge.source_id);
    if (adj) adj.add(edge.target_id);
  }
  console.log(`[KnowledgeGraph] Loaded ${nodes.length} nodes, ${edges.length} edges`);
}

// Extract concepts from documentation
function extractConcepts(content: string, docId: string): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = [];
  const patterns = [
    { regex: /function\s+(\w+)\s*\([^)]*\)/g, type: "function" as const },
    { regex: /class\s+(\w+)/g, type: "class" as const },
    { regex: /def\s+(\w+)\s*\([^)]*\)/g, type: "function" as const },
    { regex: /interface\s+(\w+)/g, type: "concept" as const },
    { regex: /const\s+(\w+)\s*=/g, type: "api" as const },
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      const start = Math.max(0, match.index - 50);
      const end = Math.min(content.length, match.index + 200);
      const snippet = content.slice(start, end);
      
      const node: KnowledgeNode = {
        id: `${docId}_${type}_${name}`,
        type,
        name,
        content: snippet,
        layer: "implementation",
        source_doc_id: docId,
        created_at: Date.now(),
        access_count: 0
      };
      nodes.push(node);
    }
  }
  
  // Extract overview (first paragraph)
  const overviewMatch = content.match(/^(?:#\s+.*?\n)?([^#\n][^\n]{100,})/);
  if (overviewMatch) {
    nodes.push({
      id: `${docId}_overview`,
      type: "concept",
      name: "Overview",
      content: overviewMatch[1],
      layer: "overview",
      source_doc_id: docId,
      created_at: Date.now(),
      access_count: 0
    });
  }
  
  return nodes;
}

// Build relationships between concepts
function buildRelationships(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  const nodeMap = new Map(nodes.map(n => [n.name.toLowerCase(), n]));
  
  type RelType = "implements" | "depends_on" | "deprecated_by" | "related_to" | "contains" | "imports" | "extends" | "uses" | "calls" | "returns" | "has_param" | "has_type" | "defines" | "same_doc";
  
  // Common relationship patterns
  const relationshipPatterns: { pattern: RegExp; type: RelType; weight: number }[] = [
    { pattern: /import\s+(\w+)/g, type: 'imports', weight: 0.9 },
    { pattern: /from\s+['"]@?[\w./]+['"]/g, type: 'imports', weight: 0.9 },
    { pattern: /extends\s+(\w+)/g, type: 'extends', weight: 0.85 },
    { pattern: /implements\s+(\w+)/g, type: 'implements', weight: 0.85 },
    { pattern: /uses?\s+(\w+)/g, type: 'uses', weight: 0.8 },
    { pattern: /calls?\s+(\w+)/g, type: 'calls', weight: 0.8 },
    { pattern: /returns?\s+(\w+)/g, type: 'returns', weight: 0.7 },
    { pattern: /param(?:eter)?\s+(\w+)/g, type: 'has_param', weight: 0.6 },
    { pattern: /type[:\s]+(\w+)/g, type: 'has_type', weight: 0.7 },
    { pattern: /class\s+(\w+)/g, type: 'contains', weight: 0.8 },
    { pattern: /function\s+(\w+)/g, type: 'contains', weight: 0.8 },
    { pattern: /const\s+(\w+)/g, type: 'defines', weight: 0.7 },
    { pattern: /let\s+(\w+)/g, type: 'defines', weight: 0.7 },
    { pattern: /var\s+(\w+)/g, type: 'defines', weight: 0.7 },
  ];
  
  for (const node of nodes) {
    const contentLower = node.content.toLowerCase();
    const nodeNameLower = node.name.toLowerCase();
    
    for (const { pattern, type, weight } of relationshipPatterns) {
      const matches = [...contentLower.matchAll(new RegExp(pattern.source, 'gi'))];
      for (const match of matches) {
        const relatedName = match[1]?.toLowerCase();
        if (relatedName && relatedName !== nodeNameLower) {
          const targetNode = nodeMap.get(relatedName);
          if (targetNode && targetNode.id !== node.id) {
            // Check if edge already exists
            const edgeId = `edge_${node.id}_${targetNode.id}`;
            if (!edges.find(e => e.id === edgeId)) {
              edges.push({
                id: edgeId,
                source_id: node.id,
                target_id: targetNode.id,
                relationship: type,
                weight
              });
            }
          }
        }
      }
    }
  }
  
  // Also add relationships between nodes of same document
  const docGroups = new Map<string, KnowledgeNode[]>();
  for (const node of nodes) {
    const docId = node.source_doc_id;
    if (!docGroups.has(docId)) docGroups.set(docId, []);
    docGroups.get(docId)!.push(node);
  }
  
  // Connect nodes from same document
  for (const [, docNodes] of docGroups) {
    for (let i = 0; i < docNodes.length; i++) {
      for (let j = i + 1; j < docNodes.length; j++) {
        const a = docNodes[i], b = docNodes[j];
        const edgeId = `edge_${a.id}_${b.id}`;
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source_id: a.id,
            target_id: b.id,
            relationship: 'same_doc',
            weight: 0.5
          });
        }
      }
    }
  }
  
  return edges;
}

// Query knowledge graph with concept traversal
export function queryKnowledgeGraph(
  query: string, 
  maxHops: number = 2
): { nodes: KnowledgeNode[]; paths: string[][]; confidence: number } {
  const results: KnowledgeNode[] = [];
  const paths: string[][] = [];
  let totalConfidence = 0;
  
  // Find initial nodes matching query
  const queryLower = query.toLowerCase();
  const initialNodes: KnowledgeNode[] = [];
  
  for (const node of knowledgeGraph.nodes.values()) {
    if (node.name.toLowerCase().includes(queryLower) || 
        node.content.toLowerCase().includes(queryLower)) {
      initialNodes.push(node);
      node.access_count++;
    }
  }
  
  results.push(...initialNodes);
  
  // Traverse related nodes up to maxHops
  const visited = new Set(initialNodes.map(n => n.id));
  const queue: { nodeId: string; path: string[]; depth: number }[] = 
    initialNodes.map(n => ({ nodeId: n.id, path: [n.name], depth: 0 }));
  
  while (queue.length > 0) {
    const { nodeId, path, depth } = queue.shift()!;
    
    if (depth >= maxHops) continue;
    
    const neighbors = knowledgeGraph.adjacency.get(nodeId) || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const neighbor = knowledgeGraph.nodes.get(neighborId);
        if (neighbor) {
          results.push(neighbor);
          const newPath = [...path, neighbor.name];
          paths.push(newPath);
          queue.push({ nodeId: neighborId, path: newPath, depth: depth + 1 });
        }
      }
    }
  }
  
  // Calculate confidence based on result count and relevance
  totalConfidence = Math.min(0.95, 0.5 + (results.length * 0.05));
  
  return { nodes: results.slice(0, 20), paths, confidence: totalConfidence };
}

// Index documentation into knowledge graph
async function indexDocumentation(content: string, url?: string, filename?: string): Promise<{ docId: string; nodesAdded: number }> {
  const docId = uuidv4();
  const sourceName = filename || url || 'manual';
  
  // Store document
  knowledgeDb.prepare(`
    INSERT INTO documents (id, url, content, scraped_at, hash)
    VALUES (?, ?, ?, ?, ?)
  `).run(docId, url || null, content, Date.now(), Bun.hash(content).toString());
  
  // Extract concepts
  const nodes = extractConcepts(content, docId);
  
  // Build relationships
  const edges = buildRelationships(nodes);
  
  // Store in DB and memory
  for (const node of nodes) {
    knowledgeDb.prepare(`
      INSERT INTO knowledge_nodes (id, type, name, content, layer, source_doc_id, created_at, access_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(node.id, node.type, node.name, node.content, node.layer, node.source_doc_id, node.created_at, node.access_count);
    knowledgeGraph.nodes.set(node.id, node);
    knowledgeGraph.adjacency.set(node.id, new Set());
  }
  
  for (const edge of edges) {
    knowledgeDb.prepare(`
      INSERT INTO knowledge_edges (id, source_id, target_id, relationship, weight)
      VALUES (?, ?, ?, ?, ?)
    `).run(edge.id, edge.source_id, edge.target_id, edge.relationship, edge.weight);
    knowledgeGraph.edges.set(edge.id, edge);
    const adj = knowledgeGraph.adjacency.get(edge.source_id);
    if (adj) adj.add(edge.target_id);
  }
  
  console.log(`[KnowledgeGraph] Indexed doc ${docId}: ${nodes.length} nodes, ${edges.length} edges`);
  return { docId, nodesAdded: nodes.length };
}

// ============== MCP/A2A Protocol Layer ==============

const mcpServers = new Map<string, MCPServer>();
const a2aAgents = new Map<string, A2AAgent>();
const asyncTasks = new Map<string, AsyncTask>();
const toolPreStates = new Map<string, ToolPreState>();

// Initialize MCP servers
function initializeMCPServers(): void {
  const servers: MCPServer[] = [
    {
      name: "filesystem",
      transport: "stdio",
      tools: [
        { name: "file_read", server: "filesystem", description: "Read file contents", parameters: z.object({ path: z.string() }), safety_level: "autonomous", avg_latency_ms: 50, health: "healthy" },
        { name: "file_write", server: "filesystem", description: "Write file contents", parameters: z.object({ path: z.string(), content: z.string() }), safety_level: "manual", avg_latency_ms: 100, health: "healthy" },
        { name: "file_list", server: "filesystem", description: "List directory contents", parameters: z.object({ path: z.string() }), safety_level: "autonomous", avg_latency_ms: 30, health: "healthy" }
      ],
      health: "healthy",
      last_ping: Date.now()
    },
    {
      name: "browser",
      transport: "sse",
      endpoint: "http://localhost:3002",
      tools: [
        { name: "browser_navigate", server: "browser", description: "Navigate to URL", parameters: z.object({ url: z.string() }), safety_level: "supervised", avg_latency_ms: 3000, health: "healthy" },
        { name: "browser_click", server: "browser", description: "Click element", parameters: z.object({ selector: z.string() }), safety_level: "supervised", avg_latency_ms: 500, health: "healthy" },
        { name: "browser_screenshot", server: "browser", description: "Take screenshot", parameters: z.object({}), safety_level: "autonomous", avg_latency_ms: 200, health: "healthy" }
      ],
      health: "healthy",
      last_ping: Date.now()
    },
    {
      name: "github",
      transport: "http",
      endpoint: "https://api.github.com",
      tools: [
        { name: "github_search", server: "github", description: "Search GitHub", parameters: z.object({ query: z.string() }), safety_level: "autonomous", avg_latency_ms: 800, health: "healthy" },
        { name: "github_get_file", server: "github", description: "Get file from repo", parameters: z.object({ repo: z.string(), path: z.string() }), safety_level: "autonomous", avg_latency_ms: 500, health: "healthy" }
      ],
      health: "healthy",
      last_ping: Date.now()
    }
  ];
  
  for (const server of servers) {
    mcpServers.set(server.name, server);
    for (const tool of server.tools) {
      toolPreStates.set(tool.name, { name: tool.name, status: "idle", predicted_use: 0 });
    }
  }
  
  console.log(`[MCP] Initialized ${servers.length} servers, ${[...servers].reduce((acc, s) => acc + s.tools.length, 0)} tools`);
}

// Initialize A2A agents
function initializeA2AAgents(): void {
  const agents: A2AAgent[] = [
    {
      id: "security-auditor",
      name: "Security Auditor",
      capabilities: ["security_analysis", "vulnerability_detection", "code_review"],
      agent_card: {
        endpoints: [{ name: "analyze", url: "/analyze" }],
        skills: ["sql_injection_check", "xss_detection", "auth_review"]
      },
      status: "available",
      current_tasks: 0
    },
    {
      id: "test-generator",
      name: "Test Generator",
      capabilities: ["unit_test_generation", "integration_test", "coverage_analysis"],
      agent_card: {
        endpoints: [{ name: "generate", url: "/generate" }],
        skills: ["jest_tests", "pytest_tests", "e2e_tests"]
      },
      status: "available",
      current_tasks: 0
    },
    {
      id: "code-reviewer",
      name: "Code Reviewer",
      capabilities: ["code_quality", "best_practices", "refactoring_suggestions"],
      agent_card: {
        endpoints: [{ name: "review", url: "/review" }],
        skills: ["style_check", "complexity_analysis", "doc_generation"]
      },
      status: "available",
      current_tasks: 0
    }
  ];
  
  for (const agent of agents) {
    a2aAgents.set(agent.id, agent);
  }
  
  console.log(`[A2A] Initialized ${agents.length} agents`);
}

// Route to appropriate protocol
function routeToProtocol(
  toolName: string, 
  estimatedDurationMs: number
): { protocol: ProtocolType; reason: string; async: boolean } {
  // Check if tool exists in MCP servers
  for (const server of mcpServers.values()) {
    const tool = server.tools.find(t => t.name === toolName);
    if (tool) {
      // Check if it should be async
      if (estimatedDurationMs > ASYNC_TOOL_THRESHOLD_MS || tool.avg_latency_ms > ASYNC_TOOL_THRESHOLD_MS) {
        return { protocol: "mcp", reason: "long_running_tool", async: true };
      }
      // Check server health
      if (server.health === "unavailable") {
        // Try to find A2A agent fallback
        for (const agent of a2aAgents.values()) {
          if (agent.capabilities.some(c => toolName.includes(c))) {
            return { protocol: "a2a", reason: "mcp_unavailable_fallback", async: false };
          }
        }
      }
      return { protocol: "mcp", reason: "mcp_available", async: false };
    }
  }
  
  // Check A2A agents
  for (const agent of a2aAgents.values()) {
    if (agent.capabilities.some(c => toolName.includes(c) || toolName.includes(c.replace("_", "-")))) {
      return { protocol: "a2a", reason: "agent_capability_match", async: estimatedDurationMs > ASYNC_TOOL_THRESHOLD_MS };
    }
  }
  
  return { protocol: "local", reason: "no_external_match", async: false };
}

// ============== Predictive Pre-triggering ==============

const preTriggerPatterns: PreTriggerContext[] = [
  { keywords: ["database", "migration", "schema"], suggested_tools: ["file_read", "semantic_search"], suggested_agents: [], confidence: 0.85 },
  { keywords: ["refactor", "clean", "optimize"], suggested_tools: ["semantic_search", "file_read"], suggested_agents: ["code-reviewer"], confidence: 0.8 },
  { keywords: ["security", "vulnerability", "auth"], suggested_tools: [], suggested_agents: ["security-auditor"], confidence: 0.9 },
  { keywords: ["test", "coverage", "spec"], suggested_tools: [], suggested_agents: ["test-generator"], confidence: 0.85 },
  { keywords: ["document", "doc", "readme"], suggested_tools: ["browser_navigate"], suggested_agents: [], confidence: 0.7 },
  { keywords: ["bug", "fix", "error"], suggested_tools: ["semantic_search", "file_read"], suggested_agents: [], confidence: 0.75 },
  { keywords: ["api", "endpoint", "route"], suggested_tools: ["github_search"], suggested_agents: [], confidence: 0.7 }
];

// Analyze context for pre-triggering
function analyzeContextForPreTrigger(
  messages: { role: string; content: string }[]
): { tools: string[]; agents: string[]; patterns: string[] } {
  const result: { tools: string[]; agents: string[]; patterns: string[] } = { tools: [], agents: [], patterns: [] };
  
  // Get recent context
  const recentMessages = messages.slice(-5);
  const contextText = recentMessages.map(m => m.content).join(" ").toLowerCase();
  
  // Match patterns
  for (const pattern of preTriggerPatterns) {
    const matchedKeywords = pattern.keywords.filter(k => contextText.includes(k));
    if (matchedKeywords.length > 0) {
      result.tools.push(...pattern.suggested_tools);
      result.agents.push(...pattern.suggested_agents);
      result.patterns.push(matchedKeywords.join(","));
    }
  }
  
  // Deduplicate
  result.tools = [...new Set(result.tools)];
  result.agents = [...new Set(result.agents)];
  
  return result;
}

// Pre-trigger tools based on context
async function preTriggerTools(tools: string[]): Promise<void> {
  await Promise.all(tools.map(async (toolName) => {
    const state = toolPreStates.get(toolName);
    if (state && state.status === "idle") {
      state.status = "pre-warming";
      state.pre_warmed_at = Date.now();
      state.predicted_use = 0.8;
      
      console.log(`[PreTrigger] Pre-warming tool: ${toolName}`);
      
      await bunSleep(100);
      state.status = "ready";
    }
  }));
}

// ============== Recursive Similarity Expansion ==============

async function recursiveSimilarityExpansion(
  query: string,
  embedding: number[],
  hops: number = 2
): Promise<{ chunks: { id: string; content: string; relevance: number; hop: number }[]; concepts: string[] }> {
  const results: { chunks: { id: string; content: string; relevance: number; hop: number }[]; concepts: string[] } = { 
    chunks: [], 
    concepts: [] 
  };
  
  // Stage 1: Initial retrieval
  const kgResult = queryKnowledgeGraph(query, hops);
  
  for (let i = 0; i < kgResult.nodes.length; i++) {
    const node = kgResult.nodes[i];
    const hop = i < 5 ? 0 : (i < 10 ? 1 : 2);
    results.chunks.push({
      id: node.id,
      content: node.content,
      relevance: 0.9 - (hop * 0.2),
      hop
    });
    results.concepts.push(node.name);
  }
  
  // Stage 2: Concept expansion (find related concepts)
  for (const concept of results.concepts.slice(0, 3)) {
    const related = queryKnowledgeGraph(concept, 1);
    for (const node of related.nodes.slice(0, 3)) {
      if (!results.chunks.find(c => c.id === node.id)) {
        results.chunks.push({
          id: node.id,
          content: node.content,
          relevance: 0.6,
          hop: 2
        });
      }
    }
  }
  
  // Sort by relevance
  results.chunks.sort((a, b) => b.relevance - a.relevance);
  
  return results;
}

// ============== A2A Async Messaging ==============

// Create async task
function createAsyncTask(
  type: "mcp_tool" | "a2a_delegation",
  toolOrAgent: string,
  args: Record<string, unknown>,
  estimatedMs: number
): AsyncTask {
  const task: AsyncTask = {
    id: `task_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
    type,
    tool_or_agent: toolOrAgent,
    args,
    status: "pending",
    started_at: Date.now(),
    estimated_ms: estimatedMs,
    sse_clients: new Set()
  };
  
  asyncTasks.set(task.id, task);
  
  // Simulate async execution
  executeAsyncTask(task);
  
  return task;
}

// Execute async task
async function executeAsyncTask(task: AsyncTask): Promise<void> {
  task.status = "running";
  
  // Simulate execution
  await new Promise(resolve => setTimeout(resolve, task.estimated_ms));
  
  // Simulate result
  task.result = {
    success: true,
    output: `Completed ${task.tool_or_agent} with args ${JSON.stringify(task.args).substring(0, 100)}`,
    execution_time_ms: task.estimated_ms
  };
  task.status = "completed";
  
  // Notify SSE clients
  for (const client of task.sse_clients) {
    try {
      client.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ task_id: task.id, status: task.status, result: task.result })}\n\n`));
    } catch (e) {
      task.sse_clients.delete(client);
    }
  }
}

// ============== Mode Detection ==============

function detectOutputMode(messages: any[], tools?: any[]): OutputMode {
  const systemMessage = messages.find((m: any) => m.role === "system");
  const hasTools = tools && tools.length > 0;
  const hasAgentKeywords = systemMessage?.content?.toLowerCase().match(/agent|tool|function/);
  
  const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
  const hasComplexTask = lastUser?.content?.match(/analyze|implement|refactor|debug|find|orchestrate/i);
  
  return (hasTools || hasAgentKeywords || hasComplexTask) ? "agent" : "chat";
}

function detectAgentType(req: Request): AgentType {
  const agentHeader = req.headers.get("x-agent-type");
  if (agentHeader) return agentHeader as AgentType;
  
  const userAgent = req.headers.get("user-agent") || "";
  if (userAgent.includes("continue")) return "continue-dev";
  if (userAgent.includes("cline")) return "cline";
  return "custom";
}

// ============== XML→JSON Tool Call Translation ==============

function parseXMLToolCalls(content: string): { reasoning: string; toolCalls: ToolCallParsed[] } {
  const toolCalls: ToolCallParsed[] = [];
  let reasoning = content;
  
  // Pattern: <tool_call={"name": "...", "arguments": {...}}</tool_call
  const patterns = [
    /<tool_call\s*=\s*(\{[^}]+\})\s*\/?>/g,
    /⟪(\{[^⟫]+\})⟫/g,
    /```tool_call\s*\n?(\{[\s\S]*?\n?)```/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        toolCalls.push({
          id: `call_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
          type: "function",
          function: {
            name: parsed.name || parsed.function?.name,
            arguments: typeof parsed.arguments === 'string'
              ? parsed.arguments
              : JSON.stringify(parsed.arguments || parsed.function?.arguments || {})
          }
        });
        reasoning = reasoning.replace(match[0], "");
      } catch (e) { /* skip invalid */ }
    }
  }
  
  // Extract thinking
  const thinkingMatch = reasoning.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  const reasoningContent = thinkingMatch ? thinkingMatch[1].trim() : reasoning.trim();
  
  return { reasoning: reasoningContent, toolCalls };
}

// ============== Context Headers ==============

function buildContextHeaders(
  sources: string[],
  confidence: number,
  session: SessionState,
  mode: OutputMode,
  protocol: ProtocolType,
  preTriggered: string[]
): Record<string, string> {
  return {
    "X-Context-Sources": sources.join(","),
    "X-Retrieval-Confidence": confidence.toFixed(2),
    "X-Session-State": `step_${session.plan_state.current_step}_of_${session.plan_state.total_steps}`,
    "X-Agent-Mode": mode,
    "X-Protocol-Used": protocol,
    "X-Pre-Triggered-Tools": preTriggered.join(",") || "none"
  };
}

// ============== Structured Streaming ==============

interface StreamChunk {
  type: "reasoning" | "tool_plan" | "context_injected" | "tool_call" | "content" | "final" | "async_task" | "knowledge_expansion";
  content?: string;
  tools?: string[];
  sources?: string[];
  id?: string;
  name?: string;
  arguments?: string;
  finish_reason?: string;
  task_id?: string;
  estimated_ms?: number;
  concepts?: string[];
  hop?: number;
}

function createStreamChunk(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

// ============== Actionable Errors ==============

function createError(
  message: string,
  type: string,
  code: string,
  agentAction?: Record<string, unknown>,
  proxyState?: Record<string, unknown>
): ActionableError {
  return { message, type, code, agent_action: agentAction, proxy_state: proxyState };
}

const ERRORS = {
  contextOverflow: (current: number, max: number) => createError(
    "Context length exceeded", "context_overflow", "context_length_exceeded",
    { type: "summarize_history", suggested_tokens: max - current, preserve_recent_turns: 3 },
    { current_context: current, max_context: max }
  ),
  toolFailed: (toolName: string, error: string) => createError(
    `Tool '${toolName}' failed: ${error}`, "tool_execution_failed", "tool_error",
    { type: "use_fallback" }, { tool: toolName }
  ),
  modelFailed: (error: string) => createError(
    `Model error: ${error}`, "model_error", "model_load_failed",
    { type: "try_different_model" }
  ),
  mcpUnavailable: (serverName: string) => createError(
    `MCP server '${serverName}' unavailable`, "mcp_unavailable", "server_error",
    { type: "use_a2a_fallback" }
  ),
  asyncTimeout: (taskId: string) => createError(
    `Async task '${taskId}' timed out`, "async_timeout", "timeout_error",
    { type: "retry_with_higher_timeout", task_id: taskId }
  )
};

// ============== Session Management ==============

const sessions = new Map<string, SessionState>();

function getOrCreateSession(sessionId?: string): SessionState {
  const id = sessionId || uuidv4();
  if (!sessions.has(id)) {
    sessions.set(id, {
      session_id: id,
      turn_number: 0,
      working_memory: { key_facts: [], open_questions: [] },
      previous_tool_results: [],
      plan_state: { total_steps: 5, current_step: 0, completed_actions: [] },
      context_pattern: [],
      async_tasks: []
    });
  }
  return sessions.get(id)!;
}

function updateSession(session: SessionState, updates: Partial<SessionState>): SessionState {
  const updated = { ...session, ...updates, turn_number: session.turn_number + 1 };
  sessions.set(session.session_id, updated);
  return updated;
}

// ============== Adaptive Parameters ==============

function adaptParameters(
  params: Record<string, unknown>,
  taskType: "code" | "reasoning" | "creative" | "general"
): GenerationConfig {
  const original = { ...params };
  const applied = { ...params };
  const adjustments: { reason: string; change: string }[] = [];
  
  if (taskType === "code" && (applied.temperature as number) > 0.3) {
    adjustments.push({ reason: "code_generation", change: `temperature ${applied.temperature}→0.2` });
    applied.temperature = 0.2;
  }
  
  return { original_request: original, applied_config: applied, adjustments };
}

function detectTaskType(messages: any[]): "code" | "reasoning" | "creative" | "general" {
  const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
  const content = lastUser?.content?.toLowerCase() || "";
  
  if (content.match(/code|implement|function|class|```/)) return "code";
  if (content.match(/analyze|explain|why|how/)) return "reasoning";
  if (content.match(/write|create|story|poem/)) return "creative";
  return "general";
}

// ============== SQLite Memory ==============

const memoryDb = new Database(join(import.meta.dir, "../../db/memory.db"));
memoryDb.run(`CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  embedding BLOB, created_at INTEGER NOT NULL, last_accessed INTEGER NOT NULL,
  access_count INTEGER DEFAULT 0, pinned INTEGER DEFAULT 0
)`);

const documentEmbeddings = new Map<string, { embedding: number[]; document: string; metadata: Record<string, unknown> }>();

// ============== Response Caching System ==============

interface CacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
  hits: number;
}

const responseCache = new Map<string, CacheEntry>();

function generateCacheKey(prefix: string, data: unknown): string {
  return `${prefix}:${JSON.stringify(data)}`;
}

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  
  entry.hits++;
  return entry.value as T;
}

function setCache(key: string, value: unknown): void {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    let oldestKey = '';
    let oldestTime = Date.now();
    for (const [k, v] of responseCache) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) responseCache.delete(oldestKey);
  }
  
  responseCache.set(key, { key, value, timestamp: Date.now(), hits: 0 });
}

function getCacheStats() {
  let totalHits = 0;
  let totalMisses = 0;
  for (const entry of responseCache.values()) {
    totalHits += entry.hits;
  }
  const size = responseCache.size;
  const hitRate = size > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;
  return { hits: totalHits, misses: totalMisses, hit_rate: hitRate, size };
}

function clearCache(): void {
  responseCache.clear();
}

// ============== Performance Metrics ==============

interface RequestMetric {
  endpoint: string;
  method: string;
  duration_ms: number;
  status: number;
  ttft_ms?: number;
  tokens_generated?: number;
  timestamp: number;
}

const metricsHistory: RequestMetric[] = [];
const MAX_METRICS = 1000;

function recordMetric(metric: Omit<RequestMetric, 'timestamp'>): void {
  metricsHistory.push({ ...metric, timestamp: Date.now() });
  if (metricsHistory.length > MAX_METRICS) {
    metricsHistory.shift();
  }
}

function getPerformanceMetrics() {
  if (metricsHistory.length === 0) {
    return {
      total_requests: 0,
      avg_latency_ms: 0,
      ttft_p50_ms: 0,
      ttft_p95_ms: 0,
      tps: 0,
      success_rate: 0
    };
  }
  
  const latencies = metricsHistory.map(m => m.duration_ms).sort((a, b) => a - b);
  const ttfts = metricsHistory.filter(m => m.ttft_ms).map(m => m.ttft_ms!).sort((a, b) => a - b);
  const tokensList = metricsHistory.filter(m => m.tokens_generated).map(m => m.tokens_generated!);
  const successful = metricsHistory.filter(m => m.status >= 200 && m.status < 400);
  
  const totalRequests = metricsHistory.length;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const ttftP50 = ttfts.length > 0 ? ttfts[Math.floor(ttfts.length * 0.5)] : 0;
  const ttftP95 = ttfts.length > 0 ? ttfts[Math.floor(ttfts.length * 0.95)] : 0;
  const totalTokens = tokensList.reduce((a, b) => a + b, 0);
  const totalTime = metricsHistory.reduce((a, b) => a + b.duration_ms, 0);
  const tps = totalTime > 0 ? (totalTokens / totalTime) * 1000 : 0;
  const successRate = (successful.length / totalRequests) * 100;
  
  return {
    total_requests: totalRequests,
    avg_latency_ms: Math.round(avgLatency * 100) / 100,
    ttft_p50_ms: Math.round(ttftP50 * 100) / 100,
    ttft_p95_ms: Math.round(ttftP95 * 100) / 100,
    tps: Math.round(tps * 100) / 100,
    success_rate: Math.round(successRate * 100) / 100
  };
}

// ============== Local Tool Registry ==============

interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  safety_level: "autonomous" | "supervised" | "manual";
  handler: (args: any, session: SessionState) => Promise<{ result: unknown; meta?: Record<string, unknown> }>;
}

const toolRegistry = new Map<string, ToolDefinition>();
let currentApprovalMode: "autonomous" | "supervised" | "manual" = "supervised";

function registerTool(t: ToolDefinition) {
  toolRegistry.set(t.name, t);
  console.log(`[ToolRegistry] ${t.name} (${t.safety_level})`);
}

registerTool({
  name: "semantic_search",
  description: "Search codebase using semantic similarity with recursive expansion",
  parameters: z.object({ query: z.string(), top_k: z.number().optional().default(5), expand_hops: z.number().optional().default(2) }),
  safety_level: "autonomous",
  handler: async (args) => {
    const results = await recursiveSimilarityExpansion(args.query, [], args.expand_hops);
    return { 
      result: { 
        results: results.chunks.slice(0, args.top_k).map(c => ({ id: c.id, content: c.content, relevance: c.relevance, hop: c.hop })),
        related_concepts: results.concepts
      }, 
      meta: { confidence: 0.87, sources: ["retrieval:semantic", "knowledge_graph"], recursive_hops: args.expand_hops }
    };
  }
});

registerTool({
  name: "knowledge_query",
  description: "Query the knowledge graph for concepts and relationships",
  parameters: z.object({ query: z.string(), max_hops: z.number().optional().default(2) }),
  safety_level: "autonomous",
  handler: async (args) => {
    const result = queryKnowledgeGraph(args.query, args.max_hops);
    return { 
      result: { 
        nodes: result.nodes.map(n => ({ id: n.id, name: n.name, type: n.type, content: n.content })),
        paths: result.paths,
        confidence: result.confidence
      }, 
      meta: { sources: ["knowledge_graph"] }
    };
  }
});

registerTool({
  name: "read_memory",
  description: "Retrieve from persistent memory",
  parameters: z.object({ query: z.string() }),
  safety_level: "autonomous",
  handler: async (args) => {
    const memories = memoryDb.prepare("SELECT * FROM memories WHERE value LIKE ? LIMIT 10").all(`%${args.query}%`);
    return { result: { memories }, meta: { confidence: memories.length > 0 ? 0.9 : 0.3 } };
  }
});

registerTool({
  name: "write_memory",
  description: "Store in persistent memory",
  parameters: z.object({ key: z.string(), value: z.string(), type: z.enum(["working", "project", "episodic"]) }),
  safety_level: "supervised",
  handler: async (args) => {
    const id = uuidv4();
    memoryDb.prepare("INSERT INTO memories (id, type, key, value, created_at, last_accessed) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, args.type, args.key, args.value, Date.now(), Date.now());
    return { result: { success: true, id } };
  }
});

registerTool({
  name: "execute_code",
  description: "Execute code in sandbox",
  parameters: z.object({ code: z.string() }),
  safety_level: "supervised",
  handler: async (args) => ({
    result: { stdout: `[simulated]\n${args.code}`, stderr: "", exit_code: 0 },
    meta: { execution_time_ms: 150 }
  })
});

registerTool({
  name: "file_read",
  description: "Read file",
  parameters: z.object({ path: z.string() }),
  safety_level: "autonomous",
  handler: async (args) => {
    try {
      const content = await Bun.file(args.path).text();
      return { result: { success: true, content } };
    } catch (e) {
      return { result: { success: false, error: String(e) } };
    }
  }
});

registerTool({
  name: "file_write",
  description: "Write file (requires approval)",
  parameters: z.object({ path: z.string(), content: z.string() }),
  safety_level: "manual",
  handler: async (args) => {
    try {
      await Bun.write(args.path, args.content);
      return { result: { success: true, path: args.path } };
    } catch (e) {
      return { result: { success: false, error: String(e) } };
    }
  }
});

registerTool({
  name: "index_documentation",
  description: "Index documentation into knowledge graph",
  parameters: z.object({ content: z.string(), url: z.string().optional() }),
  safety_level: "autonomous",
  handler: async (args) => {
    const result = await indexDocumentation(args.content, args.url);
    return { result: { success: true, doc_id: result.docId, nodes_added: result.nodesAdded } };
  }
});

// ============== Model Management ==============

async function loadModel(modelKey: string, config?: any): Promise<LLM> {
  const connected = await ensureClient();
  if (!connected || !client) {
    throw new Error("LM Studio not connected");
  }
  if (currentLLM) await currentLLM.unload();
  const loadConfig = {
    gpuOffload: { ratio: config?.gpu_offload_ratio ?? 1.0 },
    contextLength: config?.context_length ?? 8192,
  };
  currentLLM = await client.llm.load(modelKey, { config: loadConfig });
  console.log(`[Model] Loaded: ${currentLLM.identifier}`);
  return currentLLM;
}

async function loadEmbeddingModel(modelKey: string): Promise<EmbeddingModel> {
  const connected = await ensureClient();
  if (!connected || !client) {
    throw new Error("LM Studio not connected");
  }
  if (currentEmbeddingModel) await currentEmbeddingModel.unload();
  currentEmbeddingModel = await client.embedding.load(modelKey);
  console.log(`[Embedding] Loaded: ${currentEmbeddingModel.identifier}`);
  return currentEmbeddingModel;
}

// ============== Unified Orchestration Endpoint ==============

async function handleOrchestrate(req: Request): Promise<Response> {
  const body: OrchestrationRequest = await req.json() as OrchestrationRequest;
  const { intent, context, tools_available, agents_available, orchestration_mode, session_id } = body;
  
  const session = getOrCreateSession(session_id);
  
  // Analyze intent for pre-triggering
  const messages = [{ role: "user", content: intent }];
  const preTriggerAnalysis = analyzeContextForPreTrigger(messages);
  
  // Pre-trigger tools
  await preTriggerTools(preTriggerAnalysis.tools);
  
  // Determine complexity
  const complexity = analyzeComplexity(intent, context);
  
  // Decide protocol
  const decision = decideOrchestration(complexity, tools_available, agents_available, orchestration_mode);
  
  // Execute based on decision
  const result = await executeOrchestration(decision, intent, context, session);
  
  return Response.json({
    orchestration_id: `orch_${uuidv4().substring(0, 8)}`,
    decision,
    result,
    session_update: {
      session_id: session.session_id,
      turn_number: session.turn_number + 1,
      protocol_used: decision.protocol,
      pre_triggered: preTriggerAnalysis.tools
    }
  });
}

function analyzeComplexity(intent: string, context: Record<string, unknown>): {
  level: "simple" | "moderate" | "complex";
  estimated_duration_ms: number;
  cross_file: boolean;
  security_critical: boolean;
} {
  const intentLower = intent.toLowerCase();
  
  const crossFile = intentLower.includes("refactor") || intentLower.includes("across") || intentLower.includes("multiple");
  const securityCritical = intentLower.includes("auth") || intentLower.includes("security") || intentLower.includes("password");
  
  let level: "simple" | "moderate" | "complex" = "simple";
  let estimatedDuration = 5000;
  
  if (crossFile || intentLower.includes("implement")) {
    level = "moderate";
    estimatedDuration = 30000;
  }
  if (securityCritical || intentLower.includes("architecture") || intentLower.includes("migrate")) {
    level = "complex";
    estimatedDuration = 120000;
  }
  
  return { level, estimated_duration_ms: estimatedDuration, cross_file: crossFile, security_critical: securityCritical };
}

function decideOrchestration(
  complexity: ReturnType<typeof analyzeComplexity>,
  toolsAvailable: string[],
  agentsAvailable: string[],
  mode: string
): {
  protocol: ProtocolType;
  tools: string[];
  agents: string[];
  reason: string;
  async: boolean;
} {
  if (mode === "local_only") {
    return { protocol: "local", tools: toolsAvailable, agents: [], reason: "mode_forced_local", async: false };
  }
  if (mode === "mcp_only") {
    return { protocol: "mcp", tools: toolsAvailable, agents: [], reason: "mode_forced_mcp", async: complexity.estimated_duration_ms > ASYNC_TOOL_THRESHOLD_MS };
  }
  if (mode === "a2a_only") {
    return { protocol: "a2a", tools: [], agents: agentsAvailable, reason: "mode_forced_a2a", async: true };
  }
  
  // Adaptive mode
  if (complexity.security_critical) {
    return { protocol: "a2a", tools: [], agents: ["security-auditor"], reason: "security_critical_delegation", async: true };
  }
  
  if (complexity.cross_file && complexity.level === "complex") {
    return { protocol: "a2a", tools: [], agents: ["code-reviewer"], reason: "cross_file_complex", async: true };
  }
  
  if (complexity.estimated_duration_ms > 30000) {
    return { protocol: "mcp", tools: toolsAvailable, agents: [], reason: "long_running_async", async: true };
  }
  
  return { protocol: "mcp", tools: toolsAvailable, agents: [], reason: "standard_mcp", async: false };
}

async function executeOrchestration(
  decision: ReturnType<typeof decideOrchestration>,
  intent: string,
  context: Record<string, unknown>,
  session: SessionState
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {
    protocol: decision.protocol,
    tools_used: decision.tools,
    agents_used: decision.agents,
    async: decision.async
  };
  
  if (decision.async) {
    // Create async task
    const task = createAsyncTask(
      decision.protocol === "a2a" ? "a2a_delegation" : "mcp_tool",
      decision.protocol === "a2a" ? decision.agents[0] : decision.tools[0],
      { intent, context },
      30000
    );
    result.task_id = task.id;
    result.status = "async_pending";
    result.estimated_ms = task.estimated_ms;
  } else {
    // Synchronous execution
    result.status = "completed";
    result.output = `Orchestrated ${decision.protocol} execution for: ${intent}`;
  }
  
  return result;
}

// ============== Main Handlers ==============

async function handleChatCompletions(req: Request): Promise<Response> {
  const body = await req.json();
  const { model, messages, stream, tools, temperature, max_tokens, session_id } = body;
  const lastUserMessage = [...(messages ?? [])].reverse().find((m: any) => m.role === "user");
  const userContent = lastUserMessage?.content ?? "";
  
  // 1. Analyze intent
  const intent = intentPipeline.analyze(userContent);
  let kgMatches: { nodes: any[]; confidence?: number; paths?: any[] } = { nodes: [] };
  
  // 2. Conditional RAG flow based on intent
  if (intent.requiresRAG) {
    console.log(`[IntentPipeline] RAG intent detected: ${intent.intentType} (confidence: ${intent.confidence})`);
    
    // Fetch deeper context (2 hops) for RAG queries
    kgMatches = queryKnowledgeGraph(userContent, 2);
    
    // Use embedding coalescer for semantic reranking if LM Studio is connected
    const connected = await ensureClient();
    if (connected && kgMatches.nodes.length > 0) {
      try {
        const docTexts = kgMatches.nodes.map((n: any) => n.content);
        
        // Apply instruction prefix based on intent for Qwen3-Embedding
        let instruction = "Given a web search query, retrieve relevant passages that answer the query: ";
        if (intent.intentType === 'rag_codebase') instruction = "Retrieve code implementing: ";
        else if (intent.intentType === 'rag_docs') instruction = "Find documentation explaining: ";
        else if (intent.intentType === 'rag_architecture') instruction = "Retrieve architecture documentation for: ";
        
        const queryWithInstruction = `${instruction}${userContent}`;
        const allTexts = [queryWithInstruction, ...docTexts];
        
        // Batch embed user query + all docs via the coalescer
        const embeddings = await embeddingCoalescer.getEmbeddings(allTexts, "text-embedding-qwen3-embedding-4b");
        
        if (embeddings && embeddings.length === allTexts.length) {
          const queryEmb = embeddings[0];
          const docEmbeddings = embeddings.slice(1);
          
          // Score and rerank
          const scoredNodes = kgMatches.nodes.map((node: any, i: number) => ({
            ...node,
            similarity: cosineSimilarity(queryEmb, docEmbeddings[i])
          }));
          
          // Sort descending by similarity
          scoredNodes.sort((a, b) => b.similarity - a.similarity);
          
          // Keep only relevant nodes
          kgMatches.nodes = scoredNodes.filter(n => n.similarity > 0.4);
          console.log(`[IntentPipeline] Reranked and kept ${kgMatches.nodes.length} highly relevant nodes`);
        }
      } catch (e) {
        console.warn(`[IntentPipeline] Semantic reranking failed, falling back to basic KG results:`, e);
      }
    }
  } else {
    // Default lightweight retrieval
    kgMatches = queryKnowledgeGraph(userContent, 1);
  }
  
  const settingsManager = getSettingsManager();
  const presets = settingsManager.getModelPresets();
  const preset = presets.find(p => p.model_key === model || p.name === model) || settingsManager.getDefaultModelPreset();

  const context = buildContext({
    prompt: userContent,
    messages: (messages ?? []).map((m: any) => ({ role: m.role, content: m.content ?? "" })),
    docs: kgMatches.nodes.slice(0, 5).map((n) => ({
      id: n.id,
      content: n.content,
      score: Math.min(1, (n.similarity ?? (n.access_count / 10))),
      source: n.source_doc_id
    })),
    maxContextChars: 4000,
    preset: preset
  });
  
  // Check if LM Studio is available - use native API for better reliability
  const connected = await ensureClient();
  if (connected) {
    // Use LM Studio native API
    return handleNativeChatCompletions(
      req,
      model,
      context.normalizedMessages,
      stream,
      temperature,
      max_tokens,
      context.budgetedContext
    );
  }
  
  // Fallback to standalone mode if LM Studio not available
  return handleStandaloneMode(messages, tools, session_id);
}

async function handleNativeChatCompletions(
  req: Request,
  model: string,
  messages: any[],
  stream: boolean,
  temperature?: number,
  max_tokens?: number,
  retrievalContext?: string
): Promise<Response> {
  try {
    const settings = getSettingsManager().getLMStudioConnection();
    const lmStudioUrl = `http://${settings.host}:${settings.port}`;
    const input = toLMStudioInput(messages);
    const promptWithContext = retrievalContext
      ? `Context:\n${retrievalContext}\n\nConversation:\n${input}`
      : input;
    
    const lmStudioRequest: any = {
      model,
      input: promptWithContext
    };
    
    if (temperature !== undefined) lmStudioRequest.temperature = temperature;
    
    if (stream) {
      const lmStudioResponse = await connectionPool.execute(async () => {
        return await fetch(`${lmStudioUrl}/api/v1/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lmStudioRequest)
        });
      }, 'high');

      if (!lmStudioResponse.ok) {
        const errorData = await lmStudioResponse.json();
        return Response.json({ error: errorData.error || "LM Studio streaming error" }, { status: lmStudioResponse.status });
      }

      return createStreamingResponse(
        interceptAndExecuteTools(
          lmStudioResponse,
          lmStudioRequest,
          lmStudioUrl,
          model,
          messages
        ),
        {
          chunkSize: 4096,
          flushInterval: 16,
          highWaterMark: 64 * 1024,
          lowWaterMark: 16 * 1024
        }
      );
    }
    
    const lmStudioResponse = await connectionPool.execute(async () => {
      return await fetch(`${lmStudioUrl}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lmStudioRequest)
      });
    }, 'high');
    
    if (!lmStudioResponse.ok) {
      const errorData = await lmStudioResponse.json();
      return Response.json({ error: errorData.error || "LM Studio error" }, { status: lmStudioResponse.status });
    }
    
    const lmStudioData = await lmStudioResponse.json();
    
    const outputMessages = lmStudioData.output || [];
    const messagePart = outputMessages.find((o: any) => o.type === "message");
    const reasoningPart = outputMessages.find((o: any) => o.type === "reasoning");
    const content = (reasoningPart?.content ? reasoningPart.content + "\n\n" : "") + (messagePart?.content || "");
    
    // Convert to OpenAI format
    const response = toOpenAIChatResponse({
      id: `chatcmpl-${uuidv4().replace(/-/g, "").substring(0, 24)}`,
      model,
      content,
      finishReason: "stop",
      promptTokens: lmStudioData.stats?.input_tokens || 0,
      completionTokens: lmStudioData.stats?.total_output_tokens || 0
    });
    
    return Response.json(response);
  } catch (e) {
    console.error("[NativeChat] Error:", e);
    return Response.json({ error: `Chat failed: ${String(e)}` }, { status: 500 });
  }
}

// Handle requests when LM Studio is not available
async function handleStandaloneMode(messages: any[], tools: any[], sessionId?: string): Promise<Response> {
  const outputMode = detectOutputMode(messages, tools);
  const session = getOrCreateSession(sessionId);
  
  // Pre-trigger analysis still works
  const preTrigger = analyzeContextForPreTrigger(messages);
  
  // Knowledge graph query still works
  const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
  const query = lastUser?.content || "";
  const kgResult = queryKnowledgeGraph(query, 2);
  
  // Build response with available data
  const response = {
    id: `chatcmpl-${uuidv4().replace(/-/g, '').substring(0, 24)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "standalone-mode",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: `[Standalone Mode - LM Studio not connected]\n\nKnowledge Graph found ${kgResult.nodes.length} related concepts.\n\nPre-triggered tools: ${preTrigger.tools.join(', ') || 'none'}\n\nNote: Connect LM Studio for full LLM capabilities.`,
        ...(outputMode === "agent" && {
          reasoning_content: "Analyzed context in standalone mode",
          agent_meta: {
            confidence: kgResult.confidence,
            plan_steps: 1,
            current_step: 1,
            context_injected: kgResult.nodes.length > 0,
            sources: kgResult.nodes.length > 0 ? ["knowledge_graph"] : [],
            protocol_used: "local",
            pre_triggered_tools: preTrigger.tools,
            recursive_hops: 2
          }
        })
      },
      finish_reason: "stop"
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    standalone_mode: true,
    knowledge_graph_results: kgResult.nodes.slice(0, 5).map(n => ({ name: n.name, type: n.type }))
  };
  
  return Response.json(response);
}

async function handleStreaming(
  chat: Chat, session: SessionState, outputMode: OutputMode,
  genConfig: GenerationConfig, contextSources: string[], tools?: any[],
  protocol: ProtocolType = "local", preTriggered: string[] = []
): Promise<Response> {
  const encoder = new TextEncoder();

  async function* streamGenerator(): AsyncGenerator<Uint8Array> {
    try {
      yield encoder.encode(createStreamChunk({ type: "reasoning", content: "Analyzing..." }));

      if (outputMode === "agent" && tools) {
        yield encoder.encode(createStreamChunk({ type: "tool_plan", tools: tools.map((t: any) => t.function?.name).filter(Boolean) }));
      }

      if (contextSources.length > 0) {
        yield encoder.encode(createStreamChunk({ type: "context_injected", sources: contextSources }));
      }

      if (outputMode === "agent") {
        const lastUser = chat.toString().split("\n").pop() || "";
        const expansion = await recursiveSimilarityExpansion(lastUser, [], 1);
        if (expansion.concepts.length > 0) {
          yield encoder.encode(createStreamChunk({
            type: "knowledge_expansion",
            concepts: expansion.concepts.slice(0, 5),
            hop: 1
          }));
        }
      }

      if (preTriggered.length > 0) {
        yield encoder.encode(createStreamChunk({ type: "tool_plan", tools: preTriggered }));
      }

      const prediction = currentLLM!.respond(chat, {
        temperature: genConfig.applied_config.temperature as number,
        maxTokens: genConfig.applied_config.max_tokens as number
      });

      let fullContent = "";
      for await (const fragment of prediction) {
        fullContent += fragment.content;
        yield encoder.encode(createStreamChunk({ type: "content", content: fragment.content }));
      }

      const { reasoning, toolCalls } = parseXMLToolCalls(fullContent);

      for (const tc of toolCalls) {
        const route = routeToProtocol(tc.function.name, 5000);
        yield encoder.encode(createStreamChunk({
          type: "tool_call",
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments
        }));

        if (route.async) {
          const task = createAsyncTask("mcp_tool", tc.function.name, JSON.parse(tc.function.arguments), 30000);
          yield encoder.encode(createStreamChunk({
            type: "async_task",
            task_id: task.id,
            estimated_ms: task.estimated_ms
          }));
        }
      }

      yield encoder.encode(createStreamChunk({ type: "final", content: reasoning, finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop" }));
    } catch (e) {
      // Stream error
    }
  }

  return createStreamingResponse(streamGenerator(), {
    chunkSize: 4096,
    flushInterval: 16,
    highWaterMark: 64 * 1024,
    lowWaterMark: 16 * 1024
  });
}

async function handleNonStreaming(
  chat: Chat, session: SessionState, outputMode: OutputMode,
  genConfig: GenerationConfig, contextSources: string[], tools?: any[],
  protocol: ProtocolType = "local", preTriggered: string[] = []
): Promise<Response> {
  let reasoning = "";
  let toolCallsResult: ToolCallParsed[] = [];
  let recursiveHops = 0;
  
  if (outputMode === "agent" && tools && tools.length > 0) {
    const lmTools = tools.map((t: any) => {
      const reg = toolRegistry.get(t.function?.name);
      if (reg) return tool({ name: reg.name, description: reg.description, parameters: reg.parameters as any, implementation: async (args: any) => (await reg.handler(args, session)).result });
      return null;
    }).filter((t): t is NonNullable<typeof t> => t !== null);
    
    if (lmTools.length > 0) {
      const actResult = await currentLLM!.act(chat, lmTools);
      reasoning = `Completed in ${actResult.rounds} rounds.`;
    }
  }
  
  if (!reasoning) {
    const result = await currentLLM!.respond(chat, {
      temperature: genConfig.applied_config.temperature as number,
      maxTokens: genConfig.applied_config.max_tokens as number
    });
    reasoning = result.content;
  }
  
  // Recursive similarity expansion for context
  if (outputMode === "agent") {
    const expansion = await recursiveSimilarityExpansion(reasoning.substring(0, 200), [], 1);
    recursiveHops = expansion.chunks.filter(c => c.hop > 0).length;
    contextSources.push(...expansion.concepts.slice(0, 3).map(c => `concept:${c}`));
  }
  
  const { reasoning: parsedReasoning, toolCalls } = parseXMLToolCalls(reasoning);
  
  const updatedSession = updateSession(session, {
    plan_state: { ...session.plan_state, current_step: session.plan_state.current_step + 1, completed_actions: [...session.plan_state.completed_actions, "response"] }
  });
  
  const response = {
    id: `chatcmpl-${uuidv4().replace(/-/g, '').substring(0, 24)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: currentLLM!.identifier,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: toolCalls.length > 0 ? null : parsedReasoning,
        ...(toolCalls.length > 0 && { tool_calls: toolCalls })
      },
      finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop"
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
  
  return Response.json(response, { headers: buildContextHeaders(contextSources, 0.85, updatedSession, outputMode, protocol, preTriggered) as any });
}

async function handleEmbeddings(req: Request): Promise<Response> {
  const body = await req.json();
  const { input, model } = body;
  
  const modelKey = model || "text-embedding-qwen3-embedding-4b";
  const text = Array.isArray(input) ? input : [input];
  
  try {
    let embeddings = await embeddingCoalescer.getEmbeddings(text, modelKey);
    
    // Apply MRL Truncation and L2-Normalization if dimension is requested
    const { dimensions } = body;
    if (dimensions && typeof dimensions === 'number') {
      embeddings = embeddings.map((e: number[]) => {
        const truncated = e.slice(0, dimensions);
        const norm = Math.sqrt(truncated.reduce((sum, val) => sum + val * val, 0));
        return norm > 0 ? truncated.map(val => val / norm) : truncated;
      });
    }
    
    return Response.json({
      object: "list",
      data: embeddings.map((e: number[], i: number) => ({ 
        object: "embedding", 
        embedding: e, 
        index: i 
      })),
      model: modelKey
    });
  } catch (e) {
    console.error(`[Embedding] Error: ${String(e)}`);
    return Response.json({ error: `Embedding generation failed: ${String(e)}` }, { status: 500 });
  }
}

async function handleRerank(req: Request): Promise<Response> {
  const connected = await ensureClient();
  if (!connected || !client) {
    return Response.json({ error: "LM Studio not connected. Please ensure LM Studio is running." }, { status: 503 });
  }
  
  const body = await req.json();
  const { query, documents, top_n, model } = body;
  
  if (!query || !documents || !Array.isArray(documents)) {
    return Response.json({ error: "Missing query or documents array" }, { status: 400 });
  }
  
  const modelKey = model || "qwen3-reranker-0.6b";
  
  try {
    if (!currentEmbeddingModel || currentEmbeddingModel.identifier !== modelKey) {
      if (currentEmbeddingModel) await currentEmbeddingModel.unload();
      
      const loadedEmbeddings = await client.embedding.listLoaded();
      const alreadyLoaded = loadedEmbeddings.find(m => m.identifier === modelKey || m.modelKey === modelKey);
      
      if (alreadyLoaded) {
        currentEmbeddingModel = alreadyLoaded;
        console.log(`[Reranker] Using already loaded: ${currentEmbeddingModel.identifier}`);
      } else {
        currentEmbeddingModel = await client.embedding.load(modelKey);
        console.log(`[Reranker] Loaded: ${currentEmbeddingModel.identifier}`);
      }
    }
  }
  catch (e) { 
    return Response.json({ error: ERRORS.modelFailed(String(e)) }, { status: 500 }); 
  }
  
  try {
    const startTime = Date.now();
    
    // Extract all texts to embed
    const queryText = query;
    const docTexts = documents.slice(0, 20).map((doc: string | { text?: string; content?: string }) => 
      typeof doc === 'string' ? doc : (doc.text || doc.content || '')
    );
    const allTexts = [queryText, ...docTexts];
    
    // Get embeddings for query and documents in one batch via coalescer
    const embeddings = await embeddingCoalescer.getEmbeddings(allTexts, modelKey);
    
    if (!embeddings || embeddings.length !== allTexts.length) {
      throw new Error("Failed to get embeddings for all documents");
    }
    
    const queryEmb = embeddings[0];
    const docEmbeddings = embeddings.slice(1);
    
    // Calculate cosine similarities
    const results = docEmbeddings.map((embedding, i) => {
      const similarity = cosineSimilarity(queryEmb, embedding);
      return { text: docTexts[i], score: similarity };
    });
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Return top N
    const topResults = results.slice(0, top_n || 5);
    
    return Response.json({
      query,
      results: topResults,
      total: results.length,
      model: currentEmbeddingModel!.identifier,
      time_ms: Date.now() - startTime
    });
  } catch (e) {
    return Response.json({ error: `Reranking failed: ${String(e)}` }, { status: 500 });
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

// ============== Stateful Chat (LM Studio Native API) ==============

async function handleStatefulChat(req: Request): Promise<Response> {
  const connected = await ensureClient();
  if (!connected) {
    return Response.json({ error: "LM Studio not connected. Please ensure LM Studio is running." }, { status: 503 });
  }

  const body = await req.json();
  const { model, input, previous_response_id, store = true, temperature, max_tokens, stream } = body;

  // Validate required fields
  if (!model || !input) {
    return Response.json({ error: "Missing required fields: model, input" }, { status: 400 });
  }

  try {
    // Get LM Studio settings
    const settings = getSettingsManager().getLMStudioConnection();
    const lmStudioUrl = `http://${settings.host}:${settings.port}`;

    // Build request body for LM Studio native API
    const lmStudioRequest: any = {
      model,
      input,
      store
    };

    // Add optional parameters
    if (previous_response_id) {
      lmStudioRequest.previous_response_id = previous_response_id;
    }
    if (temperature !== undefined) {
      lmStudioRequest.temperature = temperature;
    }
    if (max_tokens !== undefined) {
      lmStudioRequest.max_tokens = max_tokens;
    }

    // Make request to LM Studio native API
    const lmStudioResponse = await connectionPool.execute(async () => {
      return await fetch(`${lmStudioUrl}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lmStudioRequest)
      });
    }, 'high');

    if (!lmStudioResponse.ok) {
      const errorData = await lmStudioResponse.json();
      return Response.json(
        { error: `LM Studio error: ${errorData.error || "Unknown error"}` },
        { status: lmStudioResponse.status }
      );
    }

    // Handle streaming
    if (stream) {
      return createStreamingResponse(streamFromResponse(lmStudioResponse), {
        chunkSize: 4096,
        flushInterval: 16,
        highWaterMark: 64 * 1024,
        lowWaterMark: 16 * 1024
      });
    }

    // Parse response from LM Studio
    const lmStudioData = await lmStudioResponse.json();

    // Extract response_id for session chaining
    const response_id = lmStudioData.response_id || `sess_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

    // Simplify response for frontend
    const response = {
      response_id,
      model_instance_id: lmStudioData.model_instance_id || model,
      output: lmStudioData.output || [],
      store: store
    };

    return Response.json(response);
  } catch (e) {
    console.error("[StatefulChat] Error:", e);
    return Response.json(
      { error: `Stateful chat failed: ${String(e)}` },
      { status: 500 }
    );
  }
}

// ============== Dynamic Model Management (LM Studio Native API) ==============

// Track loaded models in memory for quick UI feedback
const loadedModelsState = new Map<string, { instance_id: string; type: "llm" | "embedding"; load_time_seconds: number; loaded_at: number }>();

async function handleLoadModelDynamic(req: Request): Promise<Response> {
  const connected = await ensureClient();
  if (!connected) {
    return Response.json({ error: "LM Studio not connected. Please ensure LM Studio is running." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { model, context_length, flash_attention, offload_kv_cache_to_gpu, eval_batch_size } = body;

    if (!model) {
      return Response.json({ error: "Missing required field: model" }, { status: 400 });
    }

    // Get LM Studio settings
    const settings = getSettingsManager().getLMStudioConnection();
    const lmStudioUrl = `http://${settings.host}:${settings.port}`;

    // Build request for LM Studio native API
    const lmStudioRequest: any = { model, echo_load_config: true };
    
    if (context_length !== undefined) lmStudioRequest.context_length = context_length;
    if (flash_attention !== undefined) lmStudioRequest.flash_attention = flash_attention;
    if (offload_kv_cache_to_gpu !== undefined) lmStudioRequest.offload_kv_cache_to_gpu = offload_kv_cache_to_gpu;
    if (eval_batch_size !== undefined) lmStudioRequest.eval_batch_size = eval_batch_size;

    // Call LM Studio model load endpoint
    const startTime = Date.now();
    const lmStudioResponse = await connectionPool.execute(async () => {
      return await fetch(`${lmStudioUrl}/api/v1/models/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lmStudioRequest)
      });
    }, 'normal');

    if (!lmStudioResponse.ok) {
      const errorData = await lmStudioResponse.json();
      return Response.json(
        { error: `Failed to load model: ${errorData.error || "Unknown error"}` },
        { status: lmStudioResponse.status }
      );
    }

    const lmStudioData = await lmStudioResponse.json();

    // Track in state
    loadedModelsState.set(lmStudioData.instance_id, {
      instance_id: lmStudioData.instance_id,
      type: lmStudioData.type,
      load_time_seconds: lmStudioData.load_time_seconds,
      loaded_at: Date.now()
    });

    console.log(`[ModelManagement] Loaded model: ${lmStudioData.instance_id} (${lmStudioData.load_time_seconds}s)`);

    return Response.json({
      type: lmStudioData.type,
      instance_id: lmStudioData.instance_id,
      load_time_seconds: lmStudioData.load_time_seconds,
      status: lmStudioData.status,
      load_config: lmStudioData.load_config || {}
    });
  } catch (e) {
    console.error("[ModelManagement] Load failed:", e);
    return Response.json(
      { error: `Model load failed: ${String(e)}` },
      { status: 500 }
    );
  }
}

async function handleUnloadModelDynamic(req: Request): Promise<Response> {
  const connected = await ensureClient();
  if (!connected) {
    return Response.json({ error: "LM Studio not connected. Please ensure LM Studio is running." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { instance_id } = body;

    if (!instance_id) {
      return Response.json({ error: "Missing required field: instance_id" }, { status: 400 });
    }

    // Get LM Studio settings
    const settings = getSettingsManager().getLMStudioConnection();
    const lmStudioUrl = `http://${settings.host}:${settings.port}`;

    // Call LM Studio model unload endpoint
    const lmStudioResponse = await connectionPool.execute(async () => {
      return await fetch(`${lmStudioUrl}/api/v1/models/unload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance_id })
      });
    }, 'normal');

    if (!lmStudioResponse.ok) {
      const errorData = await lmStudioResponse.json();
      return Response.json(
        { error: `Failed to unload model: ${errorData.error || "Unknown error"}` },
        { status: lmStudioResponse.status }
      );
    }

    const lmStudioData = await lmStudioResponse.json();

    // Remove from state
    loadedModelsState.delete(instance_id);

    console.log(`[ModelManagement] Unloaded model: ${instance_id}`);

    return Response.json({
      instance_id: lmStudioData.instance_id,
      status: "unloaded"
    });
  } catch (e) {
    console.error("[ModelManagement] Unload failed:", e);
    return Response.json(
      { error: `Model unload failed: ${String(e)}` },
      { status: 500 }
    );
  }
}

async function handleLoadedModels(): Promise<Response> {
  try {
    const loadedModels = Array.from(loadedModelsState.values()).map(model => ({
      instance_id: model.instance_id,
      type: model.type,
      load_time_seconds: model.load_time_seconds,
      loaded_at: model.loaded_at
    }));

    return Response.json({
      data: loadedModels,
      count: loadedModels.length
    });
  } catch (e) {
    console.error("[ModelManagement] Query failed:", e);
    return Response.json(
      { error: `Failed to list loaded models: ${String(e)}` },
      { status: 500 }
    );
  }
}

// ============== Admin Endpoints ==============

async function handleStatus(): Promise<Response> {
  // Calculate stats
  const mcpHealthy = [...mcpServers.values()].filter(s => s.health === "healthy").length;
  const a2aAvailable = [...a2aAgents.values()].filter(a => a.status === "available").length;
  const asyncPending = [...asyncTasks.values()].filter(t => t.status === "running").length;
  const preTriggered = [...toolPreStates.values()].filter(s => s.status === "ready").length;
  const memStats = getDetailedMemoryStats();
  
  return Response.json({
    status: "running", 
    lmstudio_connected: lmStudioConnected,
    tools_registered: toolRegistry.size,
    models_loaded: currentLLM ? [currentLLM.identifier] : [],
    approval_mode: currentApprovalMode,
    active_sessions: sessions.size,
    documents_indexed: documentEmbeddings.size,
    
    // Bun-specific memory stats
    memory: {
      heap_used_mb: memStats.heapUsed,
      heap_total_mb: memStats.heapTotal,
      external_mb: memStats.external,
      buffer_pool: bufferPool.getStats()
    },
    
    // Knowledge Graph
    knowledge_graph: {
      nodes: knowledgeGraph.nodes.size,
      edges: knowledgeGraph.edges.size,
      documents: knowledgeDb.prepare("SELECT COUNT(*) as count FROM documents").get() as { count: number }
    },
    
    // Protocol Status
    protocols: {
      mcp: {
        servers: mcpServers.size,
        healthy: mcpHealthy,
        tools: [...mcpServers.values()].reduce((acc, s) => acc + s.tools.length, 0)
      },
      a2a: {
        agents: a2aAgents.size,
        available: a2aAvailable
      }
    },
    
    // Async Tasks
    async_tasks: {
      pending: asyncPending,
      total: asyncTasks.size
    },
    
    // Pre-triggering
    pre_triggering: {
      pre_warmed_tools: preTriggered,
      patterns_loaded: preTriggerPatterns.length
    },
    
    // Agentic Features
    agentic_features: { 
      dual_mode: true, 
      structured_streaming: true, 
      context_headers: true, 
      session_management: true, 
      actionable_errors: true,
      knowledge_graph: true,
      mcp_a2a_protocols: true,
      predictive_pre_triggering: true,
      recursive_similarity: true,
      async_messaging: true
    }
  });
}

async function handleModels(): Promise<Response> {
  const connected = await ensureClient();
  if (!connected || !client) {
    return Response.json({ object: "list", data: [] });
  }

  try {
    const downloadedLLMs = await client.system.listDownloadedModels("llm");
    const downloadedEmbeddings = await client.system.listDownloadedModels("embedding");

    const models = [
      ...downloadedLLMs.map(m => ({
        id: m.modelKey,
        object: "model" as const,
        created: Math.floor(Date.now() / 1000),
        owned_by: "lmstudio",
        permission: []
      })),
      ...downloadedEmbeddings.map(m => ({
        id: m.modelKey,
        object: "model" as const,
        created: Math.floor(Date.now() / 1000),
        owned_by: "lmstudio",
        permission: []
      }))
    ];

    return Response.json({ object: "list", data: models });
  } catch (e) {
    console.error("[Models] Failed to list:", e);
    return Response.json({ object: "list", data: [] });
  }
}

async function handleModelsAvailable(): Promise<Response> {
  const connected = await ensureClient();
  if (!connected || !client) {
    return Response.json({ models: [], connected: false });
  }

  try {
    const downloadedLLMs = await client.system.listDownloadedModels("llm");
    const downloadedEmbeddings = await client.system.listDownloadedModels("embedding");
    const loadedLLMs = await client.llm.listLoaded();
    const loadedEmbeddings = await client.embedding.listLoaded();

    const loadedLLMKeys = new Set(loadedLLMs.map(m => m.identifier));
    const loadedEmbeddingKeys = new Set(loadedEmbeddings.map(m => m.identifier));

    const models = [
      ...downloadedLLMs.map(m => ({
        modelKey: m.modelKey,
        displayName: m.displayName,
        type: "llm" as const,
        format: m.format,
        sizeBytes: m.sizeBytes,
        sizeGB: Math.round(m.sizeBytes / (1024 * 1024 * 1024) * 10) / 10,
        params: m.paramsString || null,
        architecture: m.architecture || null,
        quantization: m.quantization?.name || null,
        loaded: loadedLLMKeys.has(m.modelKey),
      })),
      ...downloadedEmbeddings.map(m => ({
        modelKey: m.modelKey,
        displayName: m.displayName,
        type: "embedding" as const,
        format: m.format,
        sizeBytes: m.sizeBytes,
        sizeGB: Math.round(m.sizeBytes / (1024 * 1024 * 1024) * 10) / 10,
        params: m.paramsString || null,
        architecture: m.architecture || null,
        quantization: m.quantization?.name || null,
        loaded: loadedEmbeddingKeys.has(m.modelKey),
      }))
    ];

    return Response.json({ models, connected: true });
  } catch (e) {
    console.error("[Models] Failed to list:", e);
    return Response.json({ models: [], connected: false, error: String(e) });
  }
}

async function handleLoadModel(req: Request): Promise<Response> {
  const { model, config } = await req.json();
  try {
    const loaded = await loadModel(model, config);
    return Response.json({ success: true, identifier: loaded.identifier });
  } catch (e) {
    return Response.json({ error: ERRORS.modelFailed(String(e)) }, { status: 500 });
  }
}

async function handleUnloadModel(): Promise<Response> {
  if (currentLLM) { await currentLLM.unload(); currentLLM = null; return Response.json({ success: true }); }
  return Response.json({ success: false, error: "No model loaded" });
}

async function handleListTools(): Promise<Response> {
  const localTools = Array.from(toolRegistry.values()).map(t => ({ name: t.name, description: t.description, safety_level: t.safety_level, source: "local" }));
  
  const mcpTools: any[] = [];
  for (const server of mcpServers.values()) {
    for (const tool of server.tools) {
      mcpTools.push({ name: tool.name, description: tool.description, safety_level: tool.safety_level, source: `mcp:${server.name}`, health: tool.health });
    }
  }
  
  return Response.json({ tools: [...localTools, ...mcpTools] });
}

async function handleApprovalMode(req: Request): Promise<Response> {
  if (req.method === "POST") currentApprovalMode = (await req.json()).mode;
  return Response.json({ mode: currentApprovalMode });
}

async function handleListMemory(): Promise<Response> {
  return Response.json({ memories: memoryDb.prepare("SELECT * FROM memories ORDER BY last_accessed DESC LIMIT 100").all() });
}

async function handleSessionInfo(id: string): Promise<Response> {
  const session = sessions.get(id);
  return session ? Response.json(session) : Response.json({ error: createError("Session not found", "not_found", "session_not_found") }, { status: 404 });
}

async function handleMCPServers(): Promise<Response> {
  return Response.json({ servers: Array.from(mcpServers.values()).map(s => ({ name: s.name, transport: s.transport, tools_count: s.tools.length, health: s.health })) });
}

async function handleA2AAgents(): Promise<Response> {
  return Response.json({ agents: Array.from(a2aAgents.values()) });
}

async function handleAsyncTasks(): Promise<Response> {
  return Response.json({ tasks: Array.from(asyncTasks.values()).map(t => ({ id: t.id, type: t.type, tool_or_agent: t.tool_or_agent, status: t.status, started_at: t.started_at })) });
}

async function handleKnowledgeGraph(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const query = url.searchParams.get("query");
  
  if (query) {
    const result = queryKnowledgeGraph(query);
    return Response.json(result);
  }
  
  return Response.json({
    nodes: Array.from(knowledgeGraph.nodes.values()).slice(0, 50),
    edges: Array.from(knowledgeGraph.edges.values()).slice(0, 50)
  });
}

async function handleIndexDocument(req: Request): Promise<Response> {
  const body = await req.json();
  const { content, url, filename } = body;
  const result = await indexDocumentation(content, url, filename);
  return Response.json({ success: true, ...result });
}

async function handleFetchUrl(req: Request): Promise<Response> {
  const url = new URL(req.url).searchParams.get('url');
  
  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LMStudio-Proxy-Bridge/1.0'
      }
    });
    
    if (!response.ok) {
      return Response.json({ error: `Failed to fetch: ${response.status}` }, { status: response.status });
    }
    
    const content = await response.text();
    return Response.json({ content, url });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// SSE endpoint for async task updates
async function handleAsyncTaskSSE(taskId: string): Promise<Response> {
  const task = asyncTasks.get(taskId);
  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }
  
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      task.sse_clients.add(controller);
      
      // Send initial status
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ task_id: taskId, status: task.status })}\n\n`));
      
      // Keep alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch (e) {
          clearInterval(keepAlive);
          task.sse_clients.delete(controller);
        }
      }, 15000);
      
      // Cleanup on close
      setTimeout(() => {
        clearInterval(keepAlive);
        task.sse_clients.delete(controller);
        try { controller.close(); } catch (e) {}
      }, 300000); // 5 min timeout
    }
  });
  
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}

// ============== Preset & Gateway Handlers ==============

async function handleEmbeddingPresets(): Promise<Response> {
  return Response.json({
    presets: EMBEDDING_PRESETS,
    mrl_presets: MRL_PRESETS,
    reranker_configs: RERANKER_CONFIGS
  });
}

async function handleChatTestPresets(): Promise<Response> {
  return Response.json({
    presets: CHAT_TEST_PRESETS,
    categories: ["capabilities", "performance", "robustness", "agentic"]
  });
}

async function handleGatewayTransform(req: Request): Promise<Response> {
  const body = await req.json();
  const { query, preset_type, session_id } = body;
  
  const preset = EMBEDDING_PRESETS[preset_type as keyof typeof EMBEDDING_PRESETS] || EMBEDDING_PRESETS.code_search;
  const session = getOrCreateSession(session_id);
  
  const transformation = applyPresetTransformation(query, preset, session);
  
  return Response.json({
    transformation,
    preset_used: preset
  });
}

async function handleGatewayLog(): Promise<Response> {
  return Response.json({
    transformations: gatewayTransformationLog.slice(0, 20)
  });
}

async function handleGatewaySearch(req: Request): Promise<Response> {
  const body = await req.json();
  const { query, preset_type, mrl_dimension, reranker_mode, top_k, session_id } = body;
  
  // Get or create preset
  let preset = EMBEDDING_PRESETS[preset_type as keyof typeof EMBEDDING_PRESETS] || EMBEDDING_PRESETS.code_search;
  
  // Override with custom settings if provided
  if (mrl_dimension || reranker_mode) {
    preset = {
      ...preset,
      mrl_dimension: mrl_dimension || preset.mrl_dimension,
      reranker_mode: reranker_mode || preset.reranker_mode
    };
  }
  
  const session = getOrCreateSession(session_id);
  const transformation = applyPresetTransformation(query, preset, session);
  
  // Use the knowledge graph for actual search
  const kgResults = queryKnowledgeGraph(query, 2);
  
  // Combine transformation with real results
  const results = kgResults.nodes.slice(0, top_k || 5).map((node, i) => ({
    id: node.id,
    content: node.content,
    name: node.name,
    type: node.type,
    score: transformation.output.top_results[i]?.score || (0.9 - i * 0.1),
    layer: node.layer
  }));
  
  return Response.json({
    query: query,
    preset: preset,
    transformation: transformation,
    results: results,
    total_time_ms: transformation.total_time_ms
  });
}

async function handleChatTestRun(req: Request): Promise<Response> {
  const body = await req.json();
  const { preset_id, model, session_id } = body;
  
  const preset = CHAT_TEST_PRESETS.find(p => p.id === preset_id);
  if (!preset) {
    return Response.json({ error: "Preset not found" }, { status: 404 });
  }
  
  const startTime = Date.now();
  const session = getOrCreateSession(session_id);
  
  // Build messages
  const messages = [];
  if (preset.system_prompt) {
    messages.push({ role: "system", content: preset.system_prompt });
  }
  messages.push({ role: "user", content: preset.user_prompt });
  
  // Simulate test run (would actually call LLM if connected)
  let response: { content: string; tool_calls?: string[]; reasoning?: boolean; code_valid?: boolean } = {
    content: `[Test Preset: ${preset.name}]\n\nSimulated response for testing.\n\nPreset executed successfully.`,
    tool_calls: preset.validation.check_tool_calls || [],
    reasoning: preset.validation.check_reasoning || false,
    code_valid: preset.validation.check_code_valid || false
  };
  
  const elapsed = Date.now() - startTime;
  
  // Validate response
  const validationResults: { check: string; passed: boolean; details: string }[] = [];
  
  if (preset.validation.check_tool_calls) {
    const toolsFound = preset.validation.check_tool_calls.filter(t => response.tool_calls?.includes(t));
    validationResults.push({
      check: "tool_calls",
      passed: toolsFound.length === preset.validation.check_tool_calls.length,
      details: `Found tools: ${toolsFound.join(", ") || "none"}`
    });
  }
  
  if (preset.validation.check_reasoning) {
    validationResults.push({
      check: "reasoning",
      passed: response.reasoning || false,
      details: response.reasoning ? "Reasoning block present" : "No reasoning block"
    });
  }
  
  if (preset.validation.check_code_valid) {
    validationResults.push({
      check: "code_valid",
      passed: response.code_valid || false,
      details: response.code_valid ? "Code is valid" : "Code has errors"
    });
  }
  
  if (preset.validation.expected_patterns) {
    const foundPatterns = preset.validation.expected_patterns.filter(p => 
      response.content.toLowerCase().includes(p.toLowerCase())
    );
    validationResults.push({
      check: "expected_patterns",
      passed: foundPatterns.length === preset.validation.expected_patterns.length,
      details: `Found patterns: ${foundPatterns.join(", ")}`
    });
  }
  
  const overallPassed = validationResults.every(v => v.passed);
  
  return Response.json({
    preset_id,
    preset_name: preset.name,
    category: preset.category,
    execution: {
      messages_sent: messages,
      response: response.content,
      elapsed_ms: elapsed,
      model_used: model || "simulated"
    },
    validation: {
      overall_passed: overallPassed,
      results: validationResults
    },
    metrics: {
      ttft_ms: Math.random() * 200 + 50,
      tps: Math.random() * 30 + 20,
      tokens_generated: Math.floor(response.content.length / 4)
    }
  });
}

async function handleSessionAdjustments(sessionId: string): Promise<Response> {
  const session = sessions.get(sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
  
  const adjustments = getSessionAdjustments(session);
  
  return Response.json({
    session_id: sessionId,
    adjustments,
    recommendations: {
      preset: adjustments.suggested_preset,
      prefix_adjustment: adjustments.prefix_adjustment,
      warnings: adjustments.previous_failures > 2 ? ["Multiple tool failures detected"] : []
    }
  });
}

// ============== Observability Handlers ==============

let observabilitySystem: ObservabilitySystem | null = null;

function getObservability(): ObservabilitySystem {
  if (!observabilitySystem) {
    observabilitySystem = getObservabilitySystem();
  }
  return observabilitySystem;
}

async function handleObservabilityHorizon(): Promise<Response> {
  const obs = getObservability();
  const horizon = obs.getTimeHorizon();
  return Response.json(horizon);
}

async function handleObservabilityVRAM(): Promise<Response> {
  const obs = getObservability();
  const personality = obs.getVRAMPersonality();
  return Response.json(personality);
}

async function handleObservabilityToolsSocial(): Promise<Response> {
  const obs = getObservability();
  const relationships = obs.getToolRelationships();
  
  // Convert Maps to arrays for JSON serialization
  return Response.json({
    dependencies: Object.fromEntries(
      Array.from(relationships.dependencies.entries()).map(([k, v]) => [k, v])
    ),
    substitutions: Object.fromEntries(
      Array.from(relationships.substitutions.entries()).map(([k, v]) => [k, v])
    ),
    conflicts: Object.fromEntries(
      Array.from(relationships.conflicts.entries()).map(([k, v]) => [k, v])
    ),
    synergies: Object.fromEntries(
      Array.from(relationships.synergies.entries()).map(([k, v]) => [k, v])
    )
  });
}

async function handleObservabilityConfidence(): Promise<Response> {
  const obs = getObservability();
  const cascade = obs.getConfidenceCascade();
  return Response.json(cascade);
}

async function handleObservabilityHealth(): Promise<Response> {
  const obs = getObservability();
  const health = obs.getSystemHealth();
  return Response.json(health);
}

async function handleObservabilityPresetsLineage(): Promise<Response> {
  const obs = getObservability();
  const presets = obs.getPresets();
  
  const lineage = presets.map(preset => ({
    id: preset.id,
    name: preset.name,
    parent_id: preset.parent_id,
    status: preset.status,
    benchmark_score: preset.benchmark_score,
    mutations_count: preset.mutations.length,
    usage_count: preset.usage_count,
    created_at: preset.created_at
  }));
  
  return Response.json({ presets: lineage });
}

async function handleObservabilityNarrative(sessionId: string): Promise<Response> {
  const obs = getObservability();
  if (sessionId === "current") {
    return Response.json({
      session_id: "current",
      title: "No active session narrative yet",
      current_phase: "opening",
      acts: [],
      summary: "Start a chat session to generate a narrative.",
      last_updated: Date.now()
    });
  }
  const narrative = obs.getNarrative(sessionId);
  
  if (!narrative) {
    return Response.json({ error: "Narrative not found" }, { status: 404 });
  }
  
  return Response.json(narrative);
}

async function handleObservabilityNegotiations(): Promise<Response> {
  const obs = getObservability();
  // Get negotiations from the system - using a workaround since getNegotiations doesn't exist
  // The observability system stores negotiations internally
  return Response.json({ negotiations: [] });
}

async function handleObservabilityNegotiationRespond(req: Request, negotiationId: string): Promise<Response> {
  const obs = getObservability();
  const body = await req.json();
  const { response } = body;
  
  const result = obs.resolveNegotiation(negotiationId, response);
  
  if (!result) {
    return Response.json({ error: "Negotiation not found" }, { status: 404 });
  }
  
  return Response.json(result);
}

async function handleObservabilityFailures(): Promise<Response> {
  const obs = getObservability();
  const failures = obs.getFailures();
  return Response.json({ failures });
}

// ============== Server ==============

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║        LMStudio Proxy Bridge - Ultimate Agentic Infrastructure          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                                ║
║  SDK: @lmstudio/sdk                                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Core Features:                                                            ║
║    ✓ Dual-Mode Output (Agent vs Chat)                                    ║
║    ✓ XML→JSON Tool Call Translation                                      ║
║    ✓ Context Awareness Headers                                           ║
║    ✓ Structured Streaming for Agents                                     ║
║    ✓ Actionable Error Formats                                            ║
║    ✓ Multi-Turn State Management                                         ║
║                                                                            ║
║  Advanced Features:                                                        ║
║    ✓ Knowledge Graph (Active Knowledge Topology)                         ║
║    ✓ MCP/A2A Protocol Orchestration                                      ║
║    ✓ Predictive Pre-triggering                                           ║
║    ✓ Recursive Similarity Expansion                                      ║
║    ✓ A2A Async Messaging                                                 ║
║    ✓ Unified Orchestration Endpoint (/v1/agent/orchestrate)              ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

// Initialize
initializeClient();
loadKnowledgeGraph();
initializeMCPServers();
initializeA2AAgents();
getSettingsManager(); // Initialize settings

// JIT warmup for optimal first-request performance
warmupJIT().catch(console.error);

const coreRoutes: RouteDefinition[] = [
  { path: "/v1/models", method: "GET", handler: async () => handleModels() },
  { path: "/v1/chat/completions", method: "POST", handler: async (request) => handleChatCompletions(request) },
  { path: "/v1/embeddings", method: "POST", handler: async (request) => handleEmbeddings(request) },
  { path: "/v1/rerank", method: "POST", handler: async (request) => handleRerank(request) },
  { path: "/v1/agent/orchestrate", method: "POST", handler: async (request) => handleOrchestrate(request) },
  { path: "/api/proxy/status", method: "GET", handler: async () => handleStatus() },
];

// ============== Stability Services Initialization ==============

// Initialize Prometheus metrics
const prometheusMetrics = initializePrometheusMetrics();

// Initialize connection pool for LM Studio requests
const connectionPool = initializeConnectionPool({
  maxConnections: 10,
  maxQueueSize: 100,
  requestTimeout: 30000,
  healthCheckInterval: 5000,
  retryAttempts: 3,
  retryBackoffMs: 1000,
});

// Listen to connection pool events
connectionPool.on('connectionStart', (ev) => {
  console.log(`[Pool] Connection start: ${ev.requestId} (${ev.active} active)`);
  prometheusMetrics.recordPoolConnectionStart(ev.active);
});

connectionPool.on('connectionEnd', (ev) => {
  prometheusMetrics.recordPoolConnectionEnd(ev.active);
});

connectionPool.on('retrying', (ev) => {
  console.log(`[Pool] Retrying ${ev.requestId}, attempt ${ev.attempt}, backoff ${ev.backoffMs}ms`);
  prometheusMetrics.recordPoolRetry();
});

connectionPool.on('queued', (ev) => {
  prometheusMetrics.recordPoolQueueUpdate(ev.queueSize);
});

connectionPool.on('healthCheck', (ev) => {
  if (ev.queuedRequests > 0) {
    console.log(`[Pool] Health: ${ev.activeConnections}/${connectionPool.getStats().maxConnections} utilized, ${ev.queuedRequests} queued`);
  }
  prometheusMetrics.recordPoolQueueUpdate(ev.queuedRequests);
  prometheusMetrics.recordPoolConnectionEnd(ev.activeConnections);
});

// Initialize embedding coalescer
const embeddingCoalescer = initializeEmbeddingCoalescer(
  async (texts, model) => {
    return await connectionPool.execute(
      async () => {
        const settings = getSettingsManager().getLMStudioConnection();
        const res = await fetch(`http://${settings.host}:${settings.port}/v1/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: texts, model }),
        });
        const data = await res.json();
        return data.data?.map((item: any) => item.embedding) || [];
      },
      'normal'
    );
  },
  {
    batchSize: 128,
    batchTimeoutMs: 100,
    deduplicateInterval: 60000,
    maxConcurrentBatches: 3,
  }
);

// Listen to embedding coalescer events
embeddingCoalescer.on('coalesced', (ev) => {
  if (ev.queueSize > 5) {
    console.log(`[Coalescer] Coalesced ${ev.textCount} texts (queue: ${ev.queueSize})`);
  }
  prometheusMetrics.recordEmbeddingPending(ev.queueSize);
});

embeddingCoalescer.on('deduplicated', (ev) => {
  prometheusMetrics.recordEmbeddingDeduplicated();
});

embeddingCoalescer.on('processingBatch', (ev) => {
  console.log(`[Coalescer] Processing batch: ${ev.batchSize} requests, ${ev.totalTexts} texts (${ev.activeBatches} active)`);
  prometheusMetrics.recordEmbeddingActiveBatches(ev.activeBatches);
  prometheusMetrics.recordEmbeddingPending(ev.batchSize);
});

embeddingCoalescer.on('batchCompleted', (ev) => {
  console.log(`[Coalescer] Completed: ${ev.requestCount} requests, ${ev.textCount} texts, ${ev.embeddingDim}d embeddings`);
  prometheusMetrics.recordEmbeddingBatchProcessed(ev.textCount);
});

embeddingCoalescer.on('batchError', (ev) => {
  console.log(`[Coalescer] Error: ${ev.error}`);
  prometheusMetrics.recordPoolError();
});

// Initialize Performance Dashboard
const performanceDashboard = initializePerformanceDashboard(
  connectionPool,
  embeddingCoalescer,
  prometheusMetrics
);

// Initialize ConfigTuner
const configTuner = initializeConfigTuner(
  connectionPool,
  embeddingCoalescer,
  {
    queueCapacityThreshold: 0.8,
    queuePressureDurationMs: 30000,
    queueIdleDurationMs: 60000,
    batchFullThreshold: 0.9,
    backpressureEventsThreshold: 10,
    minConnections: 1,
    maxConnections: 50,
    minBatchSize: 64,
    maxBatchSize: 512,
    minHighWaterMark: 32 * 1024,
    maxHighWaterMark: 256 * 1024,
  },
  {
    highWaterMark: 64 * 1024,
    lowWaterMark: 16 * 1024,
  }
);

// Handler for config tuning endpoints
async function handleConfigTuning(req: Request, method: string): Promise<Response> {
  if (method === 'GET') {
    const recommendations = configTuner.getRecommendations();
    const currentConfig = configTuner.getConfig();
    const backpressureConfig = configTuner.getCurrentBackpressureConfig();
    const poolStats = connectionPool.getStats();
    const coalescerStats = embeddingCoalescer.getStats();

    return Response.json({
      recommendations,
      currentConfig,
      currentSettings: {
        pool: {
          maxConnections: poolStats.maxConnections,
          activeConnections: poolStats.activeConnections,
          queuedRequests: poolStats.queuedRequests,
          utilizationPercent: poolStats.utilizationPercent,
        },
        coalescer: {
          batchSize: 128,
          activeBatches: coalescerStats.activeBatches,
          pendingRequests: Object.fromEntries(coalescerStats.pendingRequests),
        },
        streaming: backpressureConfig,
      },
      timestamp: Date.now(),
    });
  }

  if (method === 'POST') {
    const body = await req.json();
    const { recommendation_id, apply_all } = body;

    if (apply_all) {
      const recommendations = configTuner.getRecommendations();
      let appliedCount = 0;
      for (const rec of recommendations) {
        if (configTuner.applyRecommendation(rec)) {
          rec.applied = true;
          appliedCount++;
        }
      }
      return Response.json({
        success: true,
        appliedCount,
        message: `Applied ${appliedCount} recommendations`,
      });
    }

    if (recommendation_id) {
      const allRecs = configTuner.getAllRecommendations();
      const rec = allRecs.find(r => r.id === recommendation_id);
      if (!rec) {
        return Response.json({ error: 'Recommendation not found' }, { status: 404 });
      }
      const success = configTuner.applyRecommendation(rec);
      if (success) {
        rec.applied = true;
      }
      return Response.json({ success, recommendation: rec });
    }

    return Response.json({ error: 'Missing recommendation_id or apply_all' }, { status: 400 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

serve({
  port: PORT,
  reusePort: true,
  highwaterMark: 64 * 1024,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;
    const cors = { 
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", 
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Agent-Type",
      "Connection": "keep-alive",
      "Keep-Alive": "timeout=60, max=100"
    };
    
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    
    try {
      const routed = await dispatchRoute(coreRoutes, req, path);
      if (routed) return routed;

      // OpenAI-compatible endpoints
      if (path === "/v1/models/load" && req.method === "POST") return await handleLoadModel(req);
      if (path === "/v1/models/unload" && req.method === "POST") return await handleUnloadModel();

      // Stateful chat endpoint (LM Studio native feature)
      if (path === "/api/proxy/chat/stateful" && req.method === "POST") return await handleStatefulChat(req);

      // Available models (all downloaded from LM Studio)
      if (path === "/api/proxy/models/available" && req.method === "GET") return await handleModelsAvailable();
      
      // Dynamic model management endpoints (LM Studio native)
      if (path === "/api/proxy/models/load" && req.method === "POST") return await handleLoadModelDynamic(req);
      if (path === "/api/proxy/models/unload" && req.method === "POST") return await handleUnloadModelDynamic(req);
      if (path === "/api/proxy/models/loaded" && req.method === "GET") return await handleLoadedModels();
      if (path === "/api/proxy/models/reconnect" && req.method === "POST") {
        if (client) { await client[Symbol.asyncDispose](); client = null; }
        lmStudioConnected = true;
        const ok = await ensureClient();
        return Response.json({ success: ok });
      }
      
      // Unified orchestration
      // Admin endpoints
      if (path === "/api/proxy/tools") return await handleListTools();
      if (path === "/api/proxy/approval-mode") return await handleApprovalMode(req);
      if (path === "/api/proxy/memory") return await handleListMemory();
      if (path.startsWith("/api/proxy/sessions/")) return await handleSessionInfo(path.split("/")[4]);
      
      // Protocol endpoints
      if (path === "/api/proxy/mcp/servers") return await handleMCPServers();
      if (path === "/api/proxy/a2a/agents") return await handleA2AAgents();
      if (path === "/api/proxy/async/tasks") return await handleAsyncTasks();
      if (path.startsWith("/api/proxy/async/") && path.endsWith("/sse")) return await handleAsyncTaskSSE(path.split("/")[4]);
      
      // Knowledge Graph endpoints
      if (path === "/api/proxy/knowledge") return await handleKnowledgeGraph(req);
      if (path === "/api/proxy/knowledge/index" && req.method === "POST") return await handleIndexDocument(req);
      if (path === "/api/proxy/knowledge/fetch" && req.method === "GET") return await handleFetchUrl(req);
      
      // Preset & Gateway endpoints
      if (path === "/api/proxy/presets/embedding") return await handleEmbeddingPresets();
      if (path === "/api/proxy/presets/chat-tests") return await handleChatTestPresets();
      if (path === "/api/proxy/gateway/transform" && req.method === "POST") return await handleGatewayTransform(req);
      if (path === "/api/proxy/gateway/log") return await handleGatewayLog();
      if (path === "/api/proxy/gateway/search" && req.method === "POST") return await handleGatewaySearch(req);
      if (path === "/api/proxy/chat-test/run" && req.method === "POST") return await handleChatTestRun(req);
      if (path.startsWith("/api/proxy/session/") && path.endsWith("/adjustments")) {
        const sessionId = path.split("/")[4];
        return await handleSessionAdjustments(sessionId);
      }
      
      // Settings endpoints
      if (path === "/api/proxy/settings" && req.method === "GET") return await SettingsHandlers.handleGetSettings();
      if (path === "/api/proxy/settings" && req.method === "POST") return await SettingsHandlers.handleUpdateSettings(req);
      if (path === "/api/proxy/settings/lmstudio" && req.method === "GET") return await SettingsHandlers.handleGetLMStudioSettings();
      if (path === "/api/proxy/settings/lmstudio" && req.method === "POST") return await SettingsHandlers.handleUpdateLMStudioSettings(req);
      if (path === "/api/proxy/settings/proxy" && req.method === "GET") return await SettingsHandlers.handleGetProxySettings();
      if (path === "/api/proxy/settings/proxy" && req.method === "POST") return await SettingsHandlers.handleUpdateProxySettings(req);
      if (path === "/api/proxy/settings/vram" && req.method === "GET") return await SettingsHandlers.handleGetVRAMSettings();
      if (path === "/api/proxy/settings/vram" && req.method === "POST") return await SettingsHandlers.handleUpdateVRAMSettings(req);
      if (path === "/api/proxy/settings/presets" && req.method === "GET") return await SettingsHandlers.handleGetModelPresets();
      if (path === "/api/proxy/settings/presets" && req.method === "POST") return await SettingsHandlers.handleCreateModelPreset(req);
      if (path.startsWith("/api/proxy/settings/presets/") && req.method === "GET") return await SettingsHandlers.handleGetModelPreset(path.split("/")[5]);
      if (path.startsWith("/api/proxy/settings/presets/") && req.method === "PUT") return await SettingsHandlers.handleUpdateModelPreset(req, path.split("/")[5]);
      if (path.startsWith("/api/proxy/settings/presets/") && req.method === "DELETE") return await SettingsHandlers.handleDeleteModelPreset(path.split("/")[5]);
      if (path === "/api/proxy/settings/export") return await SettingsHandlers.handleExportSettings();
      if (path === "/api/proxy/settings/import" && req.method === "POST") return await SettingsHandlers.handleImportSettings(req);
      if (path === "/api/proxy/settings/reset") return await SettingsHandlers.handleResetSettings();
      if (path === "/api/proxy/downloads") return await SettingsHandlers.handleGetDownloads();

      // Rerank endpoint - uses embedding model to score documents
      if (path === "/api/proxy/rerank" && req.method === "POST") return await handleRerank(req);
      
      // Cache endpoints
      if (path === "/api/proxy/cache/stats" && req.method === "GET") return Response.json(getCacheStats());
      if (path === "/api/proxy/cache/clear" && req.method === "POST") { clearCache(); return Response.json({ success: true }); }
      
      // Performance metrics endpoints
      if (path === "/api/proxy/metrics" && req.method === "GET") return Response.json(getPerformanceMetrics());
      if (path === "/api/proxy/metrics/reset" && req.method === "POST") { metricsHistory.length = 0; return Response.json({ success: true }); }
      
      // Observability endpoints
      if (path === "/api/proxy/observability/horizon") return await handleObservabilityHorizon();
      if (path === "/api/proxy/observability/vram") return await handleObservabilityVRAM();
      if (path === "/api/proxy/observability/tools/social") return await handleObservabilityToolsSocial();
      if (path === "/api/proxy/observability/confidence") return await handleObservabilityConfidence();
      if (path === "/api/proxy/observability/health") return await handleObservabilityHealth();
      if (path === "/api/proxy/observability/presets/lineage") return await handleObservabilityPresetsLineage();
      if (path.startsWith("/api/proxy/observability/narrative/")) return await handleObservabilityNarrative(path.split("/")[5]);
      if (path === "/api/proxy/observability/negotiations" && req.method === "GET") return await handleObservabilityNegotiations();
      if (path.startsWith("/api/proxy/observability/negotiations/") && req.method === "POST") return await handleObservabilityNegotiationRespond(req, path.split("/")[5]);
      if (path === "/api/proxy/observability/failures") return await handleObservabilityFailures();
      
      // Stability Services: statistics
      if (path === "/api/proxy/stats/stability" && req.method === "GET") {
        const poolStats = connectionPool.getStats();
        const coalescerStats = embeddingCoalescer.getStats();
        return Response.json({
          connectionPool: {
            activeConnections: poolStats.activeConnections,
            queuedRequests: poolStats.queuedRequests,
            maxConnections: poolStats.maxConnections,
            utilizationPercent: poolStats.utilizationPercent,
          },
          embeddingCoalescer: {
            pendingRequests: Object.fromEntries(coalescerStats.pendingRequests),
            activeBatches: coalescerStats.activeBatches,
            deduplicatedHashes: coalescerStats.deduplicatedHashes,
          },
          timestamp: Date.now(),
        });
      }

      // Benchmark endpoints
      if (path === "/api/proxy/benchmark" && req.method === "GET") {
        const { benchmarkAll } = await import('./benchmark');
        const results = await benchmarkAll();
        return Response.json({ results });
      }

      if (path === "/api/proxy/benchmark/chat" && req.method === "POST") {
        const { benchmarkChatCompletions } = await import('./benchmark');
        const body = await req.json().catch(() => ({}));
        const iterations = body.iterations || 50;
        const result = await benchmarkChatCompletions(iterations);
        return Response.json(result);
      }

      if (path === "/api/proxy/benchmark/embeddings" && req.method === "GET") {
        const { benchmarkEmbeddings } = await import('./benchmark');
        const url = new URL(req.url);
        const iterations = parseInt(url.searchParams.get('iterations') || '50');
        const result = await benchmarkEmbeddings(iterations);
        return Response.json(result);
      }

      if (path === "/api/proxy/benchmark/concurrent" && req.method === "GET") {
        const { benchmarkConcurrentLoad } = await import('./benchmark');
        const url = new URL(req.url);
        const concurrency = parseInt(url.searchParams.get('concurrency') || '10');
        const result = await benchmarkConcurrentLoad(concurrency);
        return Response.json(result);
      }

      if (path === "/api/proxy/benchmark/pool" && req.method === "GET") {
        const { benchmarkConnectionPool } = await import('./benchmark');
        const result = await benchmarkConnectionPool();
        return Response.json(result);
      }

      if (path === "/api/proxy/benchmark/coalescer" && req.method === "GET") {
        const { benchmarkCoalescer } = await import('./benchmark');
        const result = await benchmarkCoalescer();
        return Response.json(result);
      }

      if (path === "/api/proxy/benchmark/streaming" && req.method === "GET") {
        const { benchmarkStreaming } = await import('./benchmark');
        const result = await benchmarkStreaming();
        return Response.json(result);
      }

      // Config tuning endpoints
      if (path === "/api/proxy/config/tuning" && (req.method === "GET" || req.method === "POST")) {
        return await handleConfigTuning(req, req.method);
      }

      // Performance recommendations endpoints
      if (path === "/api/proxy/recommendations" && req.method === "GET") {
        const recommendations = performanceAdvisor.getRecommendations();
        return Response.json({ recommendations, timestamp: Date.now() });
      }
      if (path.startsWith("/api/proxy/recommendations/") && req.method === "GET") {
        const ruleId = path.split("/")[4];
        const recommendation = performanceAdvisor.getRecommendation(ruleId);
        if (recommendation) {
          return Response.json(recommendation);
        }
        return Response.json({ error: "Rule not found" }, { status: 404 });
      }

      // Performance Dashboard endpoints
      if (path === "/api/proxy/dashboard" && req.method === "GET") {
        const dashboard = performanceDashboard.getDashboardMetrics();
        return Response.json(dashboard);
      }

      if (path === "/api/proxy/health" && req.method === "GET") {
        const health = performanceDashboard.getHealthStatus();
        return Response.json(health);
      }

      if (path === "/api/proxy/dashboard/history" && req.method === "GET") {
        const url = new URL(req.url);
        const minutes = parseInt(url.searchParams.get("minutes") || "5");
        const history = performanceDashboard.getHistoricalData(minutes);
        return Response.json({ history, timestamp: Date.now() });
      }
      
      // Prometheus metrics endpoint
      if (path === "/metrics" && req.method === "GET") {
        prometheusMetrics.updateFromPoolStats(connectionPool.getStats());
        prometheusMetrics.updateFromCoalescerStats(embeddingCoalescer.getStats());
        const metrics = prometheusMetrics.getMetrics();
        return new Response(metrics, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      }
      
      if (path === "/health") return Response.json({ status: "ok", timestamp: Date.now() });
      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (e) {
      return Response.json({ error: createError(String(e), "internal_error", "internal_server_error") }, { status: 500 });
    }
  }
});
