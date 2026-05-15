'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckCircle2, Clock3, MailCheck, RotateCcw, XCircle, Loader2 } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard-layout'
import { KPICard } from '@/components/kpi-card'
import { useAuth } from '@/components/auth/auth-provider'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ai-reviewer-backend-1.onrender.com'

interface WorkItem {
  id: string
  customer_id: string
  assigned_reviewer_id: string | null
  status: string
  ai_confidence_score: number | null
  generation_version: number
  created_on: string
  updated_on: string
}

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  approved:   '#16a34a',
  rejected:   '#dc2626',
  sent:       '#2563eb',
  processing: '#8b5cf6',
  failed:     '#6b7280',
}

function ChartPlaceholder() {
  return <div className="h-full w-full rounded-md bg-secondary/40 animate-pulse" />
}

export default function DashboardPage() {
  const router = useRouter()
  const { loading: authLoading, user } = useAuth()

  const [mounted, setMounted] = useState(false)
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!authLoading && user?.role === 'reviewer') {
      router.replace('/queue')
    }
  }, [authLoading, router, user])

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return

    async function loadData() {
      setLoadingData(true)
      setError('')
      try {
        const headers = { Authorization: `Bearer ${getToken()}` }
        const [workItemsRes, usersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/work-items`, { headers }),
          fetch(`${API_BASE_URL}/users/`, { headers }),
        ])
        if (!workItemsRes.ok) throw new Error('Failed to load work items')
        if (!usersRes.ok) throw new Error('Failed to load users')
        setWorkItems(await workItemsRes.json())
        setUsers(await usersRes.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [authLoading, user])

  // ── Derived stats ─────────────────────────────────────────────────────────

  const kpis = useMemo(() => ({
    pending:    workItems.filter((w) => w.status === 'pending_review').length,
    approved:   workItems.filter((w) => w.status === 'approved').length,
    sent:       workItems.filter((w) => w.status === 'sent').length,
    failed:     workItems.filter((w) => w.status === 'failed').length,
    rejected:   workItems.filter((w) => w.status === 'rejected').length,
    processing: workItems.filter((w) => w.status === 'processing').length,
  }), [workItems])

  // Status breakdown pie data — only statuses that have at least 1 item
  const statusBreakdown = useMemo(() => {
    return Object.entries(kpis)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: STATUS_COLORS[status] ?? '#6b7280',
      }))
  }, [kpis])

  // Reviewer workload — join assigned_reviewer_id → user name
  const reviewerWorkload = useMemo(() => {
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
    const counts: Record<string, { name: string; items: number }> = {}

    // Count assigned items per reviewer
    for (const item of workItems) {
      if (!item.assigned_reviewer_id) continue
      const id = item.assigned_reviewer_id
      if (!counts[id]) {
        counts[id] = {
          name: userMap[id] ? userMap[id].split(' ')[0] : id.slice(0, 8),
          items: 0,
        }
      }
      counts[id].items++
    }

    // Also include reviewers with 0 assigned items
    for (const u of users.filter((u) => u.role === 'reviewer')) {
      if (!counts[u.id]) {
        counts[u.id] = { name: u.name.split(' ')[0], items: 0 }
      }
    }

    return Object.values(counts).sort((a, b) => b.items - a.items)
  }, [workItems, users])

  // Avg confidence score across items that have one
  const avgConfidence = useMemo(() => {
    const scored = workItems.filter((w) => w.ai_confidence_score !== null)
    if (scored.length === 0) return null
    const avg = scored.reduce((sum, w) => sum + (w.ai_confidence_score ?? 0), 0) / scored.length
    return Math.round(avg)
  }, [workItems])

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!authLoading && user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-muted-foreground">Redirecting...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor AI draft reviews, reviewer workload, and email delivery status.
          </p>
        </header>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Pending review"
            value={loadingData ? '—' : kpis.pending}
            subtitle="Awaiting human approval"
            icon={<Clock3 size={20} />}
          />
          <KPICard
            title="Processing"
            value={loadingData ? '—' : kpis.processing}
            subtitle="Moved to processing queue"
            icon={<CheckCircle2 size={20} />}
          />
          <KPICard
            title="Sent emails"
            value={loadingData ? '—' : kpis.sent}
            subtitle="Completed by background jobs"
            icon={<MailCheck size={20} />}
          />
          <KPICard
            title="Failed"
            value={loadingData ? '—' : kpis.failed}
            subtitle="Errored during processing"
            icon={<XCircle size={20} />}
          />
        </section>

        {/* ── Charts row ── */}
        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">

          {/* Reviewer workload bar chart */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">Reviewer workload</h2>
              <p className="text-sm text-muted-foreground">Assigned work items per reviewer</p>
            </div>
            <div className="h-72">
              {!mounted || loadingData ? (
                <ChartPlaceholder />
              ) : reviewerWorkload.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No reviewers found
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={reviewerWorkload} margin={{ left: -18, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                    <Tooltip
                      formatter={(value ) => [value, 'Assigned items']}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="items" radius={[6, 6, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Status breakdown pie */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">Status breakdown</h2>
              <p className="text-sm text-muted-foreground">Current work item distribution</p>
            </div>
            <div className="h-72">
              {!mounted || loadingData ? (
                <ChartPlaceholder />
              ) : statusBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No work items yet
                </div>
              ) : (
                <div className="flex items-center gap-4 h-full">
                  <ResponsiveContainer width="60%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {statusBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-col gap-2 flex-1">
                    {statusBreakdown.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                          <span className="text-xs text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Bottom stats row ── */}
        <section className="grid gap-4 md:grid-cols-3">

          {/* Avg confidence */}
          <div className="rounded-lg border border-border hover:border-primary/50 transition-colors bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Avg AI Confidence</p>
            {loadingData ? (
              <div className="h-8 w-16 rounded bg-secondary/40 animate-pulse mt-2" />
            ) : avgConfidence !== null ? (
              <>
                <p className="text-3xl font-semibold mt-1">{avgConfidence}%</p>
                <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                    style={{ width: `${avgConfidence}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-3xl font-semibold mt-1">—</p>
            )}
          </div>

          {/* Total work items */}
          <div className="rounded-lg border border-border hover:border-primary/50 transition-colors bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Work Items</p>
            <p className="text-3xl font-semibold mt-1">{loadingData ? '—' : workItems.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
          </div>

          {/* Team size */}
          <div className="rounded-lg border border-border hover:border-primary/50 transition-colors bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Team Size</p>
            <p className="text-3xl font-semibold mt-1">{loadingData ? '—' : users.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {loadingData ? '' : `${users.filter((u) => u.role === 'reviewer').length} reviewers · ${users.filter((u) => u.role === 'admin').length} admins`}
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}