import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemoryStick } from 'lucide-react'

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
