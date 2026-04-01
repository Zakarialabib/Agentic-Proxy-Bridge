

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Gauge,
  Activity,
  Layers,
  Zap,
  Database,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Cpu,
  Network,
  Clock,
  Wrench,
  Brain,
  Sparkles,
  Lightbulb,
  BarChart3,
  Inbox,
  Send,
  Signal,
  SignalLow,
  SignalHigh
} from 'lucide-react'

const PROXY_PORT = 3001

interface DashboardMetrics {
  connection_pool: {
    active: number
    queue: number
    max_connections: number
    utilization_percent: number
    wait_time_avg_ms: number
  }
  embedding_coalescer: {
    pending: number
    batches: number
    batch_size_avg: number
    dedup_rate_percent: number
    flush_interval_ms: number
  }
  streaming: {
    chunks_sent: number
    chunks_buffered: number
    backpressure_active: boolean
    backpressure_queue_size: number
    chunk_latency_avg_ms: number
  }
  health: {
    status: 'healthy' | 'degraded' | 'critical'
    uptime_seconds: number
    memory_used_mb: number
    cpu_percent: number
    error_count_last_hour: number
  }
  performance_score: number
  recommendations: {
    id: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    action?: string
  }[]
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'critical' }) {
  const config = {
    healthy: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle2, label: 'Healthy' },
    degraded: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', icon: AlertTriangle, label: 'Degraded' },
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle, label: 'Critical' }
  }
  const c = config[status]
  const Icon = c.icon
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </div>
  )
}

function GaugeChart({ value, max = 100, size = 'md', label }: { value: number, max?: number, size?: 'sm' | 'md' | 'lg', label?: string }) {
  const percentage = Math.min((value / max) * 100, 100)
  const radius = size === 'sm' ? 28 : size === 'lg' ? 56 : 40
  const stroke = size === 'sm' ? 4 : size === 'lg' ? 8 : 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  
  const getColor = () => {
    if (percentage < 40) return '#10b981'
    if (percentage < 70) return '#f59e0b'
    return '#ef4444'
  }
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90" width={size === 'sm' ? 72 : size === 'lg' ? 144 : 100} height={size === 'sm' ? 72 : size === 'lg' ? 144 : 100}>
        <circle
          cx={size === 'sm' ? 36 : size === 'lg' ? 72 : 50}
          cy={size === 'sm' ? 36 : size === 'lg' ? 72 : 50}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-700"
        />
        <circle
          cx={size === 'sm' ? 36 : size === 'lg' ? 72 : 50}
          cy={size === 'sm' ? 36 : size === 'lg' ? 72 : 50}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-2xl' : 'text-lg'} text-white`}>
          {value.toFixed(0)}
        </span>
        {size !== 'sm' && <span className="text-[10px] text-slate-400">{label || '%'}</span>}
      </div>
    </div>
  )
}

function MetricBar({ label, value, max, unit = '', color = 'cyan' }: { label: string, value: number, max: number, unit?: string, color?: string }) {
  const percentage = Math.min((value / max) * 100, 100)
  const colorClasses: Record<string, string> = {
    cyan: 'bg-cyan-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  }
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{value}{unit} / {max}{unit}</span>
      </div>
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function MiniSparkline({ data, color = 'cyan' }: { data: number[], color?: string }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const height = 32
  const width = 80
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  
  const strokeColors: Record<string, string> = {
    cyan: '#06b6d4',
    emerald: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444'
  }
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColors[color]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function ConnectionPoolCard({ data }: { data: DashboardMetrics['connection_pool'] }) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Connection Pool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <GaugeChart value={data.utilization_percent} label="utilization" size="lg" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-slate-900/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Signal className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-slate-400">Active</span>
            </div>
            <p className="text-lg font-bold text-white">{data.active}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Inbox className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-slate-400">Queue</span>
            </div>
            <p className="text-lg font-bold text-white">{data.queue}</p>
          </div>
        </div>
        
        <MetricBar label="Connections" value={data.active} max={data.max_connections} color="cyan" />
        
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Avg Wait</span>
          </div>
          <span className="text-white font-medium">{data.wait_time_avg_ms.toFixed(0)}ms</span>
        </div>
      </CardContent>
    </Card>
  )
}

function EmbeddingCoalescerCard({ data }: { data: DashboardMetrics['embedding_coalescer'] }) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          Embedding Coalescer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-1 mb-1">
              <Inbox className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-slate-400">Pending</span>
            </div>
            <p className="text-lg font-bold text-white">{data.pending}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-1 mb-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-slate-400">Batches</span>
            </div>
            <p className="text-lg font-bold text-white">{data.batches}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Avg Batch Size</span>
            <span className="text-white font-medium">{data.batch_size_avg.toFixed(1)}</span>
          </div>
          <Progress value={data.batch_size_avg * 10} max={100} className="h-2 bg-slate-700/50" />
        </div>
        
        <div className="p-3 rounded-lg bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Dedup Rate</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
              {data.dedup_rate_percent.toFixed(1)}%
            </Badge>
          </div>
          <MiniSparkline data={[20, 35, 28, 45, 38, 52, 48, 55, 60, 58]} color="emerald" />
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Flush Interval</span>
          <span className="text-white font-medium">{data.flush_interval_ms}ms</span>
        </div>
      </CardContent>
    </Card>
  )
}

