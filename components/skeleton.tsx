import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-secondary/50',
        className
      )}
    />
  )
}

export function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="px-6 py-4 border-b border-border flex gap-4">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <Skeleton className="flex-1 h-4" />
            <Skeleton className="w-24 h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-2 w-16" />
        </div>
      ))}
    </div>
  )
}
