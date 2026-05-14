'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, ChevronLeft, ChevronRight, Check, XCircle,
  RefreshCw, Bold, Italic, Link, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getToken } from '@/lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8010'


// ── Types ─────────────────────────────────────────────────────────────────────

export interface Customer {
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

export interface WorkItem {
  id: string
  customer_id: string
  assigned_reviewer_id: string | null
  ai_output: string | null
  edited_output: string | null
  reviewer_note: string | null
  status: string
  ai_confidence_score: number | null
  generation_version: number
  created_on: string
}

export interface ReviewCard {
  workItem: WorkItem
  customer: Customer
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// ── Main overlay ──────────────────────────────────────────────────────────────

interface WorkItemReviewOverlayProps {
  initialCards: ReviewCard[]
  onClose: () => void
}

type SlideDir = 'left' | 'right' | null

export function WorkItemReviewOverlay({ initialCards, onClose }: WorkItemReviewOverlayProps) {
  const [cards, setCards] = useState<ReviewCard[]>(initialCards)
  const [index, setIndex] = useState(0)
  const [slideDir, setSlideDir] = useState<SlideDir>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  const current = cards[index] ?? null

  // Sync editor content when card changes
  useEffect(() => {
    if (!current) return
    const text = current.workItem.edited_output ?? current.workItem.ai_output ?? ''
    if (editorRef.current) editorRef.current.innerHTML = text
    setShowRejectInput(false)
    setRejectNote('')
    setError('')
  }, [index, current?.workItem.id])

  const animateAndAdvance = useCallback((dir: SlideDir, afterFn?: () => void) => {
    setSlideDir(dir)
    setIsAnimating(true)
    setTimeout(() => {
      afterFn?.()
      setCards((prev) => prev.filter((_, i) => i !== index))
      setIndex((i) => Math.max(0, Math.min(i, cards.length - 2)))
      setSlideDir(null)
      setIsAnimating(false)
    }, 400)
  }, [cards.length, index])

  const navigate = (dir: 'prev' | 'next') => {
    if (isAnimating) return
    if (dir === 'prev' && index > 0) setIndex((i) => i - 1)
    if (dir === 'next' && index < cards.length - 1) setIndex((i) => i + 1)
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  })

