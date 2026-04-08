# Rich Agentic Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform raw tool calls and responses in the chat into beautiful, interactive, and expandable UI cards.
**Architecture:** Create a `ToolArtifact` component that parses the raw tool content and renders specific UIs based on the tool name (e.g., `web_search` gets a globe icon and search results layout).
**Tech Stack:** React, TailwindCSS, Lucide Icons, existing shadcn/ui components (`Card`, `Collapsible`).

---

### Task 1: Create the ToolArtifact Component

**Files:**
- Create: `/workspace/frontend-vite/src/components/features/chat/ToolArtifact.tsx`

- [ ] **Step 1: Write the ToolArtifact component**

```tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Globe, Calculator, FileText, Database, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'

interface ToolArtifactProps {
  toolName: string
  toolContent: string
  isCall: boolean
}

export function ToolArtifact({ toolName, toolContent, isCall }: ToolArtifactProps) {
  const [isOpen, setIsOpen] = useState(!isCall) // Open responses by default, close calls

  const getToolConfig = () => {
    switch (toolName) {
      case 'web_search':
        return { icon: <Globe className="w-4 h-4 text-purple-400" />, label: 'Web Search', color: 'border-purple-500/30 bg-purple-500/10' }
      case 'calculate':
        return { icon: <Calculator className="w-4 h-4 text-emerald-400" />, label: 'Calculation', color: 'border-emerald-500/30 bg-emerald-500/10' }
      case 'file_list':
      case 'read_file':
      case 'write_file':
        return { icon: <FileText className="w-4 h-4 text-cyan-400" />, label: 'File Operation', color: 'border-cyan-500/30 bg-cyan-500/10' }
      case 'search_knowledge_base':
      case 'query_knowledge_graph':
        return { icon: <Database className="w-4 h-4 text-amber-400" />, label: 'Knowledge Query', color: 'border-amber-500/30 bg-amber-500/10' }
      default:
        return { icon: <CheckCircle className="w-4 h-4 text-slate-400" />, label: toolName, color: 'border-slate-500/30 bg-slate-500/10' }
    }
  }

  const config = getToolConfig()
  
  let parsedContent = toolContent
  try {
    const parsed = JSON.parse(toolContent)
    parsedContent = JSON.stringify(parsed, null, 2)
  } catch (e) {
    // Keep raw content if not JSON
  }

  return (
    <Card className={`my-2 ${config.color} backdrop-blur-sm border transition-all`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-2 pr-3">
          <div className="flex items-center gap-2 px-2">
            {config.icon}
            <span className="text-sm font-medium text-slate-200">
              {isCall ? `Using Tool: ${config.label}` : `Result: ${config.label}`}
            </span>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-700/50">
              {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0 border-t border-slate-700/30 mt-1">
            <pre className="text-xs text-slate-300 font-mono bg-slate-900/50 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-[300px]">
              {parsedContent}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
```

### Task 2: Integrate ToolArtifact into MessageList

**Files:**
- Modify: `/workspace/frontend-vite/src/components/features/chat/MessageList.tsx`

- [ ] **Step 1: Update MessageList to parse and render tool artifacts**

Update the component to extract `<tool_call>` and `<tool_response>` blocks from the message content and render them using the new `ToolArtifact` component. The rest of the message content should render as normal text.

```tsx
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
```
