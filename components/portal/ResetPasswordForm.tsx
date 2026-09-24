'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { portalPost } from '@/lib/portal/api'

// Consumes a password reset link (?token=...) emailed by
// forgot-password.php, or handed to a migrated legacy account that must
// set a new password before it can be used. Same visual language as
// PortalAuth.tsx's forms — no new design system introduced here.

const plainInputClass =
  'w-full h-12 px-4 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

type Status = 'idle' | 'loading' | 'success' | 'error'

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const passwordId = useId()
  const confirmPasswordId = useId()

  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  if (!token) {
    return (
      <p className="text-body" style={{ color: 'var(--color-dark)' }}>
        This reset link is missing or invalid.{' '}
        <Link href="/portal" className="underline underline-offset-4">
          Return to the Portal login page
        </Link>{' '}
        to request a new one.
      </p>
    )
  }

  if (status === 'success') {
    return (
      <p className="text-body" style={{ color: 'var(--color-dark)' }}>
        Your password has been changed.{' '}
        <Link href="/portal" className="underline underline-offset-4">
          Log in
        </Link>
        .
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }

    setStatus('loading')
    setMessage(null)

    try {
      const { status: httpStatus, data } = await portalPost<{ ok?: boolean; error?: string }>(
        '/reset-password.php',
        { token, password, confirmPassword }
      )

      if (httpStatus === 200 && data?.ok) {
        setStatus('success')
        return
      }

      setStatus('error')
      setMessage(
        data?.error === 'invalid_or_expired_token'
          ? 'This reset link is invalid or has expired. Request a new one from the Portal login page.'
          : GENERIC_ERROR_MESSAGE
      )
    } catch {
      setStatus('error')
      setMessage(GENERIC_ERROR_MESSAGE)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" style={{ maxWidth: '420px' }}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={passwordId} className="text-label" style={{ color: 'var(--color-muted)' }}>
          New Password
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={plainInputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={confirmPasswordId} className="text-label" style={{ color: 'var(--color-muted)' }}>
          Confirm New Password
        </label>
        <input
          id={confirmPasswordId}
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={plainInputClass}
        />
      </div>

      <div className="mt-1">
        <Button type="submit" variant="primary" size="lg" disabled={status === 'loading'}>
          {status === 'loading' ? 'Saving' : 'Set New Password'}
        </Button>
      </div>

      {status === 'error' && message && (
        <p role="alert" className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
          {message}
        </p>
      )}
    </form>
  )
}