  const handleApprove = async () => {
    if (!current || isAnimating || loading || regenerating) return
    setLoading(true)
    setError('')

    const currentHtml = editorRef.current?.innerHTML ?? ''
    const originalText = current.workItem.edited_output ?? current.workItem.ai_output ?? ''
    const hasEdits = currentHtml !== originalText && currentHtml.trim() !== ''

    if (hasEdits) {
      const editRes = await fetch(`${API_BASE_URL}/work-items/${current.workItem.id}/edit`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ edited_output: currentHtml }),
      })
      if (!editRes.ok) {
        setError('Failed to save edits before approving.')
        setLoading(false)
        return
      }
    }

    const res = await fetch(`${API_BASE_URL}/work-items/${current.workItem.id}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    })
    setLoading(false)
    if (!res.ok) { setError('Failed to approve. Please try again.'); return }
    animateAndAdvance('right')
  }

  const handleReject = async () => {
    if (!current || isAnimating || loading || regenerating) return
    if (!showRejectInput) { setShowRejectInput(true); return }
    if (!rejectNote.trim()) { setError('Please enter a rejection note.'); return }
    setLoading(true)
    setError('')
    const res = await fetch(`${API_BASE_URL}/work-items/${current.workItem.id}/reject`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reviewer_note: rejectNote }),
    })
    setLoading(false)
    if (!res.ok) { setError('Failed to reject. Please try again.'); return }
    animateAndAdvance('left')
  }

  const handleRegenerate = async () => {
    if (!current || loading || regenerating) return
    setRegenerating(true)
    setError('')
    if (editorRef.current) editorRef.current.innerHTML = ''
    const res = await fetch(`${API_BASE_URL}/work-items/${current.workItem.id}/regenerate`, {
      method: 'POST',
      headers: authHeaders(),
    })
    setRegenerating(false)
    if (!res.ok) { setError('Failed to regenerate.'); return }
    const updated: WorkItem = await res.json()
    if (editorRef.current) editorRef.current.innerHTML = updated.edited_output ?? updated.ai_output ?? ''
    setCards((prev) =>
      prev.map((c) => c.workItem.id === updated.id ? { ...c, workItem: updated } : c)
    )
  }

  const execFormat = (cmd: string) => {
    document.execCommand(cmd, false)
    editorRef.current?.focus()
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check size={32} className="text-green-400" />
          </div>
          <h3 className="text-lg font-semibold">Queue cleared!</h3>
          <p className="text-muted-foreground text-sm">All pending work items have been reviewed.</p>
          <button
            onClick={onClose}
            className="mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const { workItem, customer } = current
  const confidence = workItem.ai_confidence_score ?? 0

  const slideClass =
    slideDir === 'right'
      ? 'translate-x-[130%] rotate-12 opacity-0'
      : slideDir === 'left'
      ? '-translate-x-[130%] -rotate-12 opacity-0'
      : 'translate-x-0 rotate-0 opacity-100'

  // Short job id display
  const jobId = `job-${workItem.id.slice(0, 8)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors z-20"
      >
        <X size={16} />
      </button>

      {/* Top navigation: arrows + dot indicators */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
        <button
          onClick={() => navigate('prev')}
          disabled={index === 0 || isAnimating}
          className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center disabled:opacity-30 hover:bg-secondary transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5">
          {cards.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'w-6 bg-primary' : 'w-2 bg-border'
              )}
            />
          ))}
        </div>
        <button
          onClick={() => navigate('next')}
          disabled={index >= cards.length - 1 || isAnimating}
          className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center disabled:opacity-30 hover:bg-secondary transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Ghost stacked cards behind */}
      {cards.slice(index + 1, index + 3).map((_, depth) => (
        <div
          key={depth}
          className="absolute rounded-2xl border border-border bg-card"
          style={{
            width: 920,
            height: 620,
            transform: `translateY(${(depth + 1) * 10}px) scale(${1 - (depth + 1) * 0.025})`,
            opacity: 1 - (depth + 1) * 0.3,
            zIndex: 5 - depth,
          }}
        />
      ))}

      {/* ── Main card ── */}
      <div
        className={cn(
          'relative bg-card border border-primary rounded-2xl shadow-2xl overflow-hidden z-10',
          'transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          slideClass
        )}
        style={{ width: 920, height: 620 }}
      >
        <div className="flex h-full">

          {/* ════════════════════════════════════════
              LEFT PANEL — Lead info
          ════════════════════════════════════════ */}
          <div className="w-56 flex-shrink-0 border-r border-border flex flex-col">
            <div className="flex-1 p-5 overflow-y-auto">

              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full border-2 border-border bg-secondary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {initials(customer.lead_name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{customer.lead_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                  {customer.phone && (
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  )}
                </div>
              </div>

              {/* Confidence bar + Regenerate */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap size={11} />
                    AI Confidence
                  </div>
                  <span className="text-xs font-semibold">{confidence}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={loading || regenerating}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
                  {regenerating ? 'Regenerating' : 'Regenerate'}
                </button>
              </div>

              {/* Company / Source / Priority */}
              {customer.company_name && (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Company</p>
                  <p className="text-xs font-medium">{customer.company_name}</p>
                </div>
              )}
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-0.5">Source</p>
                <p className="text-xs capitalize">{customer.source}</p>
              </div>
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-0.5">Priority</p>
                <p className="text-xs capitalize">{customer.priority}</p>
              </div>

              {/* Tags */}
              {customer.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Job ID + Created */}
            <div className="px-5 py-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground space-y-0.5">
              <div className="flex justify-between">
                <span>Job ID:</span>
                <span className="font-mono">{jobId}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{formatDate(workItem.created_on)}</span>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              CENTER PANEL — Editable draft
          ════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-secondary/10 flex-shrink-0">
              <span className="text-xs text-muted-foreground mr-2">AI-Generated Email Draft</span>
              <div className="h-4 w-px bg-border mx-1" />
              <button
                onClick={() => execFormat('bold')}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-secondary transition-colors"
                title="Bold"
              >
                <Bold size={13} />
              </button>
              <button
                onClick={() => execFormat('italic')}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-secondary transition-colors"
                title="Italic"
              >
                <Italic size={13} />
              </button>
              <button
                onClick={() => execFormat('createLink')}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-secondary transition-colors"
                title="Link"
              >
                <Link size={13} />
              </button>
            </div>

            {/* Editable content */}
            <div className="relative flex-1 min-h-0">
              {regenerating && (
                <div className="absolute inset-0 z-10 bg-card p-5">
                  <div className="space-y-3">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-full animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-11/12 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
                    <div className="pt-4 space-y-3">
                      <div className="h-3 w-full animate-pulse rounded bg-secondary" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-secondary" />
                      <div className="h-3 w-3/5 animate-pulse rounded bg-secondary" />
                    </div>
                  </div>
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable={!regenerating}
                suppressContentEditableWarning
                className="h-full overflow-y-auto p-5 text-sm leading-relaxed outline-none focus:ring-0 whitespace-pre-wrap"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex-shrink-0">
                {error}
              </div>
            )}

            {/* Reject note */}
            {showRejectInput && (
              <div className="px-4 pb-2 flex-shrink-0">
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Reason for rejection (required)…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/50 placeholder-muted-foreground"
                />
              </div>
            )}

            {/* Action buttons — matching wireframe: Accept and send | Reject */}
            <div className="px-4 py-3 border-t border-border flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleApprove}
                disabled={loading || regenerating || isAnimating}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-400 text-sm transition-all disabled:opacity-50"
              >
                <Check size={15} />
                Accept and send
              </button>
              <button
                onClick={handleReject}
                disabled={loading || regenerating || isAnimating}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-all disabled:opacity-50',
                  showRejectInput
                    ? 'bg-destructive/10 border-destructive/40 text-destructive'
                    : 'border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive'
                )}
              >
                <XCircle size={15} />
                {showRejectInput ? 'Confirm Reject' : 'Reject'}
              </button>
              {showRejectInput && (
                <button
                  onClick={() => { setShowRejectInput(false); setRejectNote(''); setError('') }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════
              RIGHT PANEL — Status, timeline, original message
          ════════════════════════════════════════ */}
          <div className="w-60 flex-shrink-0 flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto">

              {/* Status */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground">status</span>
                <span className="px-3 py-1 rounded-lg border border-border text-xs font-medium capitalize">
                  {workItem.status}
                </span>
              </div>

              {/* Progress stepper slider — like the wireframe */}
              <div className="mb-5">
                <div className="flex items-center gap-1 mb-3">
                  {[0, 1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        step < 3 ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="rounded-xl bg-secondary/40 border border-border p-3 mb-4">
                <p className="text-xs font-semibold mb-3">Activity Timeline</p>
                <div className="space-y-0">
                  {[
                    { label: 'Email generated by AI', sub: '10:30 AM', done: true },
                    { label: 'Assigned to reviewer queue', sub: '10:30 AM', done: true },
                    { label: 'Loaded in review workspace', sub: '10:35 AM', done: true },
                    { label: 'Awaiting reviewer action', sub: 'Pending', done: false },
                  ].map((step, i, arr) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-3 h-3 rounded-full border-2 mt-0.5 flex-shrink-0',
                          step.done ? 'bg-primary border-primary' : 'bg-transparent border-muted-foreground/30'
                        )} />
                        {i < arr.length - 1 && (
                          <div className="w-px bg-border flex-1 my-1" style={{ minHeight: 16 }} />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className={cn('text-xs leading-snug', step.done ? 'text-foreground' : 'text-muted-foreground')}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground/60">{step.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Original message — always visible, matching wireframe */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">original message</p>
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground leading-relaxed min-h-[80px]">
                  {customer.original_message ?? <span className="opacity-40 italic">No message provided.</span>}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom hint */}
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
        {index + 1} of {cards.length} pending
      </p>
    </div>
  )
}
