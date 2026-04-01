'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchKnowledgeNodes,
  queryKnowledge,
  indexDocument,
  fetchUrl
} from '@/lib/api'
import { getPollingPolicy } from '@/lib/polling-policies'
import type { KnowledgeNode } from '@/lib/types'

export interface UseKnowledgeDataOptions {
  query?: string
}

export interface UseKnowledgeDataReturn {
  nodes: KnowledgeNode[] | undefined
  nodesLoading: boolean
  nodesError: Error | null
  queryResult: { nodes: KnowledgeNode[]; paths: string[][] } | undefined
  queryLoading: boolean
  queryError: Error | null
  isLoading: boolean
  hasError: boolean
}

export function useKnowledgeData(options: UseKnowledgeDataOptions = {}): UseKnowledgeDataReturn {
  const { query } = options
  const policy = getPollingPolicy('knowledge')

  const nodesQuery = useQuery({
    queryKey: ['knowledge-nodes'],
    queryFn: fetchKnowledgeNodes,
    ...policy,
  })

  const queryQuery = useQuery({
    queryKey: ['knowledge-query', query],
    queryFn: () => query ? queryKnowledge(query) : Promise.resolve(null),
    enabled: !!query,
    staleTime: 1000 * 60 * 2, // 2 minutes - override for queries
  })

  return {
    nodes: nodesQuery.data ?? undefined,
    nodesLoading: nodesQuery.isLoading,
    nodesError: nodesQuery.error,
    queryResult: queryQuery.data ?? undefined,
    queryLoading: queryQuery.isLoading,
    queryError: queryQuery.error,
    isLoading: nodesQuery.isLoading || queryQuery.isLoading,
    hasError: !!(nodesQuery.error || queryQuery.error),
  }
}