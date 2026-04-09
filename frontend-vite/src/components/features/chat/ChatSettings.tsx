import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { previewTrigger } from '@/lib/api'
import type { ProxyStatus } from '@/lib/types'

interface ChatSettingsProps {
  status: ProxyStatus | null
  contextStrategy?: 'full' | 'prune' | 'summarize'
}

export function ChatSettings({ status, contextStrategy }: ChatSettingsProps) {
  const [previewInput, setPreviewInput] = useState('')
  const [previewResult, setPreviewResult] = useState<{ trigger_profile: any; resolved: any } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const handlePreview = async () => {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const res = await previewTrigger(previewInput)
      if (!res) {
        setPreviewError('No response from trigger preview')
        setPreviewResult(null)
      } else {
        setPreviewResult(res)
      }
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Failed to preview trigger')
      setPreviewResult(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Current Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Approval Mode</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-0">{status?.approval_mode || 'supervised'}</Badge>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>MCP Servers</span>
            <Badge className="bg-slate-700 text-slate-300 border-0">{status?.protocols?.mcp?.servers || 0}</Badge>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>A2A Agents</span>
            <Badge className="bg-slate-700 text-slate-300 border-0">{status?.protocols?.a2a?.agents || 0}</Badge>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Context Strategy</span>
            <Badge className="bg-slate-700 text-slate-300 border-0">{contextStrategy || 'full'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs font-mono bg-slate-900/50 p-3 rounded-lg">
            <p className="text-slate-500"># Orchestrate (Primary)</p>
            <p className="text-purple-400">POST /v1/agent/orchestrate</p>
            <p className="text-slate-500 mt-2"># Chat Completions</p>
            <p className="text-cyan-400">POST /v1/chat/completions</p>
            <p className="text-slate-500 mt-2"># Knowledge Query</p>
            <p className="text-emerald-400">GET /knowledge</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Trigger Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <Textarea
            value={previewInput}
            onChange={(e) => setPreviewInput(e.target.value)}
            placeholder="Paste a prompt to see trigger intent and actions..."
            className="bg-slate-900/60 border-slate-700 text-slate-200"
            rows={4}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={handlePreview}
              disabled={!previewInput.trim() || previewLoading}
            >
              {previewLoading ? 'Previewing...' : 'Preview Trigger'}
            </Button>
            {previewError && <span className="text-xs text-rose-400">{previewError}</span>}
          </div>
          {previewResult && (
            <div className="space-y-2 text-xs bg-slate-900/60 border border-slate-700/60 rounded-lg p-3">
              <div className="text-slate-400">Triggered: <span className="text-slate-200">{String(previewResult.trigger_profile?.triggered)}</span></div>
              <div className="text-slate-400">Intent: <span className="text-slate-200">{(previewResult.trigger_profile?.intent || []).join(', ') || 'none'}</span></div>
              <div className="text-slate-400">Recommended: <span className="text-slate-200">{JSON.stringify(previewResult.trigger_profile?.recommended_actions || {})}</span></div>
              <div className="text-slate-400">Resolved: <span className="text-slate-200">{JSON.stringify(previewResult.resolved || {})}</span></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
