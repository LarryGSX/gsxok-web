'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { portalGet, portalPost } from '@/lib/portal/api'

// The administrator view, shown on /portal in place of the customer screen
// when the signed-in account is a GSX administrator (see PortalAuth.tsx,
// which loads this only for admins). Set a first password, then manage
// customer accounts, orders, and products. Every action is re-checked on the
// server; nothing here works without an administrator session.

const inputClass =
  'w-full h-12 px-4 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

const smallInputClass =
  'w-full h-10 px-3 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

const outlineButtonClass =
  'text-button px-5 h-10 inline-flex items-center justify-center bg-transparent text-[var(--color-dark)] border border-[var(--color-dark)] hover:bg-[var(--color-dark)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] disabled:opacity-40 disabled:pointer-events-none'

const solidButtonClass =
  'text-button px-5 h-10 inline-flex items-center justify-center bg-[var(--color-green)] text-[var(--color-cream)] border border-[var(--color-green)] hover:bg-[#155f3a] hover:border-[#155f3a] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] disabled:opacity-40 disabled:pointer-events-none'

const quietLinkClass =
  'text-body-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] underline-offset-4 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] focus-visible:rounded-sm'

const GENERIC_ERROR = 'Something went wrong. Please try again.'

type CustomerStatus = 'pending' | 'active' | 'suspended' | 'password_reset_required'

interface Customer {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  ommaLicense: string
  status: CustomerStatus
  createdAt: string
}

type CustomerFilter = 'pending' | 'active' | 'suspended' | 'password_reset_required' | 'all'

const STATUS_LABEL: Record<CustomerStatus, string> = {
  pending: 'Pending approval',
  active: 'Active',
  suspended: 'Suspended',
  password_reset_required: 'Needs password reset',
}

const CUSTOMER_FILTERS: { key: CustomerFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'password_reset_required', label: 'Needs reset' },
  { key: 'all', label: 'All' },
]

function formatDate(createdAt: string): string {
  const [y, m, d] = createdAt.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return createdAt.slice(0, 10)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function Field({
  id,
  label,
  name,
  type,
  autoComplete,
  minLength,
}: {
  id: string
  label: string
  name: string
  type: string
  autoComplete: string
  minLength?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label" style={{ color: 'var(--color-muted)' }}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </div>
  )
}

function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="text-body-sm px-4 py-3 border border-[var(--color-border)]"
      style={{ color: 'var(--color-muted)' }}
    >
      {message}
    </p>
  )
}

