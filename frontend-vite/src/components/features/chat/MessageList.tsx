import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Loader2 } from 'lucide-react'
import { ToolArtifact } from './ToolArtifact'

interface MessageListProps {
  messages: { 
    role: 'user' | 'assistant' | 'system'; 
    content: string; 
    modelUsed?: string;
  }[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  
  // Helper to parse content into text and tool blocks
  const renderContent = (content: string) => {
    // Regex to match <tool_call>...</tool_call> and <tool_response>...</tool_response>
    const parts = content.split(/(<tool_call>[\s\S]*?<\/tool_call>|<tool_response>[\s\S]*?<\/tool_response>)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('<tool_call>')) {
        const innerContent = part.replace(/<\/?tool_call>/g, '').trim();
        let toolName = 'Unknown Tool';
        try {
          const parsed = JSON.parse(innerContent);
          toolName = parsed.name || toolName;
        } catch(e) {}
        
        return <ToolArtifact key={index} toolName={toolName} toolContent={innerContent} isCall={true} />
      }
      if (part.startsWith('<tool_response>')) {
         const innerContent = part.replace(/<\/?tool_response>/g, '').trim();
         let toolName = 'Unknown Tool';
         let actualContent = innerContent;
         try {
           const parsed = JSON.parse(innerContent);
           toolName = parsed.name || toolName;
           actualContent = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content, null, 2);
         } catch(e) {}
         
         return <ToolArtifact key={index} toolName={toolName} toolContent={actualContent} isCall={false} />
      }
      
      // Normal text
      return part.trim() ? <p key={index} className="whitespace-pre-wrap">{part}</p> : null;
    });
  }

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
                {renderContent(msg.content)}
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
