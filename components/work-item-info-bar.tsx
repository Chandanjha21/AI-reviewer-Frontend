'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, Zap, Mail, MessageSquare, Clock, User,
  Building2, Tag, Send, AlertCircle, Eye,
  PlusCircle, CheckCircle2, XCircle, RefreshCw,
  ArrowRightLeft, Loader2, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getToken } from '@/lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ai-reviewer-backend-1.onrender.com'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  lead_name: string
  company_name: string | null
  email: string
  phone: string | null
  original_message: string | null
  source: string
  priority: string
  tags: string[]
  created_on: string
}

interface WorkItem {
  id: string
  customer_id: string
  assigned_reviewer_id: string | null
  ai_output: string | null
  edited_output: string | null
  reviewer_note: string | null
  status: 'pending_review' | 'approved' | 'rejected' | 'regenerating' | 'processing' | 'sent' | 'failed'
  ai_confidence_score: number | null
  generation_version: number
  processing_started_at: string | null
  processed_at: string | null
  created_on: string
  updated_on: string
}

interface AuditLog {
  id: string
  work_item_id: string
  actor_id: string
  actor_type: 'admin' | 'reviewer' | 'system'
  action: string
  from_status: string | null
  to_status: string | null
  metadata: Record<string, unknown>
  created_on: string
}

