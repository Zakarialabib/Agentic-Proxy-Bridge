'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchEmbeddingPresets,
  fetchChatTestPresets,
  fetchGatewayLog
} from '@/lib/api'
import { getPollingPolicy } from '@/lib/polling-policies'
import type { ChatTestPreset, GatewayTransformation, EmbeddingPreset, MRLPreset, RerankerConfig } from '@/lib/types'

export interface UseGatewayDataReturn {
  embeddingPresets: { presets: Record<string, EmbeddingPreset>; mrl_presets: Record<string, MRLPreset>; reranker_configs: Record<string, RerankerConfig> } | undefined
  embeddingPresetsLoading: boolean
  embeddingPresetsError: Error | null
  chatTestPresets: ChatTestPreset[] | undefined
  chatTestPresetsLoading: boolean
  chatTestPresetsError: Error | null
  gatewayLog: GatewayTransformation[] | undefined
  gatewayLogLoading: boolean
  gatewayLogError: Error | null
  isLoading: boolean
  hasError: boolean
}

export function useGatewayData(): UseGatewayDataReturn {
  const policy = getPollingPolicy('gateway')

  const embeddingPresetsQuery = useQuery({
    queryKey: ['gateway-embedding-presets'],
    queryFn: fetchEmbeddingPresets,
    staleTime: 1000 * 60 * 10, // 10 minutes - override for presets
  })

  const chatTestPresetsQuery = useQuery({
    queryKey: ['gateway-chat-test-presets'],
    queryFn: fetchChatTestPresets,
    staleTime: 1000 * 60 * 5, // 5 minutes - override for presets
  })

  const gatewayLogQuery = useQuery({
    queryKey: ['gateway-log'],
    queryFn: fetchGatewayLog,
    ...policy,
  })

  return {
    embeddingPresets: embeddingPresetsQuery.data ?? undefined,
    embeddingPresetsLoading: embeddingPresetsQuery.isLoading,
    embeddingPresetsError: embeddingPresetsQuery.error,
    chatTestPresets: chatTestPresetsQuery.data ?? undefined,
    chatTestPresetsLoading: chatTestPresetsQuery.isLoading,
    chatTestPresetsError: chatTestPresetsQuery.error,
    gatewayLog: gatewayLogQuery.data ?? undefined,
    gatewayLogLoading: gatewayLogQuery.isLoading,
    gatewayLogError: gatewayLogQuery.error,
    isLoading: embeddingPresetsQuery.isLoading || chatTestPresetsQuery.isLoading || gatewayLogQuery.isLoading,
    hasError: !!(embeddingPresetsQuery.error || chatTestPresetsQuery.error || gatewayLogQuery.error),
  }
}