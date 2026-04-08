import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Sparkles, User, Terminal, Activity, RotateCcw, BrainCircuit, Minimize2 } from "lucide-react"
import { useState } from "react"
import { ToolArtifact } from "./ToolArtifact"

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  modelUsed?: string
  isLast?: boolean
  telemetry?: Array<{ event: string, details: string, timestamp: number }>
}

export function MessageBubble({ role, content, modelUsed, isLast, telemetry }: MessageBubbleProps) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(true)

  // Parse reasoning/thought tags
  const parseContent = (text: string) => {
    const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/);
    const reasoningMatch = text.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
    
    const thought = thoughtMatch?.[1] || reasoningMatch?.[1] || thinkingMatch?.[1];
    let mainContent = text;
    
    if (thoughtMatch) mainContent = mainContent.replace(thoughtMatch[0], '');
    if (reasoningMatch) mainContent = mainContent.replace(reasoningMatch[0], '');
    if (thinkingMatch) mainContent = mainContent.replace(thinkingMatch[0], '');

    return { thought, mainContent: mainContent.trim() };
  }

  const { thought, mainContent } = parseContent(content);

  const renderToolBlocks = (text: string) => {
    const parts = text.split(/(<tool_call>[\s\S]*?<\/tool_call>|<tool_response>[\s\S]*?<\/tool_response>)/g);
    
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
      
      return part.trim() ? <div key={index} className="whitespace-pre-wrap leading-relaxed">{part}</div> : null;
    });
  }

  return (
    <div className={cn(
      "flex w-full flex-col gap-2 mb-6 group transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
      role === 'user' ? "items-end" : "items-start"
    )}>
      <div className={cn(
        "flex items-center gap-2 mb-1 px-1",
        role === 'user' ? "flex-row-reverse" : "flex-row"
      )}>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
          role === 'assistant' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]" :
          role === 'user' ? "bg-slate-700 text-slate-300 border border-slate-600" :
          "bg-amber-500/20 text-amber-500"
        )}>
          {role === 'assistant' ? <Sparkles className="w-3.5 h-3.5" /> : 
           role === 'user' ? <User className="w-3.5 h-3.5" /> : 
           <Terminal className="w-3.5 h-3.5" />}
        </div>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          {role}
        </span>
        {modelUsed && (
          <Badge variant="outline" className="text-[9px] h-4 bg-slate-800/50 border-slate-700 text-slate-400 font-mono">
            {modelUsed}
          </Badge>
        )}
      </div>

      <div className={cn(
        "relative max-w-[90%] md:max-w-[80%] rounded-2xl p-4 transition-all duration-200",
        role === 'user' 
          ? "bg-slate-800 text-slate-100 border border-slate-700/50 rounded-tr-none shadow-sm" 
          : "bg-slate-800/40 backdrop-blur-md text-slate-200 border border-slate-700 shadow-md rounded-tl-none",
        isLast && role === 'assistant' && "border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
      )}>
        {/* Reasoning Block */}
        {thought && (
          <Collapsible open={isReasoningOpen} onOpenChange={setIsReasoningOpen} className="mb-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 text-xs font-medium text-purple-400 cursor-pointer hover:text-purple-300 transition-colors bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                <div className="flex-1 flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  <span>Mental Model / Chain of Thought</span>
                </div>
                {isReasoningOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 text-xs text-slate-400 italic bg-slate-900/30 p-3 rounded-lg border-l-2 border-purple-500/30 font-serif leading-relaxed">
                {thought}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Telemetry Block */}
        {telemetry && telemetry.length > 0 && (
          <div className="mb-4 space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Activity className="w-3 h-3" /> Agentic Telemetry
            </div>
            {telemetry.map((t, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                {t.event === 'mode_switch' && <BrainCircuit className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />}
                {t.event === 'rollback' && <RotateCcw className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />}
                {t.event === 'compression' && <Minimize2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />}
                {t.event === 'breadcrumb' && <Terminal className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />}
                <span className={cn(
                  "flex-1",
                  t.event === 'rollback' ? "text-amber-300" :
                  t.event === 'mode_switch' ? "text-cyan-300" :
                  t.event === 'compression' ? "text-emerald-300" :
                  "text-slate-300"
                )}>{t.details}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-[14px] scroll-mt-20">
          {renderToolBlocks(mainContent)}
        </div>
        
        {/* Indicators for stream progress */}
        {isLast && role === 'assistant' && !mainContent && (
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-75"></span>
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-150"></span>
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-300"></span>
          </div>
        )}
      </div>
    </div>
  )
}
