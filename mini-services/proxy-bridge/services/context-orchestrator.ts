/**
 * Context Orchestrator Service
 * Handles context building and retrieval policy decisions
 */

import type {
  ContextOrchestrator,
  ContextBuildInput,
  ContextBuildOutput,
  RetrievalDecision
} from './types'
import { queryKnowledgeGraph } from '../index'

export class ContextOrchestratorImpl implements ContextOrchestrator {
  async buildContext(input: ContextBuildInput): Promise<ContextBuildOutput> {
    // Extract intent from query
    const intent = this.extractIntent(input.query)

    // Decide retrieval strategy
    const retrievalDecision = this.decideRetrieval(input.query, intent)

    // Query knowledge graph
    const docs = await this.queryKnowledge(input.query, retrievalDecision)

    // Build context using existing logic
    const maxContextChars = 6000
    const rankedDocs = docs
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 8)

    const retrievalContext = rankedDocs
      .map((doc: any) => `[${doc.source || 'unknown'}] ${doc.content}`)
      .join('\n\n')

    const budgetedContext = retrievalContext.length > maxContextChars
      ? retrievalContext.slice(0, maxContextChars)
      : retrievalContext

    return {
      documents: rankedDocs,
      scores: rankedDocs.map((d: any) => d.score),
      totalTokens: Math.ceil(budgetedContext.length / 4), // Rough token estimate
      strategy: retrievalDecision.strategy,
      retrievalContext,
      budgetedContext
    } as ContextBuildOutput
  }

  decideRetrieval(query: string, intent?: string): RetrievalDecision {
    // Simple decision logic - can be made more sophisticated
    if (query.includes('code') || query.includes('function')) {
      return { strategy: 'kg_only', hops: 2, topK: 5 }
    } else if (query.includes('search') || query.includes('find')) {
      return { strategy: 'hybrid', hops: 1, topK: 10, rerank: true }
    } else {
      return { strategy: 'kg_only', hops: 1, topK: 8 }
    }
  }

  private extractIntent(query: string): string {
    // Simple intent extraction - can use ML model later
    if (query.includes('how') || query.includes('what')) {
      return 'explanatory'
    } else if (query.includes('code') || query.includes('implement')) {
      return 'technical'
    } else {
      return 'general'
    }
  }

  private async queryKnowledge(query: string, decision: RetrievalDecision): Promise<any[]> {
    try {
      // Use existing knowledge graph query
      const result = await queryKnowledgeGraph(query, decision.hops || 1)
      return result.nodes || []
    } catch (error) {
      console.error('Knowledge query failed:', error)
      return []
    }
  }
}