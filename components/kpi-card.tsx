import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  subtitle?: string
  icon?: ReactNode
  trend?: {
    direction: 'up' | 'down'
    value: number
  }
  className?: string
}

export function KPICard({
  title,
  value,
  unit,
  subtitle,
  icon,
  trend,
  className,
}: KPICardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-6 space-y-2 hover:border-primary/50 transition-colors',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="flex items-center gap-1 pt-2">
          {trend.direction === 'up' ? (
            <>
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-xs text-green-500">{trend.value}%</span>
            </>
          ) : (
            <>
              <TrendingDown size={14} className="text-destructive" />
              <span className="text-xs text-destructive">{trend.value}%</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
