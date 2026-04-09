import { create } from 'zustand'
import { PROXY_BRIDGE_URL } from '@/lib/config'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  modelUsed?: string
  telemetry?: Array<{ event: string, details: string, timestamp: number }>
}

interface ChatState {
  messages: ChatMessage[]
  draftMessage: string
  selectedModel: string | null
  isLoading: boolean
  temperature: number
  topP: number
  minP: number
  repeatPenalty: number
  maxTokens: number
  contextWindow: number
  thinkingMode: boolean
  contextStrategy: 'full' | 'prune' | 'summarize'
  systemPrompt: string

  setModel: (modelId: string | null) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  sendStreamingMessage: (content: string, options?: { stream?: boolean }) => Promise<void>
  setDraftMessage: (message: string) => void
  setParams: (params: Partial<Pick<ChatState, 'temperature' | 'topP' | 'minP' | 'repeatPenalty' | 'maxTokens' | 'contextWindow' | 'thinkingMode' | 'contextStrategy' | 'systemPrompt'>>) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  draftMessage: '',
  selectedModel: null,
  isLoading: false,
  temperature: 0.7,
  topP: 0.9,
  minP: 0.05,
  repeatPenalty: 1.05,
  maxTokens: 2048,
  contextWindow: 4096,
  thinkingMode: false,
  contextStrategy: 'full',
  systemPrompt: '',

  setModel: (modelId) => set({ selectedModel: modelId }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  setDraftMessage: (message) => set({ draftMessage: message }),

  sendStreamingMessage: async (content: string, options?: { stream?: boolean }) => {
    const { selectedModel, temperature, topP, minP, repeatPenalty, maxTokens, contextWindow, thinkingMode, systemPrompt } = get()
    if (!content.trim()) return
    if (!selectedModel) {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role: 'assistant',
            content: 'Please select a model before sending a message.',
            timestamp: Date.now(),
          },
        ],
      }))
      return
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
      modelUsed: selectedModel || undefined,
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }))

    try {
      const messages = [...get().messages.map(m => ({ role: m.role, content: m.content }))]
      
      // Inject system prompt if it exists and there isn't one already at the start
      if (systemPrompt.trim() && (messages.length === 0 || messages[0].role !== 'system')) {
        messages.unshift({ role: 'system', content: systemPrompt.trim() })
      }

      const stream = options?.stream ?? true
      const response = await fetch(`${PROXY_BRIDGE_URL}/v1/agent/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          stream,
          temperature,
          top_p: topP,
          min_p: minP,
          repeat_penalty: repeatPenalty,
          max_tokens: maxTokens,
          contextWindow,
          thinking: thinkingMode,
          context_strategy: get().contextStrategy,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!stream) {
        const data = await response.json()
        const payload = data?.chat_completion ?? data
        const content =
          payload?.choices?.[0]?.message?.content ??
          payload?.choices?.[0]?.delta?.content ??
          payload?.output?.[0]?.content ??
          'No response'
        set((state) => ({
          messages: [
            ...state.messages,
            {
              role: 'assistant',
              content,
              timestamp: Date.now(),
              modelUsed: selectedModel || undefined,
            },
          ],
          isLoading: false,
        }))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantContent = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim() && line.trim() !== 'data: [DONE]')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'telemetry') {
                set((state) => {
                  const msgs = [...state.messages]
                  const lastMsg = msgs[msgs.length - 1]
                  if (lastMsg && lastMsg.role === 'assistant') {
                    if (!lastMsg.telemetry) lastMsg.telemetry = []
                    lastMsg.telemetry.push({
                      event: data.event,
                      details: data.details,
                      timestamp: Date.now()
                    })
                  }
                  return { messages: msgs }
                })
                continue
              }

              const delta = data.choices?.[0]?.delta?.content
              if (delta) {
                assistantContent += delta
                set((state) => {
                  const msgs = [...state.messages]
                  const lastMsg = msgs[msgs.length - 1]
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = assistantContent
                  } else {
                    msgs.push({
                      role: 'assistant',
                      content: assistantContent,
                      timestamp: Date.now(),
                      modelUsed: selectedModel || undefined,
                    })
                  }
                  return { messages: msgs }
                })
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      set((state) => ({
        messages: [...state.messages, {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        }],
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  setParams: (params) => set(params),

  clearMessages: () => set({ messages: [], draftMessage: '' }),

  setLoading: (loading) => set({ isLoading: loading }),
}))
