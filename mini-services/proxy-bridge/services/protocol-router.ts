/**
 * Protocol Router Service
 * Handles routing decisions between MCP, A2A, and Local protocols
 */

import type {
  ProtocolRouter,
  RoutingDecision,
  ProtocolHealth
} from './types'

export class ProtocolRouterImpl implements ProtocolRouter {
  private healthStatus: Map<string, ProtocolHealth> = new Map()

  constructor() {
    // Initialize health status
    this.healthStatus.set('mcp', { protocol: 'mcp', healthy: true, lastCheck: Date.now(), errorCount: 0 })
    this.healthStatus.set('a2a', { protocol: 'a2a', healthy: true, lastCheck: Date.now(), errorCount: 0 })
    this.healthStatus.set('local', { protocol: 'local', healthy: true, lastCheck: Date.now(), errorCount: 0 })
  }

  async route(toolName: string, estimatedMs: number, constraints?: any): Promise<RoutingDecision> {
    // Decision logic based on tool name and estimated duration
    const protocol = this.selectProtocol(toolName, estimatedMs, constraints)
    const tools = [toolName]
    const agents: string[] = []

    // For async operations, prefer A2A
    const async = estimatedMs > 5000

    if (protocol === 'a2a') {
      agents.push('default-agent')
    }

    return {
      protocol,
      tools,
      agents,
      reason: `Selected ${protocol} for ${toolName} (${estimatedMs}ms estimated)`,
      async,
      estimatedDuration: estimatedMs
    }
  }

  reportHealth(protocol: string, healthy: boolean): void {
    const current = this.healthStatus.get(protocol)
    if (current) {
      current.healthy = healthy
      current.lastCheck = Date.now()
      if (!healthy) {
        current.errorCount++
      }
    }
  }

  getHealth(): ProtocolHealth[] {
    return Array.from(this.healthStatus.values())
  }

  private selectProtocol(toolName: string, estimatedMs: number, constraints?: any): 'mcp' | 'a2a' | 'local' {
    // Check health first
    const mcpHealth = this.healthStatus.get('mcp')
    const a2aHealth = this.healthStatus.get('a2a')

    // For long-running tasks, prefer A2A if healthy
    if (estimatedMs > 10000 && a2aHealth?.healthy) {
      return 'a2a'
    }

    // For tool-specific routing
    if (toolName.includes('web') || toolName.includes('search')) {
      return mcpHealth?.healthy ? 'mcp' : 'local'
    }

    if (toolName.includes('agent') || toolName.includes('async')) {
      return a2aHealth?.healthy ? 'a2a' : 'local'
    }

    // Default to MCP if healthy, otherwise local
    return mcpHealth?.healthy ? 'mcp' : 'local'
  }
}