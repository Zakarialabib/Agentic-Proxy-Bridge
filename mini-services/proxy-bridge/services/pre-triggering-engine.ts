/**
 * Pre-Triggering Engine Service
 * Analyzes context and pre-warms tools for better performance
 */

import type {
  PreTriggeringEngine,
  PreTriggerRecommendation,
  Message
} from './types'

export class PreTriggeringEngineImpl implements PreTriggeringEngine {
  private prewarmedTools: Set<string> = new Set()
  private prewarmTimestamps: Map<string, number> = new Map()

  async analyzeContext(messages: Message[]): Promise<PreTriggerRecommendation> {
    // Analyze recent messages for tool usage patterns
    const recentMessages = messages.slice(-10) // Last 10 messages
    const toolMentions = this.extractToolMentions(recentMessages)
    const intent = this.detectIntent(recentMessages)

    // Recommend tools based on context
    const recommendedTools = this.recommendTools(toolMentions, intent)

    return {
      tools: recommendedTools,
      confidence: this.calculateConfidence(toolMentions, intent),
      reason: `Detected ${intent} intent with ${toolMentions.length} tool mentions`
    }
  }

  async prewarmTools(toolNames: string[]): Promise<void> {
    for (const tool of toolNames) {
      this.prewarmedTools.add(tool)
      this.prewarmTimestamps.set(tool, Date.now())
    }

    // Simulate pre-warming delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  getPrewarmStatus(): { tool: string; ready: boolean }[] {
    const now = Date.now()
    const timeout = 5 * 60 * 1000 // 5 minutes

    return Array.from(this.prewarmedTools).map(tool => {
      const timestamp = this.prewarmTimestamps.get(tool) || 0
      const ready = (now - timestamp) < timeout
      return { tool, ready }
    })
  }

  private extractToolMentions(messages: any[]): string[] {
    const tools: string[] = []
    const toolPatterns = [
      /use (\w+)/gi,
      /call (\w+)/gi,
      /run (\w+)/gi,
      /execute (\w+)/gi
    ]

    for (const message of messages) {
      const content = message.content || ''
      for (const pattern of toolPatterns) {
        const matches = content.match(pattern)
        if (matches) {
          tools.push(...matches.map((m: string) => m.split(' ')[1]))
        }
      }
    }

    return [...new Set(tools)]
  }

  private detectIntent(messages: Message[]): string {
    const content = messages.map(m => m.content || '').join(' ').toLowerCase()

    if (content.includes('code') || content.includes('implement')) {
      return 'coding'
    } else if (content.includes('search') || content.includes('find')) {
      return 'search'
    } else if (content.includes('analyze') || content.includes('review')) {
      return 'analysis'
    } else {
      return 'general'
    }
  }

  private recommendTools(toolMentions: string[], intent: string): string[] {
    const recommendations = new Set(toolMentions)

    // Add intent-based recommendations
    switch (intent) {
      case 'coding':
        recommendations.add('run_terminal')
        recommendations.add('read_file')
        break
      case 'search':
        recommendations.add('web_search')
        recommendations.add('grep_search')
        break
      case 'analysis':
        recommendations.add('analyze_code')
        recommendations.add('run_tests')
        break
    }

    return Array.from(recommendations)
  }

  private calculateConfidence(toolMentions: string[], intent: string): number {
    let confidence = 0.5 // Base confidence

    if (toolMentions.length > 0) {
      confidence += 0.3
    }

    if (intent !== 'general') {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }
}