function StreamingCard({ data }: { data: DashboardMetrics['streaming'] }) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Streaming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-1 mb-1">
              <Send className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-slate-400">Sent</span>
            </div>
            <p className="text-lg font-bold text-white">{data.chunks_sent.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-1 mb-1">
              <Inbox className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-slate-400">Buffered</span>
            </div>
            <p className="text-lg font-bold text-white">{data.chunks_buffered}</p>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg border ${
          data.backpressure_active 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-slate-900/50 border-slate-700/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.backpressure_active ? (
                <SignalHigh className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <SignalLow className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs text-slate-300">Backpressure</span>
            </div>
            <Badge className={`${
              data.backpressure_active 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            } text-xs`}>
              {data.backpressure_active ? 'Active' : 'Idle'}
            </Badge>
          </div>
          {data.backpressure_active && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Queue</span>
                <span>{data.backpressure_queue_size}</span>
              </div>
              <Progress value={(data.backpressure_queue_size / 100) * 100} className="h-1.5 bg-slate-700/50" />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Chunk Latency</span>
          </div>
          <span className="text-white font-medium">{data.chunk_latency_avg_ms.toFixed(1)}ms</span>
        </div>
      </CardContent>
    </Card>
  )
}

function HealthStatusCard({ data }: { data: DashboardMetrics['health'] }) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }
  
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            System Health
          </div>
          <StatusBadge status={data.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center py-2">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{formatUptime(data.uptime_seconds)}</div>
            <div className="text-[10px] text-slate-400">Uptime</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-1 mb-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-slate-400">CPU</span>
            </div>
            <p className="text-lg font-bold text-white">{data.cpu_percent.toFixed(0)}%</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-1 mb-1">
              <Database className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-slate-400">Memory</span>
            </div>
            <p className="text-lg font-bold text-white">{(data.memory_used_mb / 1024).toFixed(1)}GB</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Errors (1h)</span>
          <span className={`font-medium ${data.error_count_last_hour > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {data.error_count_last_hour}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceScoreCard({ score }: { score: number }) {
  const getScoreConfig = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'emerald', icon: TrendingUp }
    if (score >= 60) return { label: 'Good', color: 'cyan', icon: TrendingUp }
    if (score >= 40) return { label: 'Fair', color: 'amber', icon: Minus }
    return { label: 'Poor', color: 'red', icon: TrendingDown }
  }
  const config = getScoreConfig(score)
  const Icon = config.icon
  
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          Performance Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-4">
        <GaugeChart value={score} max={100} size="lg" />
        <div className="mt-3 flex items-center gap-1.5">
          <Icon className={`w-4 h-4 text-${config.color}-400`} />
          <span className={`text-sm font-medium text-${config.color}-400`}>{config.label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function RecommendationsPanel({ recommendations }: { recommendations: DashboardMetrics['recommendations'] }) {
  const priorityColors: Record<string, string> = {
    high: 'bg-red-500/20 border-red-500/30 text-red-400',
    medium: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    low: 'bg-slate-700/30 border-slate-600/30 text-slate-400'
  }
  
  if (recommendations.length === 0) {
    return (
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 text-center py-4">No recommendations at this time</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          Recommendations
          <Badge variant="outline" className="ml-auto border-slate-600 text-slate-400 text-xs">
            {recommendations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-2">
          <div className="space-y-2">
            {recommendations.map(rec => (
              <div 
                key={rec.id}
                className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{rec.title}</span>
                  <Badge className={`${priorityColors[rec.priority]} text-[10px] shrink-0`}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-2">{rec.description}</p>
                {rec.action && (
                  <div className="flex items-center gap-1 text-xs text-cyan-400">
                    <Sparkles className="w-3 h-3" />
                    <span>{rec.action}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="bg-slate-800/30 border-slate-700/50">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ErrorState({ error }: { error: Error }) {
  return (
    <Card className="bg-red-500/10 border-red-500/30">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <XCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-red-400 font-medium mb-1">Failed to load dashboard</p>
        <p className="text-xs text-slate-500">{error.message}</p>
        <Badge className="mt-3 bg-red-500/20 text-red-400 border border-red-500/30">
          <RefreshCw className="w-3 h-3 mr-1" />
          Retrying...
        </Badge>
      </CardContent>
    </Card>
  )
}

function DashboardGrid({ data }: { data: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ConnectionPoolCard data={data.connection_pool} />
      <EmbeddingCoalescerCard data={data.embedding_coalescer} />
      <StreamingCard data={data.streaming} />
      <HealthStatusCard data={data.health} />
      <PerformanceScoreCard score={data.performance_score} />
      <RecommendationsPanel recommendations={data.recommendations} />
    </div>
  )
}

export function Phase8Dashboard() {
  const { data, isLoading, error, refetch } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch(`/dashboard`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fetch dashboard')
      }
      const apiData = await res.json()
      
      return {
        connection_pool: {
          active: apiData.connectionPool?.active ?? 0,
          queue: apiData.connectionPool?.queued ?? 0,
          max_connections: apiData.connectionPool?.max ?? 10,
          utilization_percent: apiData.connectionPool?.utilization ?? 0,
          wait_time_avg_ms: apiData.connectionPool?.trends?.avgUtilization ?? 0,
        },
        embedding_coalescer: {
          pending: apiData.embeddingCoalescer?.pending ?? 0,
          batches: apiData.embeddingCoalescer?.activeBatches ?? 0,
          batch_size_avg: apiData.embeddingCoalescer?.avgBatchSize ?? 0,
          dedup_rate_percent: (apiData.embeddingCoalescer?.deduplicationRate ?? 0) * 100,
          flush_interval_ms: 50,
        },
        streaming: {
          chunks_sent: 0,
          chunks_buffered: apiData.streaming?.chunksQueued ?? 0,
          backpressure_active: apiData.streaming?.backpressureEvents > 0,
          backpressure_queue_size: apiData.streaming?.backpressureEvents ?? 0,
          chunk_latency_avg_ms: apiData.streaming?.avgLatency ?? 0,
        },
        health: {
          status: apiData.overall?.health === 'ok' ? 'healthy' : apiData.overall?.health === 'critical' ? 'critical' : 'degraded',
          uptime_seconds: 0,
          memory_used_mb: 512,
          cpu_percent: 25,
          error_count_last_hour: 0,
        },
        performance_score: apiData.overall?.score ?? 0,
        recommendations: (apiData.recommendations ?? []).map((rec: string, i: number) => ({
          id: String(i),
          priority: 'medium' as const,
          title: rec,
          description: rec,
        })),
      }
    },
    refetchInterval: 5000,
    retry: 3,
    retryDelay: 1000
  })
  
  if (isLoading) {
    return <LoadingState />
  }
  
  if (error) {
    return <ErrorState error={error as Error} />
  }
  
  if (!data) {
    return (
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-slate-400">No dashboard data available</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <RefreshCw className="w-3 h-3" />
          <span>Auto-refresh every 5s</span>
        </div>
        <Badge variant="outline" className="border-slate-600 text-slate-400">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>
      <DashboardGrid data={data} />
    </div>
  )
}
