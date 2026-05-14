'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { WorkItemReviewOverlay } from './work-item-review-overlay'
import { WorkItemInfoBar } from './work-item-info-bar'
import { cn } from '@/lib/utils'
import { getToken } from '@/lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8010'

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    return body?.detail ?? body?.message ?? fallback
  } catch {
    return fallback
  }
}

interface Customer {
  id: string
  organization_id: string
  lead_name: string
  company_name: string | null
  email: string
  phone: string | null
  lead_context: string | null
  original_message: string | null
  source: string
  priority: string
  tags: string[]
  created_by: string
  created_on: string
  updated_on: string
}

interface WorkItem {
  id: string
  organization_id: string
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

interface ReviewCard {
  workItem: WorkItem
  customer: Customer
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function WorkQueueTable() {
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'confidence' | 'createdAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [reviewCards, setReviewCards] = useState<ReviewCard[] | null>(null)

  // Info bar state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null)

  const itemsPerPage = 10

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setError('')
      try {
        const token = getToken()
        if (!token) { router.replace('/login'); return }
        const headers = { Authorization: `Bearer ${token}` }
        const [customersRes, workItemsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/customers`, { headers }),
          fetch(`${API_BASE_URL}/work-items`, { headers }),
        ])
        if (!customersRes.ok) throw new Error(await readApiError(customersRes, 'Failed to load customers'))
        if (!workItemsRes.ok) throw new Error(await readApiError(workItemsRes, 'Failed to load work items'))
        const newCustomers: Customer[] = await customersRes.json()
        const newWorkItems: WorkItem[] = await workItemsRes.json()
        setCustomers(newCustomers)
        setWorkItems(newWorkItems)
        // Keep the info bar work item fresh after a silent refresh
        setSelectedWorkItem((prev) => {
          if (!prev) return prev
          return newWorkItems.find((w) => w.id === prev.id) ?? prev
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [router]
  )

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const hasDraftInProgress = workItems.some(
      (item) => item.status === 'processing' || item.status === 'regenerating'
    )
    if (!hasDraftInProgress) return
    const intervalId = window.setInterval(() => loadData(true), 5000)
    return () => window.clearInterval(intervalId)
  }, [loadData, workItems])

  const workItemByCustomerId = useMemo(() => {
    return workItems.reduce<Record<string, WorkItem>>((acc, item) => {
      const current = acc[item.customer_id]
      if (!current || item.created_on > current.created_on) acc[item.customer_id] = item
      return acc
    }, {})
  }, [workItems])

  const rows = useMemo(() => {
    return customers
      .map((c) => ({ customer: c, workItem: workItemByCustomerId[c.id] ?? null }))
      .filter((r) => r.workItem !== null) as { customer: Customer; workItem: WorkItem }[]
  }, [customers, workItemByCustomerId])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    let result = query
      ? rows.filter(({ customer }) =>
          [customer.lead_name, customer.company_name, customer.email, customer.source]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(query))
        )
      : rows
    result = [...result].sort((a, b) => {
      if (sortBy === 'confidence') {
        const aVal = a.workItem.ai_confidence_score ?? -1
        const bVal = b.workItem.ai_confidence_score ?? -1
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aVal = a.workItem.created_on
      const bVal = b.workItem.created_on
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
    return result
  }, [rows, search, sortBy, sortOrder])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const start = (currentPage - 1) * itemsPerPage
  const paged = filtered.slice(start, start + itemsPerPage)

  const toggleSort = (field: 'confidence' | 'createdAt') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortOrder('desc') }
  }

  const reviewableRows = rows.filter((r) =>
    r.workItem.status === 'pending_review' &&
    Boolean(r.workItem.edited_output || r.workItem.ai_output)
  )
  const pendingCount = reviewableRows.length

  const openReviewOverlay = () => setReviewCards(reviewableRows)

  const handleRowClick = (customer: Customer, workItem: WorkItem) => {
    // Toggle off if same row clicked
    if (selectedWorkItem?.id === workItem.id) {
      setSelectedCustomer(null)
      setSelectedWorkItem(null)
    } else {
      setSelectedCustomer(customer)
      setSelectedWorkItem(workItem)
    }
  }

  const closeInfoBar = () => {
    setSelectedCustomer(null)
    setSelectedWorkItem(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading work items…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive text-sm">
        {error}
      </div>
    )
  }

  return (
    <>
      {reviewCards && (
        <WorkItemReviewOverlay initialCards={reviewCards} onClose={() => setReviewCards(null)} />
      )}

      {/* Info bar — fixed right-side panel, rendered at this level */}
      <WorkItemInfoBar
        customer={selectedCustomer}
        workItem={selectedWorkItem}
        onClose={closeInfoBar}
      />

      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads, companies…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-secondary text-sm border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary border border-border transition-colors text-sm">
            <Filter size={16} />
            Filter
          </button>

          {/* Pending Reviews */}
          <button
            onClick={openReviewOverlay}
            disabled={pendingCount === 0}
            className={cn(
              'ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
              pendingCount > 0
                ? 'bg-accent text-accent-foreground border-accent hover:opacity-90 shadow-sm'
                : 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
            )}
            aria-label="Open pending reviews"
          >
            Pending Reviews
            {pendingCount > 0 && (
              <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Reviewer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleSort('confidence')}
                      className="flex items-center gap-1 ml-auto hover:text-foreground text-muted-foreground transition-colors"
                    >
                      <span className="text-xs font-semibold">Confidence</span>
                      {sortBy === 'confidence' &&
                        (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleSort('createdAt')}
                      className="flex items-center gap-1 ml-auto hover:text-foreground text-muted-foreground transition-colors"
                    >
                      <span className="text-xs font-semibold">Created</span>
                      {sortBy === 'createdAt' &&
                        (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length > 0 ? (
                  paged.map(({ customer, workItem }) => {
                    const isSelected = selectedWorkItem?.id === workItem.id
                    return (
                      <tr
                        key={workItem.id}
                        onClick={() => handleRowClick(customer, workItem)}
                        className={cn(
                          'border-b border-border transition-colors cursor-pointer select-none',
                          isSelected
                            ? 'bg-primary/5 border-l-2 border-l-primary'
                            : 'hover:bg-secondary/30'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                              {initials(customer.lead_name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{customer.lead_name}</p>
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {customer.company_name ?? <span className="opacity-40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                          {workItem.assigned_reviewer_id
                            ? workItem.assigned_reviewer_id.slice(0, 8) + '…'
                            : <span className="font-sans opacity-40">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={workItem.status === 'regenerating' ? 'processing' : workItem.status}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const score = workItem.ai_confidence_score ?? 0
                            return (
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary to-accent"
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium w-8 text-right">{score}%</span>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground text-right">
                          {relativeTime(workItem.created_on)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="opacity-20" />
                        <p>No work items found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {start + 1} to {Math.min(start + itemsPerPage, filtered.length)} of{' '}
              {filtered.length} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-sm transition-colors',
                    currentPage === page
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-secondary'
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}