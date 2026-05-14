import { cn } from '@/lib/utils'

export type StatusType = 'pending_review' | 'approved' | 'rejected' | 'processing' | 'sent' | 'failed' | 'completed' | 'unassigned'

const statusStyles: Record<StatusType, string> = {
  pending_review: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  sent: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  unassigned: 'bg-secondary text-muted-foreground border-border',
}

interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1)
  
  return (
    <span className={cn(
      'inline-flex px-2 py-1 rounded-md text-xs font-medium border',
      statusStyles[status],
      className
    )}>
      {displayLabel}
    </span>
  )
}
