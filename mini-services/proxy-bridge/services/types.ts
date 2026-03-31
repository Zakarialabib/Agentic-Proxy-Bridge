/**
 * Orchestration Service Interfaces
 * Defines contracts for modular orchestration components
 */

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
  toolCalls?: any[]
  toolResults?: any[]
}

export interface ContextBuildInput {
  query: string
  intent?: string
  sessionId?: string
  history?: any[]
}

export interface ContextBuildOutput {
  documents: any[]
  scores: number[]
  totalTokens: number
  strategy: string
}

export interface RetrievalDecision {
  strategy: 'kg_only' | 'embedding_only' | 'hybrid'
  hops?: number
  topK?: number
  rerank?: boolean
}

export interface RoutingDecision {
  protocol: 'mcp' | 'a2a' | 'local'
  tools: string[]
  agents: string[]
  reason: string
  async: boolean
  estimatedDuration?: number
}

export interface ProtocolHealth {
  protocol: string
  healthy: boolean
  lastCheck: number
  errorCount: number
}

export interface SessionState {
  sessionId: string
  agentType: string
  startTime: number
  currentStep: number
  totalSteps: number
  context: any
  plan: any[]
}

export interface QualitySignal {
  sessionId: string
  metric: string
  value: number
  timestamp: number
}

export interface PreTriggerRecommendation {
  tools: string[]
  confidence: number
  reason: string
}

// Service Interfaces

export interface ContextOrchestrator {
  buildContext(input: ContextBuildInput): Promise<ContextBuildOutput>
  decideRetrieval(query: string, intent?: string): RetrievalDecision
}

export interface ProtocolRouter {
  route(toolName: string, estimatedMs: number, constraints?: any): Promise<RoutingDecision>
  reportHealth(protocol: string, healthy: boolean): void
  getHealth(): ProtocolHealth[]
}

export interface SessionOrchestrator {
  createSession(agentType: string): SessionState
  updateSession(sessionId: string, updates: Partial<SessionState>): void
  getSession(sessionId: string): SessionState | null
  recordQualitySignal(signal: QualitySignal): void
  getQualitySignals(sessionId: string): QualitySignal[]
}

export interface KnowledgeIntegrator {
  query(query: string, strategy: RetrievalDecision): Promise<any[]>
  expandConcepts(nodes: any[], depth: number): Promise<any[]>
  indexDocument(content: string, source: string): Promise<{ success: boolean; docId: string }>
}

export interface PreTriggeringEngine {
  analyzeContext(messages: Message[]): Promise<PreTriggerRecommendation>
  prewarmTools(toolNames: string[]): Promise<void>
  getPrewarmStatus(): { tool: string; ready: boolean }[]
}