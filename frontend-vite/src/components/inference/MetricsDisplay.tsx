

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, Network, Bot, Clock, Zap, Activity, Gauge, TrendingUp, Cpu, MemoryStick } from 'lucide-react'
import type { ProxyStatus, PerformanceMetrics, CacheStats } from '@/lib/types'

interface MetricsDisplayProps {
  status: ProxyStatus | null
  performanceMetrics: PerformanceMetrics | null
  cacheStats: CacheStats | null
}

export function MetricsDisplay({ status, performanceMetrics, cacheStats }: MetricsDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300">Knowledge Nodes</p>
                <p className="text-2xl font-bold text-white">{status?.knowledge_graph?.nodes || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-300">MCP Tools</p>
                <p className="text-2xl font-bold text-white">{status?.protocols?.mcp?.tools || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Network className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-300">A2A Agents</p>
                <p className="text-2xl font-bold text-white">{status?.protocols?.a2a?.available || 0}/{status?.protocols?.a2a?.agents || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-300">Async Tasks</p>
                <p className="text-2xl font-bold text-white">{status?.async_tasks?.pending || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {performanceMetrics && (
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-400 mb-1">Total Requests</p>
                <p className="text-xl font-bold text-white">{performanceMetrics.total_requests}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-400 mb-1">Avg Latency</p>
                <p className="text-xl font-bold text-white">{performanceMetrics.avg_latency_ms.toFixed(0)}ms</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-400 mb-1">TTFT P50</p>
                <p className="text-xl font-bold text-white">{performanceMetrics.ttft_p50_ms.toFixed(0)}ms</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-400 mb-1">Tokens/sec</p>
                <p className="text-xl font-bold text-white">{performanceMetrics.tps.toFixed(1)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-400 mb-1">Success Rate</p>
                <p className="text-xl font-bold text-emerald-400">{(performanceMetrics.success_rate * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {cacheStats && (
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-purple-400" />
              Cache Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Hit Rate</span>
                  <span className="text-white font-medium">{cacheStats.hit_rate.toFixed(1)}%</span>
                </div>
                <Progress value={cacheStats.hit_rate} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <p className="text-xs text-slate-400 mb-1">Hits</p>
                  <p className="text-lg font-bold text-emerald-400">{cacheStats.hits}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <p className="text-xs text-slate-400 mb-1">Misses</p>
                  <p className="text-lg font-bold text-red-400">{cacheStats.misses}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <p className="text-xs text-slate-400 mb-1">Size</p>
                  <p className="text-lg font-bold text-white">{(cacheStats.size / 1024 / 1024).toFixed(1)}MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Predictive Pre-triggering
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
              <p className="text-2xl font-bold text-purple-400">{status?.pre_triggering?.pre_warmed_tools || 0}</p>
              <p className="text-xs text-purple-300">Pre-warmed</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600 text-center">
              <p className="text-2xl font-bold text-slate-300">{status?.pre_triggering?.patterns_loaded || 0}</p>
              <p className="text-xs text-slate-400">Patterns</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
