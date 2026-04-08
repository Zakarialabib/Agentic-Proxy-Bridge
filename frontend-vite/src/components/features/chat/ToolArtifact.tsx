import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Globe, Calculator, FileText, Database, ChevronDown, ChevronUp, CheckCircle, Minimize2 } from 'lucide-react'

interface ToolArtifactProps {
  toolName: string
  toolContent: string
  isCall: boolean
}

export function ToolArtifact({ toolName, toolContent, isCall }: ToolArtifactProps) {
  const [isOpen, setIsOpen] = useState(!isCall) // Open responses by default, close calls
  
  const isCompressed = toolContent.includes('[COMPRESSED SUMMARY]')

  const getToolConfig = () => {
    switch (toolName) {
      case 'web_search':
        return { icon: <Globe className="w-4 h-4 text-purple-400" />, label: 'Web Search', color: 'border-purple-500/30 bg-purple-500/10' }
      case 'calculate':
        return { icon: <Calculator className="w-4 h-4 text-emerald-400" />, label: 'Calculation', color: 'border-emerald-500/30 bg-emerald-500/10' }
      case 'file_list':
      case 'read_file':
      case 'write_file':
      case 'file_read':
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
            {isCompressed && (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/30">
                <Minimize2 className="w-3 h-3" />
                Summarized
              </span>
            )}
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
