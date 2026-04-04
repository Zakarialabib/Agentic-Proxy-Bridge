import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface PanelSkeletonProps {
  title?: boolean
  sections?: number
}

export function PanelSkeleton({ title = true, sections = 1 }: PanelSkeletonProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      {title && (
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-slate-700" />
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {Array.from({ length: sections }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full bg-slate-700" />
            <Skeleton className="h-4 w-3/4 bg-slate-700" />
            <Skeleton className="h-4 w-1/2 bg-slate-700" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <Skeleton className="h-16 w-64 rounded-lg bg-slate-700" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-lg bg-slate-700" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full bg-slate-700" />
      ))}
    </div>
  )
}
