/**
 * Polling and Caching Policies for Dashboard Data
 * Central configuration for React Query stale times and refetch intervals
 */

export interface PollingPolicy {
  staleTime: number // How long data is considered fresh (ms)
  refetchInterval?: number | false // Background refetch interval (ms)
  refetchOnWindowFocus?: boolean // Refetch when window regains focus
  refetchOnReconnect?: boolean // Refetch when network reconnects
}

export const POLLING_POLICIES = {
  // System status - frequently changing, low latency required
  systemStatus: {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } as PollingPolicy,

  // Tools - relatively stable, but important for orchestration
  tools: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  } as PollingPolicy,

  // Models - available models change infrequently
  availableModels: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  } as PollingPolicy,

  // Loaded models - changes on user action
  loadedModels: {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  } as PollingPolicy,

  // Observability - real-time metrics, frequent updates
  observability: {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false, // Don't refetch on focus for performance
    refetchOnReconnect: true,
  } as PollingPolicy,

  // Knowledge - content changes on user action
  knowledge: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  } as PollingPolicy,

  // Gateway - presets stable, log changes frequently
  gateway: {
    staleTime: 10 * 60 * 1000, // 10 minutes for presets
    refetchInterval: 60 * 1000, // 1 minute for log
    refetchOnWindowFocus: true,
  } as PollingPolicy,

  // MCP
  mcp: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  } as PollingPolicy,
} as const

export type PollingPolicyKey = keyof typeof POLLING_POLICIES

/**
 * Get polling policy for a domain
 */
export function getPollingPolicy(key: PollingPolicyKey): PollingPolicy {
  return POLLING_POLICIES[key]
}

export function applyPollingPolicy(policy: PollingPolicy, pollingEnabled: boolean): PollingPolicy {
  if (pollingEnabled) return policy
  return {
    ...policy,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  }
}

export function gatePolling(policy: PollingPolicy, pollingEnabled: boolean, isActive: boolean): PollingPolicy {
  if (!pollingEnabled || !isActive) {
    return {
      ...policy,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  }
  return policy
}

/**
 * Default policy for unknown domains
 */
export const DEFAULT_POLICY: PollingPolicy = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: true,
}