function FilterPills<K extends string>({
  filters,
  value,
  counts,
  onChange,
  label,
}: {
  filters: { key: K; label: string }[]
  value: K
  counts: Record<K, number>
  onChange: (k: K) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {filters.map((f) => {
        const active = value === f.key
        return (
          <button
            key={f.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(f.key)}
            className={`text-button px-4 h-10 inline-flex items-center border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] ${
              active
                ? 'bg-[var(--color-dark)] text-[var(--color-cream)] border-[var(--color-dark)]'
                : 'bg-transparent text-[var(--color-dark)] border-[var(--color-border)] hover:border-[var(--color-dark)]'
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        )
      })}
    </div>
  )
}

function ChangePasswordForm({ forced, onDone }: { forced: boolean; onDone: () => void }) {
  const currentId = useId()
  const newId = useId()
  const confirmId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const currentPassword = String(formData.get('currentPassword') ?? '')
    const newPassword = String(formData.get('newPassword') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const { status, data } = await portalPost<{ ok?: boolean; error?: string }>('/admin-change-password.php', {
        currentPassword,
        newPassword,
        confirmPassword,
      })
      if (status === 200 && data?.ok) {
        onDone()
        return
      }
      if (data?.error === 'wrong_current_password') {
        setError('The current password is not correct.')
      } else if (data?.error === 'invalid_fields') {
        setError('The new password must be at least 10 characters and different from the current one.')
      } else {
        setError(GENERIC_ERROR)
      }
    } catch {
      setError(GENERIC_ERROR)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" style={{ maxWidth: '420px' }}>
      {forced && (
        <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
          Choose your own password before continuing. The temporary one you were given won&rsquo;t work again after
          this.
        </p>
      )}
      <Field
        id={currentId}
        label={forced ? 'Temporary Password' : 'Current Password'}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
      />
      <Field
        id={newId}
        label="New Password (10+ characters)"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={10}
      />
      <Field
        id={confirmId}
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={10}
      />
      <div className="mt-1">
        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? 'Saving' : 'Save Password'}
        </Button>
      </div>
      <Notice message={error} />
    </form>
  )
}

// ── Customers ──────────────────────────────────────────────────────────

function CustomerCard({
  customer,
  busy,
  onChangeStatus,
}: {
  customer: Customer
  busy: boolean
  onChangeStatus: (id: number, status: 'pending' | 'active' | 'suspended') => void
}) {
  const c = customer
  return (
    <li className="bg-white border border-[var(--color-border)] p-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-h4 text-[var(--color-dark)]">
            {c.firstName} {c.lastName}
          </h3>
          <span
            className="text-label px-2 py-0.5 border border-[var(--color-border)]"
            style={{ color: 'var(--color-muted)' }}
          >
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        <p className="text-body-sm break-words" style={{ color: 'var(--color-dark)' }}>
          {c.email} &middot; {c.phone}
        </p>
        <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
          {c.address}, {c.city}, {c.state} {c.zip}
        </p>
        <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
          OMMA license: <span style={{ color: 'var(--color-dark)' }}>{c.ommaLicense}</span> &middot; Signed up{' '}
          {formatDate(c.createdAt)}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 md:justify-end shrink-0">
        {c.status === 'pending' && (
          <>
            <button type="button" disabled={busy} onClick={() => onChangeStatus(c.id, 'active')} className={solidButtonClass}>
              Approve
            </button>
            <button type="button" disabled={busy} onClick={() => onChangeStatus(c.id, 'suspended')} className={outlineButtonClass}>
              Reject
            </button>
          </>
        )}
        {c.status === 'active' && (
          <button type="button" disabled={busy} onClick={() => onChangeStatus(c.id, 'suspended')} className={outlineButtonClass}>
            Suspend
          </button>
        )}
        {c.status === 'suspended' && (
          <button type="button" disabled={busy} onClick={() => onChangeStatus(c.id, 'active')} className={outlineButtonClass}>
            Reactivate
          </button>
        )}
        {c.status === 'password_reset_required' && (
          <p className="text-body-sm" style={{ color: 'var(--color-muted)', maxWidth: '22ch' }}>
            Becomes active once they set a new password.
          </p>
        )}
      </div>
    </li>
  )
}

function CustomersSection({ onSignedOut }: { onSignedOut: () => void }) {
  const searchId = useId()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CustomerFilter>('pending')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const { status, data } = await portalGet<{ ok?: boolean; customers?: Customer[] }>('/admin-customers.php')
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok && data.customers) return setCustomers(data.customers)
      setLoadError(GENERIC_ERROR)
    } catch {
      setLoadError(GENERIC_ERROR)
    }
  }, [onSignedOut])

  useEffect(() => {
    load()
  }, [load])

  async function changeStatus(id: number, status: 'pending' | 'active' | 'suspended') {
    setBusyId(id)
    setActionError(null)
    try {
      const res = await portalPost<{ ok?: boolean; error?: string }>('/admin-customer-status.php', { id, status })
      if (res.status === 200 && res.data?.ok) {
        setCustomers((list) => list.map((c) => (c.id === id ? { ...c, status } : c)))
      } else if (res.status === 401) {
        return onSignedOut()
      } else if (res.data?.error === 'awaiting_password_reset') {
        setActionError('That account is waiting for the customer to set a new password.')
      } else {
        setActionError(GENERIC_ERROR)
      }
    } catch {
      setActionError(GENERIC_ERROR)
    }
    setBusyId(null)
  }

  const counts = useMemo(() => {
    const result: Record<CustomerFilter, number> = {
      pending: 0,
      active: 0,
      suspended: 0,
      password_reset_required: 0,
      all: customers.length,
    }
    for (const c of customers) result[c.status] += 1
    return result
  }, [customers])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false
      if (!q) return true
      return [c.firstName, c.lastName, c.email, c.phone, c.ommaLicense, c.city].join(' ').toLowerCase().includes(q)
    })
  }, [customers, filter, query])

  return (
    <div>
      <FilterPills
        filters={CUSTOMER_FILTERS}
        value={filter}
        counts={counts}
        onChange={setFilter}
        label="Filter customers by status"
      />

      <div className="mt-5 flex flex-col gap-1.5" style={{ maxWidth: '420px' }}>
        <label htmlFor={searchId} className="text-label" style={{ color: 'var(--color-muted)' }}>
          Search
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, email, phone, license, or city"
          className={inputClass}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Notice message={loadError} />
        <Notice message={actionError} />
      </div>

      {visible.length === 0 && !loadError ? (
        <p className="text-body-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {customers.length === 0 ? 'No customer accounts yet.' : 'No accounts match this view.'}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {visible.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              busy={busyId === c.id}
              onChangeStatus={changeStatus}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ── The administrator screen ───────────────────────────────────────────

export function AdminPanel({
  firstName,
  email,
  mustChangePassword,
  onSignedOut,
}: {
  firstName?: string
  email?: string
  mustChangePassword: boolean
  onSignedOut: () => void
}) {
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(mustChangePassword)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)

  // If the server says a password change is still required, show that form.
  const handleSignedOutOrChange = useCallback(() => onSignedOut(), [onSignedOut])

  async function handleSignOut() {
    setSignOutBusy(true)
    try {
      await portalPost('/logout.php', {})
    } catch {
      // Treat as signed out locally either way.
    }
    onSignedOut()
  }

  if (passwordChangeRequired) {
    return <ChangePasswordForm forced onDone={() => setPasswordChangeRequired(false)} />
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-body" style={{ color: 'var(--color-dark)' }}>
            {firstName ? `Signed in as ${firstName} (administrator)` : 'Signed in as administrator'}
          </p>
          {email && (
            <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
              {email}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="button" onClick={() => setShowPasswordForm((v) => !v)} className={quietLinkClass}>
            Change password
          </button>
          <button type="button" onClick={handleSignOut} disabled={signOutBusy} className={outlineButtonClass}>
            {signOutBusy ? 'Signing Out' : 'Sign Out'}
          </button>
        </div>
      </div>

      {showPasswordForm && (
        <div className="mt-6">
          <ChangePasswordForm forced={false} onDone={() => setShowPasswordForm(false)} />
        </div>
      )}

      <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h2 className="text-h4 text-[var(--color-dark)]">Customer accounts</h2>
        <div className="mt-5">
          <CustomersSection onSignedOut={handleSignedOutOrChange} />
        </div>
      </div>
    </div>
  )
}
