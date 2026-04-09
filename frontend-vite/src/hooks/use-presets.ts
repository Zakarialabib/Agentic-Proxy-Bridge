import { useCallback, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PROXY_BRIDGE_URL } from '@/lib/config'
import { fetchModelPresets } from '@/lib/api'
import { useSettingsStore } from '@/stores/useSettingsStore'

export interface AgenticPreset {
  id: string
  name: string
  model_id: string
  params: Record<string, unknown>
  system_prompt?: string
  description?: string
}

export interface UsePresetsResult {
  presets: AgenticPreset[]
  source: 'api' | 'settings' | 'none'
  isLoading: boolean
  error: string | null
  autotune: {
    run: () => Promise<void>
    isPending: boolean
    rationales: string[]
  }
}

async function fetchPresetsPrimary(): Promise<AgenticPreset[] | null> {
  const res = await fetch(`${PROXY_BRIDGE_URL}/api/presets/list`)
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data)) return null
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    model_id: p.model_id,
    params: p.params || {},
    system_prompt: p.system_prompt,
    description: p.description,
  }))
}

async function fetchPresetsFallback(): Promise<AgenticPreset[] | null> {
  const data = await fetchModelPresets()
  if (!data) return null
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    model_id: p.model_key,
    params: {
      temperature: p.temperature,
      top_p: p.top_p,
      repeat_penalty: p.repeat_penalty,
      max_tokens: p.max_tokens,
      context_window: p.context_length,
    },
    system_prompt: p.system_prompt,
    description: p.is_default ? 'Default preset' : undefined,
  }))
}

export function usePresets(): UsePresetsResult {
  const [source, setSource] = useState<'api' | 'settings' | 'none'>('none')
  const [error, setError] = useState<string | null>(null)
  const [rationales, setRationales] = useState<string[]>([])
  const { activeTab } = useSettingsStore()
  const isActive = activeTab === 'chat'

  const query = useQuery({
    queryKey: ['agentic-presets'],
    queryFn: async () => {
      setError(null)
      const primary = await fetchPresetsPrimary()
      if (primary && primary.length > 0) {
        setSource('api')
        return primary
      }
      const fallback = await fetchPresetsFallback()
      if (fallback && fallback.length > 0) {
        setSource('settings')
        return fallback
      }
      setSource('none')
      return []
    },
    enabled: isActive,
  })

  const autotuneMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${PROXY_BRIDGE_URL}/api/presets/autotune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'medium', results: {} }),
      })
      if (!res.ok) throw new Error('Failed to run autotune')
      return res.json()
    },
    onSuccess: (data) => {
      setRationales(Array.isArray(data?.rationales) ? data.rationales : [])
    },
  })

  const runAutotune = useCallback(async () => {
    setRationales([])
    await autotuneMutation.mutateAsync()
  }, [autotuneMutation])

  return {
    presets: query.data ?? [],
    source,
    isLoading: query.isLoading,
    error: error ?? (query.error ? String(query.error) : null),
    autotune: {
      run: runAutotune,
      isPending: autotuneMutation.isPending,
      rationales,
    },
  }
}
