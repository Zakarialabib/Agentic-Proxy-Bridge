

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStatus,
  fetchTools,
  fetchAvailableModels,
  fetchLoadedModels,
  loadModel,
  unloadModel
} from '@/lib/api'
import { getPollingPolicy } from '@/lib/polling-policies'
import type { ProxyStatus, Tool, ModelInfo } from '@/lib/types'

export interface UseSystemStatusDataReturn {
  status: ProxyStatus | undefined
  statusLoading: boolean
  statusError: Error | null
  tools: Tool[] | undefined
  toolsLoading: boolean
  toolsError: Error | null
  availableModels: ModelInfo[] | undefined
  availableModelsLoading: boolean
  availableModelsError: Error | null
  loadedModels: { data: { instance_id: string; type: string; load_time_seconds: number }[]; count: number } | undefined
  loadedModelsLoading: boolean
  loadedModelsError: Error | null
  isLoading: boolean
  hasError: boolean
  // Mutations
  loadModel: {
    mutate: (modelKey: string, contextLength?: number) => void
    isPending: boolean
    error: Error | null
  }
  unloadModel: {
    mutate: (instanceId: string) => void
    isPending: boolean
    error: Error | null
  }
}

export function useSystemStatusData(): UseSystemStatusDataReturn {
  const queryClient = useQueryClient()
  const statusPolicy = getPollingPolicy('systemStatus')
  const toolsPolicy = getPollingPolicy('tools')
  const availableModelsPolicy = getPollingPolicy('availableModels')
  const loadedModelsPolicy = getPollingPolicy('loadedModels')

  const statusQuery = useQuery({
    queryKey: ['system-status'],
    queryFn: fetchStatus,
    ...statusPolicy,
  })

  const toolsQuery = useQuery({
    queryKey: ['tools'],
    queryFn: fetchTools,
    ...toolsPolicy,
  })

  const availableModelsQuery = useQuery({
    queryKey: ['models-available'],
    queryFn: fetchAvailableModels,
    ...availableModelsPolicy,
  })

  const loadedModelsQuery = useQuery({
    queryKey: ['models-loaded'],
    queryFn: fetchLoadedModels,
    ...loadedModelsPolicy,
  })

  const loadModelMutation = useMutation({
    mutationFn: ({ modelKey, contextLength }: { modelKey: string; contextLength?: number }) =>
      loadModel(modelKey, { context_length: contextLength }),
    onSuccess: () => {
      // Invalidate and refetch loaded models
      queryClient.invalidateQueries({ queryKey: ['models-loaded'] })
      queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
  })

  const unloadModelMutation = useMutation({
    mutationFn: (instanceId: string) => unloadModel(instanceId),
    onSuccess: () => {
      // Invalidate and refetch loaded models
      queryClient.invalidateQueries({ queryKey: ['models-loaded'] })
      queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
  })

  return {
    status: statusQuery.data ?? undefined,
    statusLoading: statusQuery.isLoading,
    statusError: statusQuery.error,
    tools: toolsQuery.data ?? undefined,
    toolsLoading: toolsQuery.isLoading,
    toolsError: toolsQuery.error,
    availableModels: availableModelsQuery.data ?? undefined,
    availableModelsLoading: availableModelsQuery.isLoading,
    availableModelsError: availableModelsQuery.error,
    loadedModels: loadedModelsQuery.data ?? undefined,
    loadedModelsLoading: loadedModelsQuery.isLoading,
    loadedModelsError: loadedModelsQuery.error,
    isLoading: statusQuery.isLoading || toolsQuery.isLoading || availableModelsQuery.isLoading || loadedModelsQuery.isLoading,
    hasError: !!(statusQuery.error || toolsQuery.error || availableModelsQuery.error || loadedModelsQuery.error),
    loadModel: {
      mutate: (modelKey: string, contextLength?: number) => loadModelMutation.mutate({ modelKey, contextLength }),
      isPending: loadModelMutation.isPending,
      error: loadModelMutation.error,
    },
    unloadModel: {
      mutate: (instanceId: string) => unloadModelMutation.mutate(instanceId),
      isPending: unloadModelMutation.isPending,
      error: unloadModelMutation.error,
    },
  }
}
