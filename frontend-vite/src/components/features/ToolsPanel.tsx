

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Wrench, Globe, FileText, Database, Server } from 'lucide-react'
import type { Tool } from '@/lib/types'

interface ToolsPanelProps {
  tools: Tool[]
}

const PYTHON_PROXY_TOOLS = [
  {
    name: 'file_list',
    description: 'Lists all files within a specified local directory. Used by Code Assistant to explore workspaces.',
    icon: <FileText className="w-4 h-4 text-cyan-400" />,
    source: 'python-proxy',
    safety: 'supervised'
  },
  {
    name: 'file_read',
    description: 'Reads the content of a specific file. Used to ingest code or documentation into the context window.',
    icon: <FileText className="w-4 h-4 text-cyan-400" />,
    source: 'python-proxy',
    safety: 'supervised'
  },
  {
    name: 'web_search',
    description: 'Performs a live web search to gather up-to-date information. Used by the Deep Researcher scenario.',
    icon: <Globe className="w-4 h-4 text-purple-400" />,
    source: 'python-proxy',
    safety: 'autonomous'
  },
  {
    name: 'query_knowledge_graph',
    description: 'Queries the internal vectorized knowledge graph for entity relationships and context augmentation.',
    icon: <Database className="w-4 h-4 text-emerald-400" />,
    source: 'python-proxy',
    safety: 'autonomous'
  }
]

export function ToolsPanel({ tools }: ToolsPanelProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Python Proxy Tools
          </CardTitle>
          <CardDescription className="text-slate-400">
            Native tools executing in the Python FastAPI backend layer to augment LM Studio capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {PYTHON_PROXY_TOOLS.map((tool, i) => (
              <div key={i} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {tool.icon}
                    <span className="font-medium text-white">{tool.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-600">
                    {tool.source}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">{tool.description}</p>
                <div className="mt-3">
                  <Badge className={`text-[10px] uppercase tracking-wider ${
                    tool.safety === 'autonomous' ? 'bg-emerald-500/20 text-emerald-400 border-0' : 'bg-amber-500/20 text-amber-400 border-0'
                  }`}>
                    {tool.safety} execution
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-slate-400" />
            External Protocols & MCP
          </CardTitle>
          <CardDescription className="text-slate-400">
            Additional tools discovered via external providers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {tools.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Wrench className="w-12 h-12 mb-2 opacity-20" />
                <p>No external tools currently loaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tools.map((tool, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-white text-sm block mb-1">{tool.name}</span>
                      <p className="text-xs text-slate-400">{tool.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                      {tool.source || 'external'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
