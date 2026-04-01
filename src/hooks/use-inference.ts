// Context Engineering Hook - Optimized for Best Inference
// Uses streaming, caching, and intelligent prompt processing

import { useState, useCallback, useEffect, useRef } from 'react'
import * as api from '@/lib/api'
import type { ModelInfo, CacheStats, PerformanceMetrics, EmbeddingPreset, GatewayTransformation } from '@/lib/types'

interface UseInferenceOptions {
  defaultModel?: string
  enableCaching?: boolean
  enableMetrics?: boolean
}

interface InferenceState {
  isLoading: boolean
  error: string | null
  metrics: PerformanceMetrics | null
  cacheStats: CacheStats | null
}

// Context Engineering - Prompt Optimization
export function optimizePrompt(
  prompt: string,
  options: {
    addContext?: boolean
    expandKeywords?: boolean
    addSystemPrefix?: string
  } = {}
): string {
  let optimized = prompt
  
  // Add system prefix if provided
  if (options.addSystemPrefix) {
    optimized = `${options.addSystemPrefix}\n\n${optimized}`
  }
  
  // Expand common abbreviations for better understanding
  const expansions: Record<string, string> = {
    'btw': 'by the way',
    'idk': 'I do not know',
    'imo': 'in my opinion',
    'imho': 'in my humble opinion',
    'fyi': 'for your information',
    'eg': 'for example',
    'ie': 'that is',
    'etc': 'and so on',
    'vs': 'versus',
    'w/': 'with',
    'w/o': 'without',
  }
  
  for (const [abbr, full] of Object.entries(expansions)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    optimized = optimized.replace(regex, full)
  }
  
  // Normalize whitespace
  optimized = optimized.replace(/\s+/g, ' ').trim()
  
  return optimized
}

// Semantic Chunking - Split prompt into meaningful chunks
export function semanticChunk(text: string, maxChunkSize = 512): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim())
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }
    currentChunk += sentence + '.'
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

// Extract intent from prompt for better routing
export function extractIntent(prompt: string): {
  type: 'code' | 'question' | 'analysis' | 'creative' | 'general'
  complexity: 'simple' | 'moderate' | 'complex'
  requiresReasoning: boolean
} {
  const lower = prompt.toLowerCase()
  
  // Code detection
  if (lower.includes('function') || lower.includes('class') || lower.includes('import') ||
      lower.includes('def ') || lower.includes('const ') || lower.includes('let ') ||
      lower.includes('write code') || lower.includes('implement')) {
    return { type: 'code', complexity: 'complex', requiresReasoning: true }
  }
  
  // Analysis detection
  if (lower.includes('analyze') || lower.includes('compare') || lower.includes('why') ||
      lower.includes('explain') || lower.includes('pros/cons')) {
    return { type: 'analysis', complexity: 'complex', requiresReasoning: true }
  }
  
  // Creative detection
  if (lower.includes('write') || lower.includes('story') || lower.includes('poem') ||
      lower.includes('create') || lower.includes('generate')) {
    return { type: 'creative', complexity: 'moderate', requiresReasoning: false }
  }
  
  // Question detection
  if (lower.startsWith('what') || lower.startsWith('how') || lower.startsWith('why') ||
      lower.startsWith('when') || lower.startsWith('where') || lower.startsWith('who')) {
    return { type: 'question', complexity: 'simple', requiresReasoning: false }
  }
  
  return { type: 'general', complexity: 'simple', requiresReasoning: false }
}

