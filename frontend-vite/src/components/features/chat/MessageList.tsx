import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { useEffect, useRef } from 'react'

interface MessageListProps {
  messages: { 
    role: 'user' | 'assistant' | 'system'; 
    content: string; 
    modelUsed?: string;
  }[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isLoading])

  return (
    <ScrollArea ref={scrollRef} className="flex-1 min-h-0 p-4 md:p-6 bg-slate-900/10 overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
            <MessageSquare className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium tracking-wide">Enter the control space to begin orchestration</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-2">
          {messages.map((msg, i) => (
            <MessageBubble 
              key={i} 
              {...msg} 
              isLast={i === messages.length - 1} 
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <MessageBubble 
              role="assistant" 
              content="" 
              isLast={true} 
            />
          )}
        </div>
      )}
    </ScrollArea>
  )
}
