

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Zap, Search, Terminal, Gauge, ArrowRight, Play } from 'lucide-react'
import type { EmbeddingPreset, MRLPreset, RerankerConfig, ChatTestPreset, GatewayTransformation } from '@/lib/types'

interface GatewayPanelProps {
  gatewayQuery: string
  onQueryChange: (value: string) => void
  onSearch: () => void
  embeddingPresets: Record<string, EmbeddingPreset>
  mrlPresets: Record<string, MRLPreset>
  rerankerConfigs: Record<string, RerankerConfig>
  chatTestPresets: ChatTestPreset[]
  gatewayResult: GatewayTransformation | null
  selectedPreset: string
  selectedMRL: string
  selectedReranker: string
  testPresetId: string
  onPresetChange: (preset: string) => void
  onMRLChange: (mrl: string) => void
  onRerankerChange: (reranker: string) => void
  onTestPresetChange: (presetId: string) => void
  onRunTest: () => void
}

export function GatewayPanel({
  gatewayQuery,
  onQueryChange,
  onSearch,
  embeddingPresets,
  mrlPresets,
  rerankerConfigs,
  chatTestPresets,
  gatewayResult,
  selectedPreset,
  selectedMRL,
  selectedReranker,
  testPresetId,
  onPresetChange,
  onMRLChange,
  onRerankerChange,
  onTestPresetChange,
  onRunTest,
}: GatewayPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Prompt & Embedding Analyzer
            </CardTitle>
            <CardDescription className="text-slate-400">
              Test how the proxy understands and transforms your prompt before hitting the LLM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">Query</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={gatewayQuery}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="e.g., authentication middleware"
                  className="bg-slate-700 border-slate-600 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                />
                <Button onClick={onSearch} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Preset</Label>
                <select
                  value={selectedPreset}
                  onChange={(e) => onPresetChange(e.target.value)}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white"
                >
                  {Object.entries(embeddingPresets).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-400">MRL Dim</Label>
                <select
                  value={selectedMRL}
                  onChange={(e) => onMRLChange(e.target.value)}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white"
                >
                  {Object.entries(mrlPresets).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.name} ({preset.dimension}d)</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-400">Reranker</Label>
                <select
                  value={selectedReranker}
                  onChange={(e) => onRerankerChange(e.target.value)}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white"
                >
                  {Object.entries(rerankerConfigs).map(([key, config]) => (
                    <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {embeddingPresets[selectedPreset] && (
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Instruction Prefix</p>
                <p className="text-sm text-cyan-400 font-mono">
                  {embeddingPresets[selectedPreset].instruction_prefix}
                </p>
                {embeddingPresets[selectedPreset].negative_query_template && (
                  <>
                    <p className="text-xs text-slate-400 mt-2 mb-1">Negative Query</p>
                    <p className="text-sm text-red-400 font-mono">
                      {embeddingPresets[selectedPreset].negative_query_template}
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Analysis & Transformation Pipeline
            </CardTitle>
            <CardDescription className="text-slate-400">
              Input, Intent classification, and Rerank output log
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gatewayResult ? (
              <div className="space-y-4 text-sm">
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-500/20 text-purple-400">INPUT</Badge>
                    <span className="text-slate-400">{gatewayResult.input.raw}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Intent: </span>
                      <span className="text-cyan-400">{gatewayResult.input.intent.type}</span>
                      <span className="text-slate-500"> ({(gatewayResult.input.intent.confidence * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400">EMBEDDING</Badge>
                    <span className="text-xs text-slate-400">{gatewayResult.embedding.time_ms}ms</span>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400">OUTPUT</Badge>
                    <span className="text-xs text-slate-400">{gatewayResult.total_time_ms}ms total</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    {gatewayResult.output.results_count} results
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
                <Terminal className="w-12 h-12 mb-2 opacity-20" />
                <p>Submit a prompt to analyze embedding and rerank metrics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-purple-400" />
              Embedding Representation (MRL)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select dimensionality to balance speed vs. semantic depth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(mrlPresets).map(([key, preset]) => (
                <div 
                  key={key}
                  onClick={() => onMRLChange(key)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedMRL === key 
                      ? 'bg-purple-500/20 border border-purple-500/30' 
                      : 'bg-slate-900/50 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <p className="font-medium text-white text-sm">{preset.name}</p>
                  <p className="text-xs text-slate-400">{preset.dimension}d</p>
                  <p className="text-xs text-purple-400 mt-1">{preset.speed}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-amber-400" />
              Reranker Modes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(rerankerConfigs).map(([key, config]) => (
                <div 
                  key={key}
                  onClick={() => onRerankerChange(key)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedReranker === key 
                      ? 'bg-amber-500/20 border border-amber-500/30' 
                      : 'bg-slate-900/50 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-white text-sm">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
                    <Badge variant="outline" className="text-xs">{config.latency_ms}ms</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{config.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-400" />
            Scenario Optimization Tests
          </CardTitle>
          <CardDescription className="text-slate-400">
            Automated test suite to evaluate embedding latency, intent routing, and rerank quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {chatTestPresets.slice(0, 8).map(preset => (
              <div 
                key={preset.id}
                onClick={() => onTestPresetChange(preset.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  testPresetId === preset.id 
                    ? 'bg-emerald-500/20 border border-emerald-500/30' 
                    : 'bg-slate-900/50 border border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-white text-sm">{preset.name}</p>
                  <Badge className={`text-xs ${
                    preset.category === 'capabilities' ? 'bg-cyan-500/20 text-cyan-400' :
                    preset.category === 'performance' ? 'bg-purple-500/20 text-purple-400' :
                    preset.category === 'robustness' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {preset.category}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{preset.description}</p>
              </div>
            ))}
          </div>
          
          {testPresetId && (
            <div className="mt-4 flex justify-end">
              <Button onClick={onRunTest} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30">
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
