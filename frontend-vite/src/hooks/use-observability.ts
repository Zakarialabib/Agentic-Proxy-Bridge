

import { useQuery } from '@tanstack/react-query'
import {
  fetchObservabilityHorizon,
  fetchObservabilityVRAM,
  fetchObservabilityHealth,
  fetchObservabilityConfidence,
  fetchObservabilityPresetsLineage,
  fetchObservabilityNarrative,
  fetchObservabilityNegotiations,
  fetchObservabilityFailures
} from '@/lib/api'
import { getPollingPolicy } from '@/lib/polling-policies'
import type {
  ThreeTimeHorizon,
  VRAMTetrisBlock,
  HealthOrganism,
  ConfidencePoint,
  PresetNode,
  SessionNarrative,
  Negotiation,
  FailureRecord
} from '@/lib/types'

export interface UseObservabilityDataOptions {
  sessionId?: string
}

export interface UseObservabilityDataReturn {
  horizon: ThreeTimeHorizon | undefined
  horizonLoading: boolean
  horizonError: Error | null
  vram: VRAMTetrisBlock[] | undefined
  vramLoading: boolean
  vramError: Error | null
  health: HealthOrganism | undefined
  healthLoading: boolean
  healthError: Error | null
  confidence: ConfidencePoint[] | undefined
  confidenceLoading: boolean
  confidenceError: Error | null
  presetsLineage: PresetNode[] | undefined
  presetsLineageLoading: boolean
  presetsLineageError: Error | null
  narrative: SessionNarrative | undefined
  narrativeLoading: boolean
  narrativeError: Error | null
  negotiations: Negotiation[] | undefined
  negotiationsLoading: boolean
  negotiationsError: Error | null
  failures: FailureRecord[] | undefined
  failuresLoading: boolean
  failuresError: Error | null
  isLoading: boolean
  hasError: boolean
}

export function useObservabilityData(options: UseObservabilityDataOptions = {}): UseObservabilityDataReturn {
  const { sessionId } = options
  const policy = getPollingPolicy('observability')

  const horizonQuery = useQuery({
    queryKey: ['observability-horizon'],
    queryFn: fetchObservabilityHorizon,
    ...policy,
  })

  const vramQuery = useQuery({
    queryKey: ['observability-vram'],
    queryFn: fetchObservabilityVRAM,
    ...policy,
  })

  const healthQuery = useQuery({
    queryKey: ['observability-health'],
    queryFn: fetchObservabilityHealth,
    ...policy,
  })

  const confidenceQuery = useQuery({
    queryKey: ['observability-confidence'],
    queryFn: fetchObservabilityConfidence,
    ...policy,
  })

  const presetsLineageQuery = useQuery({
    queryKey: ['observability-presets-lineage'],
    queryFn: fetchObservabilityPresetsLineage,
    staleTime: 1000 * 60 * 5, // 5 minutes - override for lineage
  })

  const narrativeQuery = useQuery({
    queryKey: ['observability-narrative', sessionId],
    queryFn: () => sessionId ? fetchObservabilityNarrative(sessionId) : Promise.resolve(null),
    enabled: !!sessionId,
    ...policy,
  })

  const negotiationsQuery = useQuery({
    queryKey: ['observability-negotiations'],
    queryFn: fetchObservabilityNegotiations,
    ...policy,
  })

  const failuresQuery = useQuery({
    queryKey: ['observability-failures'],
    queryFn: fetchObservabilityFailures,
    ...policy,
  })

  return {
    horizon: horizonQuery.data ?? undefined,
    horizonLoading: horizonQuery.isLoading,
    horizonError: horizonQuery.error,
    vram: vramQuery.data ?? undefined,
    vramLoading: vramQuery.isLoading,
    vramError: vramQuery.error,
    health: healthQuery.data ?? undefined,
    healthLoading: healthQuery.isLoading,
    healthError: healthQuery.error,
    confidence: confidenceQuery.data ?? undefined,
    confidenceLoading: confidenceQuery.isLoading,
    confidenceError: confidenceQuery.error,
    presetsLineage: presetsLineageQuery.data ?? undefined,
    presetsLineageLoading: presetsLineageQuery.isLoading,
    presetsLineageError: presetsLineageQuery.error,
    narrative: narrativeQuery.data ?? undefined,
    narrativeLoading: narrativeQuery.isLoading,
    narrativeError: narrativeQuery.error,
    negotiations: negotiationsQuery.data ?? undefined,
    negotiationsLoading: negotiationsQuery.isLoading,
    negotiationsError: negotiationsQuery.error,
    failures: failuresQuery.data ?? undefined,
    failuresLoading: failuresQuery.isLoading,
    failuresError: failuresQuery.error,
    isLoading: horizonQuery.isLoading || vramQuery.isLoading || healthQuery.isLoading ||
               confidenceQuery.isLoading || presetsLineageQuery.isLoading || narrativeQuery.isLoading ||
               negotiationsQuery.isLoading || failuresQuery.isLoading,
    hasError: !!(horizonQuery.error || vramQuery.error || healthQuery.error || confidenceQuery.error ||
                  presetsLineageQuery.error || narrativeQuery.error || negotiationsQuery.error || failuresQuery.error),
  }
}
