'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { Shield, User, X, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getToken } from '@/lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ai-reviewer-backend-1.onrender.com'

interface UserRecord {
  id: string
  organization_id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_login: string | null
  created_on: string | null
  updated_on: string | null
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void
  onSuccess: (user: UserRecord) => void
}

function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'reviewer'>('reviewer')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name, email, password, role }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.detail ?? 'Failed to invite user.')
      }
      const created: UserRecord = await res.json()
      onSuccess(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Invite User</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Johnson"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-muted-foreground"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@company.com"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-muted-foreground"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 pr-10 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(['reviewer', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all',
                    role === r
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border hover:bg-secondary'
                  )}
                >
                  {r === 'admin' ? <Shield size={14} /> : <User size={14} />}
                  <span className="capitalize">{r}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm hover:bg-secondary border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Inviting…' : 'Invite User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter()
  const { loading: authLoading, user } = useAuth()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    if (!authLoading && user?.role === 'reviewer') {
      router.replace('/queue')
    }
  }, [authLoading, router, user])

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return
    async function loadUsers() {
      setLoadingUsers(true)
      try {
        const res = await fetch(`${API_BASE_URL}/users/`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (!res.ok) throw new Error('Failed to load users')
        setUsers(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [authLoading, user])

  const stats = useMemo(() => ({
    admins: users.filter((u) => u.role === 'admin').length,
    reviewers: users.filter((u) => u.role === 'reviewer').length,
    total: users.length,
  }), [users])

  if (!authLoading && user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-muted-foreground">Redirecting...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={(newUser) => {
            setUsers((prev) => [newUser, ...prev])
            setShowInvite(false)
          }}
        />
      )}

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-muted-foreground">Manage team members and permissions</p>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setShowInvite(true)}
          >
            Invite User
          </Button>
        </div>

        {/* Roles Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Admin', value: stats.admins },
            { label: 'Reviewer', value: stats.reviewers },
            { label: 'Total Users', value: stats.total },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-2">{label}</p>
              <p className="text-2xl font-bold">{loadingUsers ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Loader2 size={16} className="animate-spin" />
              Loading users…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-destructive text-sm">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-sm">
                        No users yet. Invite someone to get started.
                      </td>
                    </tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                            {u.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
                          </div>
                          <span className="text-sm font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          {u.role === 'admin' ? <Shield size={14} /> : <User size={14} />}
                          <span className="capitalize">{u.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full',
                          u.is_active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'
                        )}>
                          {u.is_active ? 'active' : 'inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}