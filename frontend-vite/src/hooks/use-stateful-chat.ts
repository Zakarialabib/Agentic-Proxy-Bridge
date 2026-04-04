

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
  contextWindow?: number
  systemMessage?: string
  tools?: any[]
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

const PROXY_BRIDGE_URL = '' // Direct proxy via /v1

export function useStatefulChat(): UseStatefulChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [responseId, setResponseId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentModel, setCurrentModel] = useState('qwen3.5-4b')
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
        // Build request body for standard chat completion
        const baseMessages = messages.map(m => ({ role: m.role, content: m.content }))
        const requestMessages = options?.systemMessage
          ? [{ role: 'system', content: options.systemMessage }, ...baseMessages, { role: 'user', content: input.trim() }]
          : [...baseMessages, { role: 'user', content: input.trim() }]

        const requestBody = {
          model: options?.model || currentModel,
          messages: requestMessages,
          stream: false,
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
          ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
          ...(options?.contextWindow !== undefined && { contextWindow: options.contextWindow }),
          ...(options?.tools && options.tools.length > 0 && { tools: options.tools }),
        }

        // Call standard chat completions endpoint via proxy
        const response = await fetch(`${PROXY_BRIDGE_URL}/v1/chat/completions`, {
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

        // Extract assistant response from OpenAI format output
        const assistantMessage = data.choices?.[0]?.message?.content || data.output?.[0]?.content || 'No response'
        const newResponseId = data.id || data.response_id || Date.now().toString()

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
