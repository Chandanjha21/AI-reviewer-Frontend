'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Tag,
  UserRound,
} from 'lucide-react'

import { DashboardLayout } from '@/components/dashboard-layout'
import { StatusBadge, type StatusType } from '@/components/status-badge'
import { getToken } from '@/lib/auth'
import { cn } from '@/lib/utils'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
  'https://ai-reviewer-backend-1glg.onrender.com'

type Customer = {
  id: string
  organization_id: string
  lead_name: string
  company_name?: string | null
  email: string
  phone?: string | null
  lead_context?: string | null
  original_message: string
  source?: string | null
  priority?: string | null
  tags: string[]
  created_by: string
  created_on?: string | null
  updated_on?: string | null
}

type WorkItemStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'regenerating'
  | 'processing'
  | 'sent'
  | 'failed'

type WorkItem = {
  id: string
  customer_id: string
  status: WorkItemStatus
  created_on?: string | null
  updated_on?: string | null
}

type LeadStatus = {
  badgeStatus: StatusType
  label: string
}

const statusMap: Record<WorkItemStatus, LeadStatus> = {
  pending_review: { badgeStatus: 'pending_review', label: 'Pending review' },
  approved: { badgeStatus: 'approved', label: 'Approved' },
  rejected: { badgeStatus: 'rejected', label: 'Rejected' },
  regenerating: { badgeStatus: 'processing', label: 'Regenerating' },
  processing: { badgeStatus: 'processing', label: 'Processing' },
  sent: { badgeStatus: 'sent', label: 'Followed up' },
  failed: { badgeStatus: 'failed', label: 'Failed' },
}

export default function LeadsPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadLeads() {
      setLoading(true)
      setError('')

      try {
        const token = getToken()
        if (!token) {
          router.replace('/login')
          return
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        }

        const [customersResponse, workItemsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/customers`, { headers }),
          fetch(`${API_BASE_URL}/work-items`, { headers }),
        ])

        if (!customersResponse.ok) {
          throw new Error(await readApiError(customersResponse, 'Failed to load leads'))
        }
        if (!workItemsResponse.ok) {
          throw new Error(await readApiError(workItemsResponse, 'Failed to load work item statuses'))
        }

        setCustomers(await customersResponse.json())
        setWorkItems(await workItemsResponse.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leads')
      } finally {
        setLoading(false)
      }
    }

    loadLeads()
  }, [router])

  const workItemByCustomerId = useMemo(() => {
    return workItems.reduce<Record<string, WorkItem>>((acc, item) => {
      const current = acc[item.customer_id]
      if (!current || String(item.created_on || '') > String(current.created_on || '')) {
        acc[item.customer_id] = item
      }
      return acc
    }, {})
  }, [workItems])

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers

    return customers.filter((lead) => {
      const tags = lead.tags.join(' ')
      return [
        lead.lead_name,
        lead.company_name,
        lead.email,
        lead.phone,
        lead.source,
        lead.priority,
        tags,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [customers, search])

  const followedUpCount = customers.filter((lead) => {
    return workItemByCustomerId[lead.id]?.status === 'sent'
  }).length

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground">
              View lead details, tags, priority, and whether each lead has been followed up.
            </p>
          </div>

          <Link
            href="/leads/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create lead
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total leads" value={customers.length} />
          <SummaryCard label="Followed up" value={followedUpCount} />
          <SummaryCard label="Needs attention" value={Math.max(customers.length - followedUpCount, 0)} />
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search leads, companies, email, tags..."
                className="h-10 w-full rounded-md border border-border bg-secondary/40 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading leads
            </div>
          ) : error ? (
            <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <UserRound className="h-10 w-10 opacity-40" />
              <div>
                <p className="font-medium text-foreground">No leads found</p>
                <p className="mt-1 text-sm">Create a lead to start AI draft generation.</p>
              </div>
              <Link
                href="/leads/new"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create lead
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tags</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Follow-up status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const workItem = workItemByCustomerId[lead.id]
                    const status = workItem
                      ? statusMap[workItem.status]
                      : { badgeStatus: 'unassigned' as const, label: 'Not assigned' }

                    return (
                      <tr key={lead.id} className="border-b border-border transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              {getInitials(lead.lead_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{lead.lead_name}</p>
                              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5" />
                                {lead.company_name || 'No company'}
                              </p>
                              {lead.source && (
                                <p className="mt-1 text-xs capitalize text-muted-foreground">Source: {lead.source}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1 text-sm">
                            <p className="flex items-center gap-2 text-foreground">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              {lead.email}
                            </p>
                            <p className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {lead.phone || 'No phone'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          {lead.tags.length > 0 ? (
                            <div className="flex max-w-xs flex-wrap gap-1.5">
                              {lead.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs text-muted-foreground"
                                >
                                  <Tag className="h-3 w-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No tags</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className={cn(
                            'inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize',
                            priorityStyle(lead.priority),
                          )}>
                            {lead.priority || 'normal'}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusBadge status={status.badgeStatus} label={status.label} />
                        </td>
                        <td className="px-4 py-4 text-right align-top text-sm text-muted-foreground">
                          {formatDate(lead.created_on)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json()
    return data?.detail || fallback
  } catch {
    return fallback
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function priorityStyle(priority?: string | null) {
  switch (priority) {
    case 'urgent':
      return 'border-red-500/20 bg-red-500/10 text-red-600'
    case 'high':
      return 'border-orange-500/20 bg-orange-500/10 text-orange-600'
    case 'low':
      return 'border-muted bg-secondary/40 text-muted-foreground'
    default:
      return 'border-blue-500/20 bg-blue-500/10 text-blue-600'
  }
}
