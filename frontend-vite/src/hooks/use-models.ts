import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAvailableModels, fetchLoadedModels, loadModel, unloadModel } from '@/lib/api'
import { gatePolling, getPollingPolicy } from '@/lib/polling-policies'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { ModelInfo } from '@/lib/types'

export interface LoadedModelInstance {
  instance_id: string
  type: string
  load_time_seconds: number
}

export interface UseModelsReturn {
  availableModels: ModelInfo[]
  loadedModels: { data: LoadedModelInstance[]; count: number } | undefined
  isLoading: boolean
  error: Error | null
  isPolling: boolean
  refreshModels: () => void
  loadModel: {
    mutateAsync: (modelKey: string, contextLength?: number) => Promise<unknown>
    isPending: boolean
    error: Error | null
  }
  unloadModel: {
    mutateAsync: (instanceId: string) => Promise<unknown>
    isPending: boolean
    error: Error | null
  }
}

export function useModels(): UseModelsReturn {
  const queryClient = useQueryClient()
  const { pollingEnabled, activeTab } = useSettingsStore()
  const isActive = activeTab === 'chat' || activeTab === 'dashboard'

  const availablePolicy = gatePolling(getPollingPolicy('availableModels'), pollingEnabled, isActive)
  const loadedPolicy = gatePolling(getPollingPolicy('loadedModels'), pollingEnabled, isActive)

  const availableModelsQuery = useQuery({
    queryKey: ['models-available'],
    queryFn: fetchAvailableModels,
    enabled: true,
    ...availablePolicy,
  })

  const loadedModelsQuery = useQuery({
    queryKey: ['models-loaded'],
    queryFn: fetchLoadedModels,
    enabled: true,
    ...loadedPolicy,
  })

  const loadModelMutation = useMutation({
    mutationFn: ({ modelKey, contextLength }: { modelKey: string; contextLength?: number }) =>
      loadModel(modelKey, { context_length: contextLength }).then((res) => {
        if (!res) throw new Error('Failed to load model')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models-loaded'] })
      queryClient.invalidateQueries({ queryKey: ['models-available'] })
      queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
  })

  const unloadModelMutation = useMutation({
    mutationFn: (instanceId: string) =>
      unloadModel(instanceId).then((res) => {
        if (!res) throw new Error('Failed to unload model')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models-loaded'] })
      queryClient.invalidateQueries({ queryKey: ['models-available'] })
      queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
  })

  const availableModels = useMemo(() => {
    const models = availableModelsQuery.data ?? []
    const loadedSet = new Set(loadedModelsQuery.data?.data?.map((m) => m.instance_id) ?? [])
    return models.map((model) => ({
      ...model,
      loaded: model.loaded || loadedSet.has(model.modelKey) || loadedSet.has(model.id),
    }))
  }, [availableModelsQuery.data, loadedModelsQuery.data])

  const error =
    (availableModelsQuery.error as Error | null) ||
    (loadedModelsQuery.error as Error | null) ||
    loadModelMutation.error ||
    unloadModelMutation.error ||
    null

  return {
    availableModels,
    loadedModels: loadedModelsQuery.data ?? undefined,
    isLoading:
      availableModelsQuery.isLoading ||
      loadedModelsQuery.isLoading ||
      loadModelMutation.isPending ||
      unloadModelMutation.isPending,
    error,
    isPolling: pollingEnabled,
    refreshModels: () => {
      queryClient.invalidateQueries({ queryKey: ['models-available'] })
      queryClient.invalidateQueries({ queryKey: ['models-loaded'] })
    },
    loadModel: {
      mutateAsync: (modelKey: string, contextLength?: number) =>
        loadModelMutation.mutateAsync({ modelKey, contextLength }),
      isPending: loadModelMutation.isPending,
      error: loadModelMutation.error,
    },
    unloadModel: {
      mutateAsync: (instanceId: string) => unloadModelMutation.mutateAsync(instanceId),
      isPending: unloadModelMutation.isPending,
      error: unloadModelMutation.error,
    },
  }
}
