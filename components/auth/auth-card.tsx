'use client'

import type { ComponentType } from 'react'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Loader2, Lock, Mail, User } from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'signup'

type AuthCardProps = {
  mode: AuthMode
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    organizationName: '',
    name: '',
    email: '',
    password: '',
  })

  const isSignup = mode === 'signup'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      let currentUser
      if (isSignup) {
        currentUser = await signUp({
          organization_name: form.organizationName.trim(),
          admin_name: form.name.trim(),
          admin_email: form.email.trim(),
          password: form.password,
        })
      } else {
        currentUser = await signIn({
          email: form.email.trim(),
          password: form.password,
        })
      }

      router.replace(currentUser.role === 'admin' ? '/dashboard' : '/queue')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] px-4 py-6 text-[#15171a] sm:px-6">
      <main className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-[#111827] text-sm font-semibold text-white">
              AI
            </div>
            <h1 className="text-5xl font-semibold leading-tight text-[#111827]">
              Review AI email drafts before they reach your leads.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#5f6673]">
              Admins create an organization and invite reviewers. Reviewers log in to approve, edit, reject, or regenerate follow-up emails.
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {['Role based access', 'Human approval', 'Queued sending'].map((item) => (
                <div key={item} className="rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 text-sm font-medium text-[#303641] shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[440px] rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2f7] text-[#111827] lg:hidden">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-[#69707d]">
              {isSignup ? 'Create organization' : 'Welcome back'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              {isSignup ? 'Start with an admin account' : 'Sign in to your workspace'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#69707d]">
              {isSignup
                ? 'Use signup only when creating a new organization. Reviewers added by an admin should log in instead.'
                : 'Use the account created by your admin, or your admin account if you own the organization.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup && (
              <>
                <Field
                  icon={Building2}
                  label="Organization"
                  name="organization"
                  value={form.organizationName}
                  onChange={(value) => setForm((current) => ({ ...current, organizationName: value }))}
                  placeholder="Acme Corp"
                  autoComplete="organization"
                />
                <Field
                  icon={User}
                  label="Admin name"
                  name="name"
                  value={form.name}
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  placeholder="Priya Shah"
                  autoComplete="name"
                />
              </>
            )}

            <Field
              icon={Mail}
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
              placeholder="you@company.com"
              autoComplete="email"
            />
            <Field
              icon={Lock}
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={(value) => setForm((current) => ({ ...current, password: value }))}
              placeholder="Minimum 8 characters"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />

            {error && (
              <div className="rounded-md border border-[#f1c2c2] bg-[#fff5f5] px-3 py-2 text-sm text-[#a03434]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#263244] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSignup ? 'Create organization' : 'Sign in'}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </form>

          <div className="mt-6 border-t border-[#edf0f4] pt-6 text-center text-sm text-[#69707d]">
            {isSignup ? (
              <>
                Already added to an organization?{' '}
                <Link href="/login" className="font-semibold text-[#111827] hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Creating a new organization?{' '}
                <Link href="/signup" className="font-semibold text-[#111827] hover:underline">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

type FieldProps = {
  icon: ComponentType<{ className?: string }>
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  autoComplete?: string
}

function Field({
  icon: Icon,
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#303641]">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a93a3]" />
        <input
          required
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={type === 'password' ? 8 : undefined}
          className={cn(
            'h-11 w-full rounded-md border border-[#d8dde6] bg-white pl-10 pr-3 text-sm text-[#15171a] outline-none transition',
            'placeholder:text-[#9aa2af] focus:border-[#111827] focus:ring-3 focus:ring-[#111827]/10',
          )}
        />
      </span>
    </label>
  )
}
