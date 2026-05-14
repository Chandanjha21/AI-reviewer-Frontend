'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Filter,
  Loader2,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Send,
  PlusCircle,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react'

import { getToken } from '@/lib/auth'
import { cn } from '@/lib/utils'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8010'

interface AuditLog {
  id: string
  organization_id: string
  work_item_id: string
  actor_id: string | null
  actor_type: string
  action: string
  from_status: string | null
  to_status: string | null
  metadata: Record<string, unknown>
  created_on: string | null
}

const ACTION_META: Record<
  string,
  {
    label: string
    icon: React.ElementType
    color: string
    bg: string
  }
> = {
  item_created: {
    label: 'Work item created',
    icon: PlusCircle,
    color: 'text-violet-400',
    bg: 'bg-violet-500',
  },
  item_approved: {
    label: 'Approved by reviewer',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500',
  },
  item_rejected: {
    label: 'Rejected by reviewer',
    icon: XCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500',
  },
  item_sent: {
    label: 'Email sent',
    icon: Send,
    color: 'text-blue-400',
    bg: 'bg-blue-500',
  },
  status_updated: {
    label: 'Status updated',
    icon: ArrowRightLeft,
    color: 'text-amber-400',
    bg: 'bg-amber-500',
  },
}

function getActionMeta(action: string) {
  return (
    ACTION_META[action] ?? {
      label: action.replace(/_/g, ' '),
      icon: Activity,
      color: 'text-muted-foreground',
      bg: 'bg-primary',
    }
  )
}

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return 'Unknown time'

  const date = new Date(dateString)
  const now = new Date()

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`

  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function buildMetadata(log: AuditLog) {
  const metadata = log.metadata ?? {}

  if (
    log.action === 'status_updated' &&
    log.from_status &&
    log.to_status
  ) {
    return `${log.from_status.replace(/_/g, ' ')} → ${log.to_status.replace(
      /_/g,
      ' '
    )}`
  }

  if (metadata.reason) {
    return String(metadata.reason).replace(/_/g, ' ')
  }

  if (metadata.customer_id) {
    return `Customer · ${String(metadata.customer_id).slice(0, 8)}`
  }

  if (metadata.task_id) {
    return `Task · ${String(metadata.task_id).slice(0, 8)}`
  }

  if (metadata.reviewer_note) {
    return String(metadata.reviewer_note)
  }

  return `Work Item · ${log.work_item_id.slice(0, 8)}`
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [limit] = useState(100)
  const [offset, setOffset] = useState(0)

  async function loadAuditLogs(currentOffset = 0) {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(
        `${API_BASE_URL}/work-items/audit-logs/all?limit=${limit}&offset=${currentOffset}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      )

      if (!res.ok) {
        throw new Error('Failed to load audit logs')
      }

      const data: AuditLog[] = await res.json()

      setLogs(data)
    } catch (err) {
      console.error(err)
      setError('Could not load audit logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs(offset)
  }, [offset])

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs

    const q = search.toLowerCase()

    return logs.filter((log) => {
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor_type.toLowerCase().includes(q) ||
        log.work_item_id.toLowerCase().includes(q) ||
        (log.actor_id ?? '').toLowerCase().includes(q)
      )
    })
  }, [logs, search])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track all system and reviewer activities
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <button
            onClick={() => loadAuditLogs(offset)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card border border-border transition-colors text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card border border-border transition-colors text-sm">
            <Filter size={16} />
            Filter
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            Loading audit logs...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex items-center gap-2 text-rose-400">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredLogs.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            No audit logs found.
          </div>
        )}

        {/* Timeline */}
        {!loading && !error && filteredLogs.length > 0 && (
          <div className="space-y-0 rounded-lg border border-border overflow-hidden bg-card">
            {filteredLogs.map((log, idx) => {
              const meta = getActionMeta(log.action)
              const Icon = meta.icon

              return (
                <div
                  key={log.id}
                  className={cn(
                    'p-4 flex gap-4 hover:bg-secondary/30 transition-colors',
                    idx !== filteredLogs.length - 1 &&
                      'border-b border-border'
                  )}
                >
                  {/* Timeline rail */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center border border-border bg-card',
                        meta.color
                      )}
                    >
                      <Icon size={14} />
                    </div>

                    {idx !== filteredLogs.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-2 min-h-[40px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {meta.label}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          {buildMetadata(log)}
                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground uppercase">
                            {log.actor_type}
                          </span>

                          <span className="text-[10px] font-mono text-muted-foreground/70">
                            {log.actor_id
                              ? `${log.actor_id.slice(0, 8)}…`
                              : 'System'}
                          </span>

                          <span className="text-[10px] font-mono text-muted-foreground/50">
                            Work Item · {log.work_item_id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(log.created_on)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && logs.length >= limit && (
          <div className="flex justify-center">
            <button
              onClick={() => setOffset((prev) => prev + limit)}
              className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors text-sm"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}