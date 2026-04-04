import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { WorklogEntry } from '@/lib/types'
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface WorklogPanelProps {
  entries: WorklogEntry[]
}

export function WorklogPanel({ entries }: WorklogPanelProps) {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      running: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return variants[status] || variants.pending
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Worklog
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No worklog entries yet</p>
            <p className="text-sm">Agent tasks will appear here as they execute</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {statusIcon(entry.status)}
                      <span className="text-white font-medium">{entry.taskName}</span>
                    </div>
                    <Badge variant="outline" className={statusBadge(entry.status)}>
                      {entry.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{entry.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Agent: {entry.agent}</span>
                    <span>Stage: {entry.stage}</span>
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
