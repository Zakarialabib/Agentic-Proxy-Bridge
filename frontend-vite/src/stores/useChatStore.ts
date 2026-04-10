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
  enabledTools: string[]
  orchestrationMode: 'adaptive' | 'mcp_only' | 'a2a_only' | 'local_only'
  requireApproval: boolean
  maxSteps: number
  toolBudget: number
  availableTools: any[]

  setModel: (modelId: string | null) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  sendStreamingMessage: (content: string, options?: { stream?: boolean }) => Promise<void>
  setDraftMessage: (message: string) => void
  setParams: (params: Partial<Pick<ChatState, 'temperature' | 'topP' | 'minP' | 'repeatPenalty' | 'maxTokens' | 'contextWindow' | 'thinkingMode' | 'contextStrategy' | 'systemPrompt' | 'enabledTools' | 'orchestrationMode' | 'requireApproval' | 'maxSteps' | 'toolBudget'>>) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  fetchTools: () => Promise<void>
  toggleTool: (toolName: string) => void
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
  maxTokens: 8192,
  contextWindow: 8192,
  thinkingMode: false,
  contextStrategy: 'full',
  systemPrompt: '',
  enabledTools: ['web_search', 'get_current_time', 'calculate', 'read_file', 'file_list'],
  orchestrationMode: 'adaptive',
  requireApproval: false,
  maxSteps: 5,
  toolBudget: 10,
  availableTools: [],

  setModel: (modelId) => set({ selectedModel: modelId }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  setDraftMessage: (message) => set({ draftMessage: message }),

  fetchTools: async () => {
    try {
      const resp = await fetch(`${PROXY_BRIDGE_URL}/api/tools/list`)
      if (resp.ok) {
        const data = await resp.json()
        set({ availableTools: data.tools || [] })
      }
    } catch (e) {
      console.error('Failed to fetch tools:', e)
    }
  },

  toggleTool: (toolName: string) => set((state) => {
    const enabled = state.enabledTools.includes(toolName)
    if (enabled) {
      return { enabledTools: state.enabledTools.filter(t => t !== toolName) }
    } else {
      return { enabledTools: [...state.enabledTools, toolName] }
    }
  }),

  sendStreamingMessage: async (content: string, options?: { stream?: boolean }) => {
    const { 
      selectedModel, temperature, topP, minP, repeatPenalty, maxTokens, contextWindow, 
      thinkingMode, systemPrompt, enabledTools, orchestrationMode, maxSteps, toolBudget, 
      availableTools 
    } = get()
    
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

      // Filter tools to only send enabled ones
      const toolsToSend = availableTools
        .filter(t => enabledTools.includes(t.function.name))
        .map(t => t)

      const stream = options?.stream ?? true
      const requestBody: any = {
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
        tools: toolsToSend,
        orchestration_mode: orchestrationMode,
        max_steps: maxSteps,
        tool_budget: toolBudget,
        require_approval: get().requireApproval,
      }
      
      const response = await fetch(`${PROXY_BRIDGE_URL}/v1/agent/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
              const toolCalls = data.choices?.[0]?.delta?.tool_calls
              
              if (delta || toolCalls) {
                if (delta) {
                  assistantContent += delta
                }
                
                if (toolCalls && toolCalls.length > 0) {
                  for (const tc of toolCalls) {
                    if (tc.function && tc.function.arguments) {
                      // If it's the start of a tool call (has name), inject the opening tag
                      if (tc.function.name) {
                        assistantContent += `\n<tool_call>\n{"name": "${tc.function.name}", "arguments": `
                      }
                      if (tc.function.arguments !== undefined) assistantContent += tc.function.arguments
                    }
                  }
                  // We don't close the tag immediately because arguments stream in chunks.
                  // The proxy handles closing the tag or the next message starts.
                  // Actually, the proxy streams the raw JSON string in arguments.
                  // Wait, if the proxy streams raw JSON content, the frontend needs to know when it ends.
                  // The proxy currently streams the raw content inside `<tool_call>` via `tc.function.arguments`.
                  // The proxy itself intercepts `<tool_call>` and parses it, so `content` is the JSON.
                }

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
