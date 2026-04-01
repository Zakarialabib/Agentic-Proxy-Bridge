'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Download, X, Info, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'

const PROXY_BRIDGE_URL = '/api/proxy'

interface AvailableModel {
  id: string
  object: string
  created: number
  owned_by: string
  permission: string[]
}

interface LoadedModel {
  instance_id: string
  type: 'llm' | 'embedding'
  load_time_seconds: number
  loaded_at: number
}

export interface ModelSelectorProps {
  selectedModel?: string
  onModelLoaded?: (modelId: string) => void
  onModelUnloaded?: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({
  selectedModel,
  onModelLoaded,
  onModelUnloaded,
  disabled = false,
}: ModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [loadedModels, setLoadedModels] = useState<Map<string, LoadedModel>>(new Map())
  const [loading, setLoading] = useState(false)
  const [loadingModel, setLoadingModel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedModel, setExpandedModel] = useState<string | null>(null)

  // Fetch available models on mount
  useEffect(() => {
    fetchAvailableModels()
  }, [])

  // Poll loaded models status every 5 seconds
  useEffect(() => {
    fetchLoadedModels()
    const interval = setInterval(fetchLoadedModels, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch(`${PROXY_BRIDGE_URL}/v1/models`)
      if (!response.ok) throw new Error('Failed to fetch available models')
      const data = await response.json()
      setAvailableModels(data.data || [])
    } catch (err) {
      console.error('[ModelSelector] Error fetching available models:', err)
    }
  }

  const fetchLoadedModels = async () => {
    try {
      const response = await fetch(`${PROXY_BRIDGE_URL}/models/loaded`)
      if (!response.ok) throw new Error('Failed to fetch loaded models')
      const data = await response.json()
      
      const modelMap = new Map()
      data.data?.forEach((model: LoadedModel) => {
        modelMap.set(model.instance_id, model)
      })
      setLoadedModels(modelMap)
    } catch (err) {
      console.error('[ModelSelector] Error fetching loaded models:', err)
    }
  }

  const handleLoadModel = async (modelId: string) => {
    setLoadingModel(modelId)
    setError(null)

    try {
      const response = await fetch(`${PROXY_BRIDGE_URL}/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          context_length: 32768,
          flash_attention: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load model')
      }

      const data = await response.json()
      
      // Update loaded models
      await fetchLoadedModels()
      
      // Notify parent
      if (onModelLoaded) {
        onModelLoaded(data.instance_id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[ModelSelector] Error loading model:', err)
    } finally {
      setLoadingModel(null)
    }
  }

  const handleUnloadModel = async (instanceId: string) => {
    setLoadingModel(instanceId)
    setError(null)

    try {
      const response = await fetch(`${PROXY_BRIDGE_URL}/models/unload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unload model')
      }

      // Update loaded models
      await fetchLoadedModels()
      
      // Notify parent
      if (onModelUnloaded) {
        onModelUnloaded(instanceId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[ModelSelector] Error unloading model:', err)
    } finally {
      setLoadingModel(null)
    }
  }

  const isModelLoaded = (modelId: string) => loadedModels.has(modelId)
  const getLoadedModelInfo = (modelId: string) => loadedModels.get(modelId)

  const llmModels = availableModels.filter((m) => !m.id.includes('embedding'))
  const embeddingModels = availableModels.filter((m) => m.id.includes('embedding'))

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Model Management
        </CardTitle>
        <CardDescription>Load/unload models to manage VRAM</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loaded Models Section */}
        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Badge variant="secondary">Loaded {loadedModels.size}</Badge>
          </h3>
          {loadedModels.size === 0 ? (
            <p className="text-sm text-muted-foreground">No models currently loaded</p>
          ) : (
            <ScrollArea className="h-fit space-y-2">
              {Array.from(loadedModels.values()).map((model) => (
                <div
                  key={model.instance_id}
                  className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{model.instance_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Loaded in {model.load_time_seconds.toFixed(1)}s • Type: {model.type}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnloadModel(model.instance_id)}
                    disabled={disabled || loadingModel === model.instance_id}
                  >
                    {loadingModel === model.instance_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </ScrollArea>
          )}
        </div>

        <div className="border-t" />

        {/* Available Models Section */}
        <div>
          <h3 className="font-semibold text-sm mb-2">
            Available LLM Models ({llmModels.length})
          </h3>
          <ScrollArea className="h-fit space-y-1">
            {llmModels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No LLM models available</p>
            ) : (
              llmModels.map((model) => {
                const isLoaded = isModelLoaded(model.id)
                const isSelected = selectedModel === model.id

                return (
                  <div
                    key={model.id}
                    className="p-2 rounded border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer hover:opacity-80"
                        onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{model.id}</p>
                          {isLoaded && <Badge variant="outline" className="text-xs">Loaded</Badge>}
                          {isSelected && <Badge className="text-xs">Selected</Badge>}
                        </div>
                      </div>
                      {!isLoaded && (
                        <Button
                          size="sm"
                          onClick={() => handleLoadModel(model.id)}
                          disabled={disabled || loadingModel !== null}
                        >
                          {loadingModel === model.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Loading...
                            </>
                          ) : (
                            'Load'
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {expandedModel === model.id && (
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                        <p>ID: {model.id}</p>
                        <p>Type: {model.object}</p>
                        <p>Owner: {model.owned_by}</p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
