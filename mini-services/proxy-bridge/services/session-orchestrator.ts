/**
 * Session Orchestrator Service
 * Manages session state and quality signals
 */

import type {
  SessionOrchestrator,
  SessionState,
  QualitySignal
} from './types'

export class SessionOrchestratorImpl implements SessionOrchestrator {
  private sessions: Map<string, SessionState> = new Map()
  private qualitySignals: QualitySignal[] = []

  createSession(agentType: string): SessionState {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: SessionState = {
      sessionId,
      agentType,
      startTime: Date.now(),
      currentStep: 0,
      totalSteps: 0,
      context: {},
      plan: []
    }

    this.sessions.set(sessionId, session)
    return session
  }

  updateSession(sessionId: string, updates: Partial<SessionState>): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      Object.assign(session, updates)
    }
  }

  getSession(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) || null
  }

  recordQualitySignal(signal: QualitySignal): void {
    this.qualitySignals.push(signal)

    // Keep only last 1000 signals
    if (this.qualitySignals.length > 1000) {
      this.qualitySignals = this.qualitySignals.slice(-1000)
    }
  }

  getQualitySignals(sessionId: string): QualitySignal[] {
    return this.qualitySignals.filter(s => s.sessionId === sessionId)
  }

  // Utility methods
  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values()).filter(
      s => (Date.now() - s.startTime) < 24 * 60 * 60 * 1000 // Last 24 hours
    )
  }

  cleanupOldSessions(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const [id, session] of this.sessions) {
      if (session.startTime < cutoff) {
        this.sessions.delete(id)
      }
    }
  }
}