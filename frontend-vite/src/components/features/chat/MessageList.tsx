import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Loader2 } from 'lucide-react'

interface MessageListProps {
  messages: { 
    role: 'user' | 'assistant' | 'system'; 
    content: string; 
    modelUsed?: string;
    reasoning?: unknown;
    toolCalls?: unknown;
    toolResults?: unknown;
    contextSources?: unknown;
  }[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <ScrollArea className="flex-1 p-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <MessageSquare className="w-12 h-12 mb-2" />
          <p>Start a conversation to test the proxy</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                    : 'bg-slate-700/50 text-white border border-slate-600'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.modelUsed && (
                  <div className="mt-2 text-xs opacity-70">
                    <span>Model: {msg.modelUsed}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              </div>
            </div>
          )}
        </div>
      )}
    </ScrollArea>
  )
}
