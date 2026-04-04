// Dashboard Components - Status & Metrics Display

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, WifiOff, Server, Timer, Activity, 
  Cpu, MemoryStick, Database, Zap, Brain,
  Wrench, Network, MessageSquare, BookOpen,
  Sparkles, Eye, Clock, TrendingUp, Gauge
} from 'lucide-react'
import * as api from '@/lib/api'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { MetricsDisplay } from '@/components/inference/MetricsDisplay'
import type { ProxyStatus, PerformanceMetrics, CacheStats } from '@/lib/types'

interface StatusPillProps {
  status: 'connected' | 'degraded' | 'disconnected'
  label: string
  pulse?: boolean
}

export function StatusPill({ status, label, pulse = false }: StatusPillProps) {
  const colors = {
    connected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    degraded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    disconnected: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  
  const dots = {
    connected: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    disconnected: 'bg-red-400'
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[status]} ${pulse && status === 'connected' ? 'animate-pulse' : ''}`} />
      {label}
    </div>
  )
}

interface DashboardHeaderProps {
  status: ProxyStatus | null
  uptime: number
  proxyPort: number
}

export function DashboardHeader({ status, uptime, proxyPort }: DashboardHeaderProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }
  
  return (
    <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Server className="w-5 h-5 text-slate-900" />
              </div>
              {status?.status === 'running' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Proxy Bridge Control Space</h1>
              <p className="text-xs text-slate-400">Context Engineering • Embeddings • Tool Orchestration</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            {status ? (
              <>
                <StatusPill 
                  status={status.lmstudio_connected ? 'connected' : 'disconnected'} 
                  label={status.lmstudio_connected ? 'LM Studio' : 'Disconnected'}
                  pulse 
                />
                <StatusPill 
                  status={status.status === 'running' ? 'connected' : 'disconnected'} 
                  label={`Proxy ${formatUptime(uptime)}`}
                  pulse 
                />
              </>
            ) : (
              <StatusPill status="disconnected" label="Connecting..." />
            )}
          </div>
          
          <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/5">
            :{proxyPort}
          </Badge>
        </div>
      </div>
    </header>
  )
}

interface ConnectionMatrixProps {
  status: ProxyStatus | null
}

export function ConnectionMatrix({ status }: ConnectionMatrixProps) {
  const { lmStudioHost, lmStudioPort } = useSettingsStore()
  const lmStudioUrl = `http://${lmStudioHost}:${lmStudioPort}`
  
  return (
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          Connection Matrix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">LM Studio</span>
            {status?.lmstudio_connected ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Connected</Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Offline</Badge>
            )}
          </div>
          <div className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded">
            {lmStudioUrl}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">MCP Servers</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-xs">
              {status?.protocols.mcp.healthy || 0}/{status?.protocols.mcp.servers || 0}
            </Badge>
          </div>
          <div className="text-xs text-slate-300">
            {status?.protocols.mcp.tools || 0} tools available
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">A2A Agents</span>
            <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs">
              {status?.protocols.a2a.available || 0}/{status?.protocols.a2a.agents || 0}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PerformanceCardsProps {
  metrics: PerformanceMetrics | null
  cacheStats: CacheStats | null
}

export function PerformanceCards({ metrics, cacheStats }: PerformanceCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Avg Latency</span>
          </div>
          <p className="text-xl font-bold text-white">
            {metrics?.avg_latency_ms?.toFixed(0) || 0}ms
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">TTFT (p50)</span>
          </div>
          <p className="text-xl font-bold text-white">
            {metrics?.ttft_p50_ms?.toFixed(0) || 0}ms
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">TPS</span>
          </div>
          <p className="text-xl font-bold text-white">
            {metrics?.tps?.toFixed(1) || 0}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">Cache Hit</span>
          </div>
          <p className="text-xl font-bold text-white">
            {cacheStats?.hit_rate?.toFixed(0) || 0}%
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface SystemStatsProps {
  status: ProxyStatus | null
}

export function SystemStats({ status }: SystemStatsProps) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          System Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MessageSquare className="w-3 h-3" />
            Active Sessions
          </div>
          <span className="text-sm font-semibold text-white">{status?.active_sessions || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Wrench className="w-3 h-3" />
            Tools Registered
          </div>
          <span className="text-sm font-semibold text-white">{status?.tools_registered || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Brain className="w-3 h-3" />
            Knowledge Nodes
          </div>
          <span className="text-sm font-semibold text-white">{status?.knowledge_graph?.nodes || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen className="w-3 h-3" />
            Documents
          </div>
          <span className="text-sm font-semibold text-white">{status?.knowledge_graph?.documents?.count || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-3 h-3" />
            Pre-warmed Tools
          </div>
          <span className="text-sm font-semibold text-white">{status?.pre_triggering?.pre_warmed_tools || 0}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface VRAMDisplayProps {
  used: number
  total?: number
}

export function VRAMDisplay({ used, total = 12 }: VRAMDisplayProps) {
  const percentage = (used / total) * 100
  const safeZone = 80
  
  const getGradient = () => {
    if (percentage <= 50) return 'from-emerald-500 to-emerald-400'
    if (percentage <= 75) return 'from-emerald-500 via-amber-400 to-amber-500'
    return 'from-amber-500 via-orange-500 to-red-500'
  }
  
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <MemoryStick className="w-4 h-4 text-purple-400" />
          VRAM Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Memory</span>
            <span className="text-slate-300">{used.toFixed(1)}GB / {total}GB</span>
          </div>
          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 bottom-0 w-px bg-slate-500/50"
              style={{ left: `${safeZone}%` }}
            />
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Headroom: {(total - used).toFixed(1)}GB</span>
            <span className={percentage > safeZone ? 'text-amber-400' : ''}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
export function Dashboard() {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [uptime, setUptime] = useState(0)
  
  useEffect(() => {
    const loadData = async () => {
      const [statusData, metricsData, cacheData] = await Promise.all([
        api.fetchStatus(),
        api.fetchPerformanceMetrics(),
        api.fetchCacheStats(),
      ])
      setStatus(statusData)
      setMetrics(metricsData)
      setCacheStats(cacheData)
    }
    
    loadData()
    
    const interval = setInterval(() => {
      loadData()
      setUptime(prev => prev + 1)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="space-y-4">
      <ConnectionMatrix status={status} />
      <MetricsDisplay status={status} performanceMetrics={metrics} cacheStats={cacheStats} />
      <SystemStats status={status} />
      <VRAMDisplay used={8.5} />
    </div>
  )
}
