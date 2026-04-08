import { Card, CardContent } from '@/components/ui/card'
import { Gauge, Zap, TrendingUp, Activity } from 'lucide-react'
import type { PerformanceMetrics, CacheStats } from '@/lib/types'

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