// Main Inference Hook
export function useInference(options: UseInferenceOptions = {}) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [currentModel, setCurrentModel] = useState<string>(options.defaultModel || '')
  const [loadedModels, setLoadedModels] = useState<string[]>([])
  const [state, setState] = useState<InferenceState>({
    isLoading: false,
    error: null,
    metrics: null,
    cacheStats: null,
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Fetch models on mount
  useEffect(() => {
    loadModels()
    loadCacheStats()
    
    // Poll metrics
    const interval = setInterval(loadMetrics, 5000)
    return () => clearInterval(interval)
  }, [])
  
  const loadModels = useCallback(async () => {
    const data = await api.fetchAvailableModels()
    if (data) {
      setModels(data)
      const loaded = data.filter(m => m.loaded).map(m => m.modelKey)
      setLoadedModels(loaded)
      if (!currentModel && loaded.length > 0) {
        setCurrentModel(loaded[0])
      }
    }
  }, [currentModel])
  
  const loadMetrics = useCallback(async () => {
    const [metrics, cacheStats] = await Promise.all([
      api.fetchPerformanceMetrics(),
      api.fetchCacheStats(),
    ])
    setState(prev => ({ ...prev, metrics, cacheStats }))
  }, [])
  
  const loadCacheStats = useCallback(async () => {
    const cacheStats = await api.fetchCacheStats()
    setState(prev => ({ ...prev, cacheStats }))
  }, [])
  
  // Load a model
  const loadModel = useCallback(async (modelKey: string, contextLength = 8192) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await api.loadModel(modelKey, contextLength)
      if (result) {
        setLoadedModels(prev => [...prev, modelKey])
      }
    } catch (e) {
      setState(prev => ({ ...prev, error: String(e) }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])
  
  // Unload a model
  const unloadModel = useCallback(async (instanceId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await api.unloadModel(instanceId)
      if (result) {
        setLoadedModels(prev => prev.filter(id => id !== instanceId))
      }
    } catch (e) {
      setState(prev => ({ ...prev, error: String(e) }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])
  
  // Send chat message with context engineering
  const sendMessage = useCallback(async (
    prompt: string,
    chatHistory: { role: string; content: string }[] = [],
    options: {
      temperature?: number
      maxTokens?: number
      stream?: boolean
      useStateful?: boolean
      previousResponseId?: string
    } = {}
  ) => {
    // Apply context engineering
    const intent = extractIntent(prompt)
    let processedPrompt = prompt
    
    // Adjust temperature based on intent
    const adjustedTemp = options.temperature ?? (intent.requiresReasoning ? 0.8 : 0.7)
    
    // Use stateful chat for multi-turn conversations
    if (options.useStateful) {
      const result = await api.sendStatefulChat(
        currentModel,
        processedPrompt,
        options.previousResponseId
      )
      return result
    }
    
    // Regular chat
    const messages = [
      ...chatHistory,
      { role: 'user', content: processedPrompt }
    ]
    
    const result = await api.sendChatMessage(currentModel, messages, {
      temperature: adjustedTemp,
      max_tokens: options.maxTokens,
      stream: options.stream,
    })
    
    return result
  }, [currentModel])
  
  // Generate embeddings with caching
  const embed = useCallback(async (text: string) => {
    const model = models.find(m => m.type === 'embedding')?.modelKey || 'text-embedding-qwen3-embedding-4b'
    return api.generateEmbedding(model, text)
  }, [models])
  
  // Rerank documents
  const rerank = useCallback(async (query: string, documents: string[], topN = 3) => {
    const model = models.find(m => m.type === 'embedding')?.modelKey || 'qwen3-reranker-0.6b'
    return api.rerankDocuments(model, query, documents, topN)
  }, [models])
  
  // Gateway search with preset
  const gatewaySearch = useCallback(async (
    query: string,
    presetType: string,
    mrlDimension: number,
    rerankerMode: string
  ) => {
    return api.runGatewaySearch(query, presetType, mrlDimension, rerankerMode)
  }, [])
  
  // Clear cache
  const clearCache = useCallback(async () => {
    await api.clearCache()
    loadCacheStats()
  }, [loadCacheStats])
  
  // Orchestrate complex task
  const orchestrate = useCallback(async (
    intent: string,
    tools: string[],
    agents: string[]
  ) => {
    return api.orchestrate(intent, tools, agents)
  }, [])
  
  return {
    // State
    ...state,
    models,
    currentModel,
    loadedModels,
    
    // Actions
    setCurrentModel,
    loadModels,
    loadModel,
    unloadModel,
    sendMessage,
    embed,
    rerank,
    gatewaySearch,
    orchestrate,
    clearCache,
    loadMetrics,
    
    // Context engineering utilities
    optimizePrompt,
    semanticChunk,
    extractIntent,
  }
}

// Embedding Presets Hook
export function useEmbeddingPresets() {
  const [presets, setPresets] = useState<Record<string, EmbeddingPreset>>({})
  const [mrlPresets, setMrlPresets] = useState<Record<string, any>>({})
  const [rerankerConfigs, setRerankerConfigs] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  
  const loadPresets = useCallback(async () => {
    setIsLoading(true)
    const data = await api.fetchEmbeddingPresets()
    if (data) {
      setPresets(data.presets)
      setMrlPresets(data.mrl_presets)
      setRerankerConfigs(data.reranker_configs)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadPresets()
  }, [loadPresets])
  
  const applyPreset = useCallback((query: string, presetKey: string): GatewayTransformation | null => {
    const preset = presets[presetKey]
    if (!preset) return null
    
    // Return transformation config for the query
    return {
      input: {
        raw: query,
        intent: { ...extractIntent(query), confidence: 0.8 },
        context_enrichment: {},
        instruction_prefix: preset.instruction_prefix,
        negative_query: preset.negative_query_template,
        metadata_filters: preset.metadata_filters,
      },
      embedding: {
        model: presetKey,
        dimension: preset.mrl_dimension,
        time_ms: 0,
        instruction_aware: true,
      },
      rerank: {
        mode: preset.reranker_mode,
        model: rerankerConfigs[preset.reranker_mode]?.model || 'default',
        confidence: 0,
        time_ms: 0,
        escalated: false,
      },
      output: {
        results_count: 0,
        top_results: [],
      },
      total_time_ms: 0,
    }
  }, [presets, rerankerConfigs])
  
  return {
    presets,
    mrlPresets,
    rerankerConfigs,
    isLoading,
    reload: loadPresets,
    applyPreset,
  }
}

// Streaming Chat Hook
export function useStreamingChat(model: string) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedContent, setStreamedContent] = useState('')
  const abortRef = useRef<(() => void) | null>(null)
  
  const startStream = useCallback(async (
    messages: { role: string; content: string }[],
    onChunk: (content: string) => void,
    options?: { temperature?: number; maxTokens?: number }
  ) => {
    setIsStreaming(true)
    setStreamedContent('')
    
    try {
      const response = await fetch('/api/proxy/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
          stream: true,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Stream failed')
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) return
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                setStreamedContent(prev => prev + content)
                onChunk(content)
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      setIsStreaming(false)
    }
  }, [model])
  
  const cancelStream = useCallback(() => {
    abortRef.current?.()
    setIsStreaming(false)
  }, [])
  
  return {
    isStreaming,
    streamedContent,
    startStream,
    cancelStream,
  }
}
