/**
 * Orchestration Services Index
 * Exports all service implementations
 */

export { ContextOrchestratorImpl } from './context-orchestrator'
export { ProtocolRouterImpl } from './protocol-router'
export { SessionOrchestratorImpl } from './session-orchestrator'
export { KnowledgeIntegratorImpl } from './knowledge-integrator'
export { PreTriggeringEngineImpl } from './pre-triggering-engine'
export { PerformanceAdvisor, getPerformanceAdvisor, initializePerformanceAdvisor } from './performance-advisor'
export { IntentPipeline, intentPipeline } from './intent-pipeline'
export type { IntentAnalysis } from './intent-pipeline'

export type {
  ContextOrchestrator,
  ProtocolRouter,
  SessionOrchestrator,
  KnowledgeIntegrator,
  PreTriggeringEngine
} from './types'

export type { Priority, Rule, MetricsSnapshot, Recommendation } from './performance-advisor'