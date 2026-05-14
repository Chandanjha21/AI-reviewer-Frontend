'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Tag,
  User,
} from 'lucide-react'

import { DashboardLayout } from '@/components/dashboard-layout'
import { getToken } from '@/lib/auth'
import { cn } from '@/lib/utils'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
  'https://ai-reviewer-backend-1glg.onrender.com'

type LeadForm = {
  lead_name: string
  company_name: string
  email: string
  phone: string
  lead_context: string
  original_message: string
  source: string
  priority: string
  tags: string
}

const initialForm: LeadForm = {
  lead_name: '',
  company_name: '',
  email: '',
  phone: '',
  lead_context: '',
  original_message: '',
  source: 'website',
  priority: 'normal',
  tags: '',
}

export default function CreateLeadPage() {
  const router = useRouter()
  const [form, setForm] = useState<LeadForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateField<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function createLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const token = getToken()
      if (!token) {
        router.replace('/login')
        return
      }

      const payload = {
        lead_name: form.lead_name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        lead_context: form.lead_context.trim() || null,
        original_message: form.original_message.trim(),
        source: form.source.trim() || null,
        priority: form.priority,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }

      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let detail = 'Failed to create lead'
        try {
          const data = await response.json()
          detail = data?.detail || detail
        } catch {}
        throw new Error(detail)
      }

      setForm(initialForm)
      setSuccess('Lead created. A work item has been created and queued for AI draft generation.')
      router.replace('/leads')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Create Lead</h1>
          <p className="text-muted-foreground">
            Add lead details and the original message. The backend will create the related work item and queue Celery generation.
          </p>
        </header>

        <form onSubmit={createLead} className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="space-y-5 rounded-lg border border-border bg-card p-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Lead details</h2>
              <p className="mt-1 text-sm text-muted-foreground">Required fields are marked with *</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                required
                icon={User}
                label="Lead name"
                value={form.lead_name}
                onChange={(value) => updateField('lead_name', value)}
                placeholder="Alex Morgan"
                autoComplete="name"
              />
              <Field
                icon={Building2}
                label="Company name"
                value={form.company_name}
                onChange={(value) => updateField('company_name', value)}
                placeholder="Acme Corp"
                autoComplete="organization"
              />
              <Field
                required
                icon={Mail}
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => updateField('email', value)}
                placeholder="alex@company.com"
                autoComplete="email"
              />
              <Field
                icon={Phone}
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(value) => updateField('phone', value)}
                placeholder="+1 555 0199"
                autoComplete="tel"
              />
            </div>

            <Textarea
              label="Lead context"
              value={form.lead_context}
              onChange={(value) => updateField('lead_context', value)}
              placeholder="Briefly describe the lead, company, intent, previous conversation, or any useful context for the AI draft."
              rows={5}
            />

            <Textarea
              required
              label="Original message"
              value={form.original_message}
              onChange={(value) => updateField('original_message', value)}
              placeholder="Paste the lead's original message here."
              rows={7}
            />
          </section>

          <aside className="space-y-5 rounded-lg border border-border bg-card p-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Routing</h2>
              <p className="mt-1 text-sm text-muted-foreground">Used for priority, filtering, and AI prompt context.</p>
            </div>

            <SelectField
              label="Source"
              value={form.source}
              onChange={(value) => updateField('source', value)}
              options={[
                ['website', 'Website'],
                ['email', 'Email'],
                ['linkedin', 'LinkedIn'],
                ['referral', 'Referral'],
                ['manual', 'Manual'],
              ]}
            />

            <SelectField
              label="Priority"
              value={form.priority}
              onChange={(value) => updateField('priority', value)}
              options={[
                ['low', 'Low'],
                ['normal', 'Normal'],
                ['high', 'High'],
                ['urgent', 'Urgent'],
              ]}
            />

            <Field
              icon={Tag}
              label="Tags"
              value={form.tags}
              onChange={(value) => updateField('tags', value)}
              placeholder="pricing, enterprise, demo"
            />

            {success && (
              <div className="flex gap-2 rounded-md border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
              Create lead
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </aside>
        </form>
      </div>
    </DashboardLayout>
  )
}

type FieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  icon: React.ComponentType<{ className?: string }>
  type?: string
  required?: boolean
  autoComplete?: string
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = 'text',
  required = false,
  autoComplete,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          required={required}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            'h-11 w-full rounded-md border border-border bg-secondary/40 pl-10 pr-3 text-sm text-foreground outline-none transition',
            'placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15',
          )}
        />
      </span>
    </label>
  )
}

type TextareaProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows: number
  required?: boolean
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows,
  required = false,
}: TextareaProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full resize-y rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition',
          'placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15',
        )}
      />
    </label>
  )
}

type SelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