interface WorkItemInfoBarProps {
  customer: Customer | null
  workItem: WorkItem | null
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const STATUS_META: Record<WorkItem['status'], { label: string; color: string; dot: string }> = {
  sent:           { label: 'Sent',           color: 'text-emerald-400', dot: 'bg-emerald-400' },
  approved:       { label: 'Approved',       color: 'text-blue-400',    dot: 'bg-blue-400'    },
  pending_review: { label: 'Pending Review', color: 'text-amber-400',   dot: 'bg-amber-400'   },
  processing:     { label: 'Processing',     color: 'text-violet-400',  dot: 'bg-violet-400'  },
  regenerating:   { label: 'Regenerating',   color: 'text-violet-400',  dot: 'bg-violet-400'  },
  rejected:       { label: 'Rejected',       color: 'text-rose-400',    dot: 'bg-rose-400'    },
  failed:         { label: 'Failed',         color: 'text-rose-400',    dot: 'bg-rose-400'    },
}

// Map each action to a human-readable label + icon + colour
const ACTION_META: Record<
  string,
  { label: string; icon: React.ElementType; iconColor: string; dotColor: string; ringColor: string }
> = {
  item_created:   { label: 'Work item created',      icon: PlusCircle,     iconColor: 'text-violet-400', dotColor: 'bg-violet-500',  ringColor: 'ring-violet-500/20'  },
  item_approved:  { label: 'Approved by reviewer',   icon: CheckCircle2,   iconColor: 'text-emerald-400',dotColor: 'bg-emerald-500', ringColor: 'ring-emerald-500/20' },
  item_rejected:  { label: 'Rejected by reviewer',   icon: XCircle,        iconColor: 'text-rose-400',   dotColor: 'bg-rose-500',    ringColor: 'ring-rose-500/20'    },
  item_edited:    { label: 'Draft edited',            icon: Activity,       iconColor: 'text-blue-400',   dotColor: 'bg-blue-500',    ringColor: 'ring-blue-500/20'    },
  item_sent:      { label: 'Email sent to lead',      icon: Send,           iconColor: 'text-emerald-400',dotColor: 'bg-emerald-500', ringColor: 'ring-emerald-500/20' },
  status_updated: { label: 'Status updated',          icon: ArrowRightLeft, iconColor: 'text-amber-400',  dotColor: 'bg-amber-500',   ringColor: 'ring-amber-500/20'   },
  regenerated:    { label: 'Draft regenerated',       icon: RefreshCw,      iconColor: 'text-violet-400', dotColor: 'bg-violet-500',  ringColor: 'ring-violet-500/20'  },
}

function getActionMeta(action: string) {
  return ACTION_META[action] ?? {
    label: action.replace(/_/g, ' '),
    icon: Activity,
    iconColor: 'text-muted-foreground',
    dotColor: 'bg-border',
    ringColor: 'ring-border/20',
  }
}

// Friendly description of what happened
function describeLog(log: AuditLog): string {
  const { action, from_status, to_status, metadata } = log

  if (action === 'status_updated' && from_status && to_status) {
    const reason = metadata?.reason as string | undefined
    if (reason) return `${from_status} → ${to_status} · ${reason.replace(/_/g, ' ')}`
    return `${from_status} → ${to_status}`
  }
  if (action === 'item_created' && to_status) {
    return `Created · initial status: ${to_status}`
  }
  const meta = getActionMeta(action)
  return meta.label
}

function confidenceGradient(score: number) {
  if (score >= 80) return 'from-emerald-500 to-teal-400'
  if (score >= 55) return 'from-amber-500 to-yellow-400'
  return 'from-rose-500 to-orange-400'
}

function confidenceLabel(score: number) {
  if (score >= 80) return 'High'
  if (score >= 55) return 'Medium'
  return 'Low'
}

function isSentOrApproved(status: WorkItem['status']) {
  return status === 'sent' || status === 'approved'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkItemInfoBar({ customer, workItem, onClose }: WorkItemInfoBarProps) {
  const isOpen = !!(customer && workItem)
  const panelRef = useRef<HTMLDivElement>(null)

  // Audit log state — keyed by workItem.id for lazy cache
  const auditCache = useRef<Record<string, AuditLog[]>>({})
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')

  // Fetch audit logs lazily — only once per work item id
  const fetchAuditLogs = useCallback(async (workItemId: string) => {
    if (auditCache.current[workItemId]) {
      setAuditLogs(auditCache.current[workItemId])
      return
    }
    setAuditLoading(true)
    setAuditError('')
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/work-items/${workItemId}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load timeline')
      const data: AuditLog[] = await res.json()
      auditCache.current[workItemId] = data
      setAuditLogs(data)
    } catch {
      setAuditError('Could not load activity timeline.')
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // Fire fetch when a new work item is opened
  useEffect(() => {
    if (!workItem) { setAuditLogs([]); return }
    fetchAuditLogs(workItem.id)
  }, [workItem?.id, fetchAuditLogs])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Click-outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    if (isOpen) {
      const t = setTimeout(() => document.addEventListener('mousedown', handler), 80)
      return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
    }
  }, [isOpen, onClose])

  const score      = workItem?.ai_confidence_score ?? 0
  const status     = workItem?.status ?? 'pending_review'
  const statusMeta = STATUS_META[status] ?? STATUS_META.pending_review
  const sent       = isSentOrApproved(status)
  const responseBody = workItem ? (workItem.edited_output ?? workItem.ai_output ?? '') : ''
  const jobId      = workItem ? `job-${workItem.id.slice(0, 8)}` : ''
  const wasEdited  = !!workItem?.edited_output

  return (
    <>
      {/* Backdrop */}
      <div className={cn(
        'fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )} />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 h-full z-40 flex flex-col',
          'w-[420px] bg-card border-l border-border shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {isOpen && customer && workItem && (
          <>
            {/* ── Header ── */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 select-none">
                    {initials(customer.lead_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{customer.lead_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                    {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                  aria-label="Close info bar"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Meta chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className={cn('flex items-center gap-1.5 font-medium', statusMeta.color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dot)} />
                  {statusMeta.label}
                </div>
                <span className="text-border select-none">·</span>
                {customer.company_name && (
                  <>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Building2 size={11} />
                      <span className="truncate max-w-[100px]">{customer.company_name}</span>
                    </div>
                    <span className="text-border select-none">·</span>
                  </>
                )}
                <span className="text-muted-foreground capitalize">{customer.source}</span>
                <span className="text-border select-none">·</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide text-[10px]',
                  customer.priority === 'high'   ? 'bg-rose-500/10 text-rose-400'
                  : customer.priority === 'medium' ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-secondary text-muted-foreground'
                )}>
                  {customer.priority}
                </span>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Confidence */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap size={12} />
                    <span className="font-medium">AI Confidence</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      score >= 80 ? 'bg-emerald-500/10 text-emerald-400'
                      : score >= 55 ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-rose-500/10 text-rose-400'
                    )}>
                      {confidenceLabel(score)}
                    </span>
                    <span className="text-sm font-bold">{score}%</span>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', confidenceGradient(score))}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground/40">0%</span>
                  <span className="text-[10px] text-muted-foreground/40">100%</span>
                </div>
              </div>

              {/* Original Message */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <MessageSquare size={12} className="text-muted-foreground" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Original Message</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground leading-relaxed min-h-[80px]">
                  {customer.original_message ?? <span className="italic opacity-40">No message provided.</span>}
                </div>
              </div>

              {/* Follow-up / Sent Response */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {sent ? 'Sent Response' : 'Follow-up Response'}
                    </p>
                  </div>
                  {!sent && (
                    <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium">
                      <Eye size={9} />
                      Preview · Not sent
                    </div>
                  )}
                  {sent && (
                    <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                      <Send size={9} />
                      {status === 'approved' ? 'Approved' : 'Sent'}
                      {wasEdited ? ' · Edited' : ' · AI Draft'}
                    </div>
                  )}
                </div>
                {responseBody ? (
                  <div
                    className={cn(
                      'rounded-xl border p-4 text-sm leading-relaxed min-h-[120px] prose prose-sm max-w-none',
                      sent
                        ? 'border-border bg-secondary/20 text-foreground prose-invert'
                        : 'border-amber-500/20 bg-amber-500/5 text-muted-foreground prose-invert'
                    )}
                    dangerouslySetInnerHTML={{ __html: responseBody }}
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground italic min-h-[80px] flex items-center justify-center">
                    <span className="opacity-40">
                      {status === 'processing' || status === 'regenerating'
                        ? 'AI is generating a response…'
                        : 'No response generated yet.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Rejection Note */}
              {workItem.reviewer_note && status === 'rejected' && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <AlertCircle size={12} className="text-rose-400" />
                    <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Rejection Note</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-muted-foreground leading-relaxed">
                    {workItem.reviewer_note}
                  </div>
                </div>
              )}

              {/* ── Activity Timeline ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Activity Timeline</p>
                  </div>
                  {auditLogs.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/50">
                      {auditLogs.length} event{auditLogs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {auditLoading && (
                  <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    Loading timeline…
                  </div>
                )}

                {auditError && !auditLoading && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-400">
                    {auditError}
                  </div>
                )}

                {!auditLoading && !auditError && auditLogs.length === 0 && (
                  <div className="rounded-xl border border-border bg-secondary/20 px-4 py-5 text-xs text-muted-foreground italic text-center">
                    No activity recorded yet.
                  </div>
                )}

                {!auditLoading && auditLogs.length > 0 && (
                  <div className="relative">
                    {/* Vertical rail */}
                    <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />

                    <div className="space-y-0">
                      {auditLogs.map((log, i) => {
                        const meta = getActionMeta(log.action)
                        const Icon = meta.icon
                        const isLast = i === auditLogs.length - 1

                        return (
                          <div key={log.id} className="relative flex gap-3 group">
                            {/* Icon bubble */}
                            <div className={cn(
                              'relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center',
                              'bg-card border border-border ring-4',
                              meta.ringColor,
                              'mt-1'
                            )}>
                              <Icon size={12} className={meta.iconColor} />
                            </div>

                            {/* Content */}
                            <div className={cn(
                              'flex-1 pb-4',
                              isLast && 'pb-0'
                            )}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium leading-snug text-foreground">
                                    {getActionMeta(log.action).label}
                                  </p>
                                  {/* Sub-description: status transition or metadata hint */}
                                  {log.action === 'status_updated' && log.from_status && log.to_status && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] text-muted-foreground/60 capitalize">{log.from_status.replace(/_/g, ' ')}</span>
                                      <span className="text-[10px] text-muted-foreground/40">→</span>
                                      <span className="text-[10px] text-muted-foreground/60 capitalize">{log.to_status.replace(/_/g, ' ')}</span>
                                    </div>
                                  )}
                                  {log.action === 'item_created' && log.to_status && (
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 capitalize">
                                      Initial status: {log.to_status.replace(/_/g, ' ')}
                                    </p>
                                  )}
                                  {/* Metadata reason chip */}
                                  {(log.metadata?.reason as string | undefined) && (
                                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground/70 capitalize">
                                      {(log.metadata.reason as string).replace(/_/g, ' ')}
                                    </span>
                                  )}
                                  {/* Actor */}
                                  <div className="flex items-center gap-1 mt-1">
                                    <User size={9} className="text-muted-foreground/40" />
                                    <span className="text-[10px] text-muted-foreground/50 capitalize">{log.actor_type}</span>
                                    <span className="text-[10px] text-muted-foreground/30">·</span>
                                    <span className="text-[10px] font-mono text-muted-foreground/40">
                                        {log.actor_id ? `${log.actor_id.slice(0, 8)}…` : 'System'}
                                    </span>
                                  </div>
                                </div>
                                {/* Timestamp */}
                                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 pt-0.5 text-right">
                                  {formatTime(log.created_on)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {customer.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Tag size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-border bg-secondary/10">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock size={10} className="opacity-50" />
                  <span className="opacity-50">Job ID:</span>
                  <span className="font-mono">{jobId}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} className="opacity-50" />
                  <span className="opacity-50">Created:</span>
                  <span>{formatDate(workItem.created_on)}</span>
                </div>
                {workItem.assigned_reviewer_id && (
                  <div className="flex items-center gap-1.5 col-span-2">
                    <User size={10} className="opacity-50" />
                    <span className="opacity-50">Reviewer:</span>
                    <span className="font-mono">{workItem.assigned_reviewer_id.slice(0, 8)}…</span>
                  </div>
                )}
                {/* <div className="flex items-center gap-1.5">
                  <span className="opacity-50">Version:</span>
                  <span>v{workItem.generation_version}</span>
                </div> */}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}