

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Search, BookOpen, Database, Upload, Globe, Loader2 } from 'lucide-react'
import type { ProxyStatus, KnowledgeNode } from '@/lib/types'

interface KnowledgePanelProps {
  status: ProxyStatus | null
  knowledgeQuery: string
  onQueryChange: (value: string) => void
  onQuerySubmit: () => void
  knowledgeResults: { nodes: KnowledgeNode[]; paths: string[][] } | null
  indexDocument: string
  onIndexDocumentChange: (value: string) => void
  indexUrl: string
  onIndexUrlChange: (value: string) => void
  indexFile: File | null
  onFileSelect: (file: File | null) => void
  isIndexing: boolean
  isFetchingUrl: boolean
  onIndexSubmit: () => void
  onFetchUrl: () => void
}

export function KnowledgePanel({
  status,
  knowledgeQuery,
  onQueryChange,
  onQuerySubmit,
  knowledgeResults,
  indexDocument,
  onIndexDocumentChange,
  indexUrl,
  onIndexUrlChange,
  indexFile,
  onFileSelect,
  isIndexing,
  isFetchingUrl,
  onIndexSubmit,
  onFetchUrl,
}: KnowledgePanelProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onIndexDocumentChange(event.target.result as string)
          onFileSelect(file)
        }
      }
      reader.readAsText(file)
    } else {
      onFileSelect(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-400" />
            Explore Context Topology
          </CardTitle>
          <CardDescription className="text-slate-400">
            Navigate the relationships and embeddings currently available for RAG injection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={knowledgeQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onQuerySubmit()}
              placeholder="e.g., authentication middleware"
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500/50"
            />
            <Button onClick={onQuerySubmit} className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          {knowledgeResults && (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {knowledgeResults.nodes.map((node) => (
                  <div key={node.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{node.name}</span>
                      <Badge variant="outline" className="text-slate-400">{node.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{node.content.substring(0, 150)}...</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Ingest to Context Base
          </CardTitle>
          <CardDescription className="text-slate-400">
            Feed documentation and files into the proxy's active knowledge topology for context augmentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-slate-300">Document Content</Label>
              <Textarea
                value={indexDocument}
                onChange={(e) => onIndexDocumentChange(e.target.value)}
                placeholder="Paste documentation content or upload a file..."
                className="mt-2 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px] focus:border-emerald-500/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-300">Upload</Label>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-300">
                    {indexFile ? indexFile.name : 'Upload File'}
                  </span>
                  <input 
                    type="file" 
                    accept=".txt,.md,.json,.py,.ts,.js,.tsx,.jsx,.html,.css,.yaml,.yml,.xml,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Source URL (optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={indexUrl}
                onChange={(e) => onIndexUrlChange(e.target.value)}
                placeholder="https://docs.example.com/api"
                className="flex-1 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={onFetchUrl}
                disabled={!indexUrl.trim() || isFetchingUrl}
                className="border-slate-600 text-slate-400 hover:text-white"
              >
                {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <Button 
            onClick={onIndexSubmit}
            disabled={!indexDocument.trim() && !indexFile && !indexUrl.trim()}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
          >
            <Database className="w-4 h-4 mr-2" />
            {isIndexing ? 'Indexing...' : 'Index Document'}
          </Button>
          
          <Separator className="bg-slate-700" />
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-2xl font-bold text-white">{status?.knowledge_graph?.nodes || 0}</p>
              <p className="text-sm text-purple-300">Concepts</p>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-2xl font-bold text-white">{status?.knowledge_graph?.edges || 0}</p>
              <p className="text-sm text-cyan-300">Relationships</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
