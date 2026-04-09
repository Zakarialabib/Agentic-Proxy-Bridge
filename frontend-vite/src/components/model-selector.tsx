import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Download, X, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ModelInfo } from '@/lib/types'
import type { LoadedModelInstance } from '@/hooks/use-models'

export interface ModelSelectorProps {
  selectedModel?: string
  availableModels: ModelInfo[]
  loadedModels: LoadedModelInstance[]
  onLoadModel: (modelId: string) => Promise<void> | void
  onUnloadModel: (modelId: string) => Promise<void> | void
  onModelLoaded?: (modelId: string) => void
  onModelUnloaded?: (modelId: string) => void
  disabled?: boolean
  loadingModel?: string | null
  error?: string | null
}

export function ModelSelector({
  selectedModel,
  availableModels,
  loadedModels,
  onLoadModel,
  onUnloadModel,
  onModelLoaded,
  onModelUnloaded,
  disabled = false,
  loadingModel = null,
  error = null,
}: ModelSelectorProps) {
  const loadedMap = new Map(loadedModels.map((model) => [model.instance_id, model]))
  const isModelLoaded = (modelId: string) =>
    loadedMap.has(modelId) || availableModels.find((m) => m.id === modelId)?.loaded
  const getLoadedModelInfo = (modelId: string) => loadedMap.get(modelId)

  const llmModels = availableModels.filter((m) => !m.id.includes('embedding'))
  const embeddingModels = availableModels.filter((m) => m.id.includes('embedding'))

  const handleLoad = async (modelId: string) => {
    await onLoadModel(modelId)
    if (onModelLoaded) onModelLoaded(modelId)
  }

  const handleUnload = async (modelId: string) => {
    await onUnloadModel(modelId)
    if (onModelUnloaded) onModelUnloaded(modelId)
  }

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
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Badge variant="secondary">Loaded {loadedModels.length}</Badge>
          </h3>
          {loadedModels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No models currently loaded</p>
          ) : (
            <ScrollArea className="h-fit space-y-2">
              {loadedModels.map((model) => (
                <div
                  key={model.instance_id}
                  className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{model.instance_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Loaded in {model.load_time_seconds.toFixed(1)}s â€¢ Type: {model.type}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnload(model.instance_id)}
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
                  <div key={model.id} className="p-2 rounded border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{model.name ?? model.id}</p>
                          {isLoaded && <Badge variant="outline" className="text-xs">Loaded</Badge>}
                          {isSelected && <Badge className="text-xs">Selected</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {model.params || 'Unknown params'} â€¢ {model.sizeGB.toFixed(1)} GB
                        </p>
                        {isLoaded && (
                          <p className="text-xs text-muted-foreground">
                            {getLoadedModelInfo(model.id)?.type || 'loaded'}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isLoaded ? 'destructive' : 'default'}
                        onClick={() => (isLoaded ? handleUnload(model.id) : handleLoad(model.id))}
                        disabled={disabled || loadingModel === model.id}
                      >
                        {loadingModel === model.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isLoaded ? (
                          <X className="h-4 w-4" />
                        ) : (
                          'Load'
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </ScrollArea>
        </div>

        <div className="border-t" />

        <div>
          <h3 className="font-semibold text-sm mb-2">
            Embedding Models ({embeddingModels.length})
          </h3>
          {embeddingModels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No embedding models available</p>
          ) : (
            <ScrollArea className="h-fit space-y-1">
              {embeddingModels.map((model) => (
                <div key={model.id} className="p-2 rounded border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{model.name ?? model.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Embedding â€¢ {model.sizeGB.toFixed(1)} GB
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isModelLoaded(model.id) ? 'destructive' : 'default'}
                      onClick={() =>
                        isModelLoaded(model.id) ? handleUnload(model.id) : handleLoad(model.id)
                      }
                      disabled={disabled || loadingModel === model.id}
                    >
                      {loadingModel === model.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isModelLoaded(model.id) ? (
                        <X className="h-4 w-4" />
                      ) : (
                        'Load'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
