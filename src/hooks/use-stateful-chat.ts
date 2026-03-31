'use client'

import { useState, useCallback, useRef } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  modelUsed?: string
  timestamp?: number
}

export interface UseStatefulChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  store?: boolean
}

export interface UseStatefulChatReturn {
  messages: ChatMessage[]
  responseId: string | null
  isLoading: boolean
  error: string | null
  sendMessage: (input: string, options?: UseStatefulChatOptions) => Promise<void>
  clearHistory: () => void
  setModel: (model: string) => void
  currentModel: string
}

const PROXY_BRIDGE_URL = '/api/proxy'

export function useStatefulChat(): UseStatefulChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [responseId, setResponseId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentModel, setCurrentModel] = useState('qwen3.5-4b-claude-4.6-opus-reasoning-distilled-v2')
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (input: string, options?: UseStatefulChatOptions) => {
      if (!input.trim()) {
        setError('Message cannot be empty')
        return
      }

      // Reset error
      setError(null)
      setIsLoading(true)

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      try {
        // Build request body for stateful chat endpoint
        const requestBody = {
          model: options?.model || currentModel,
          input: input.trim(),
          store: options?.store !== false,
          ...(responseId && { previous_response_id: responseId }),
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
          ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        }

        // Call stateful chat endpoint
        const response = await fetch(`${PROXY_BRIDGE_URL}/chat/stateful`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`)
        }

        const data = await response.json()

        // Extract assistant response from LM Studio output
        const assistantMessage = data.output?.[0]?.content || 'No response'
        const newResponseId = data.response_id

        // Update state: add user message
        setMessages((prev) => [
          ...prev,
          {
            role: 'user',
            content: input.trim(),
            modelUsed: options?.model || currentModel,
            timestamp: Date.now(),
          },
        ])

        // Add assistant message
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: assistantMessage,
            modelUsed: data.model_instance_id || options?.model || currentModel,
            timestamp: Date.now(),
          },
        ])

        // Update response_id for next conversation turn
        setResponseId(newResponseId)
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setError('Request cancelled')
          } else {
            setError(err.message)
            console.error('[useStatefulChat] Error:', err)
          }
        } else {
          setError('An unknown error occurred')
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [responseId, currentModel]
  )

  const clearHistory = useCallback(() => {
    setMessages([])
    setResponseId(null)
    setError(null)
  }, [])

  const setModelCallback = useCallback((model: string) => {
    setCurrentModel(model)
  }, [])

  return {
    messages,
    responseId,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    setModel: setModelCallback,
    currentModel,
  }
}
