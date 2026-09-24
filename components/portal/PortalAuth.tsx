'use client'

import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

// The unified /portal account page: one page, two sections (log in, and a
// "New to GSX?" area that expands an inline registration form) — never a
// tabbed or two-screen interface. See app/portal/page.tsx for the
// surrounding hero/layout; this component owns all the interactive state.
//
// This is UI/flow only. There is no real backend wired up yet (see
// app/portal/page.tsx's header comment for why) — both forms run real
// client-side validation and a genuine loading state, then land on an
// honest "not connected yet" notice. Never a fabricated success, never a
// silent no-op.

const inputClass =
  'w-full h-12 px-4 pr-12 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

const plainInputClass =
  'w-full h-12 px-4 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

const outlineButtonClass =
  'text-button px-6 h-12 inline-flex items-center justify-center bg-transparent text-[var(--color-dark)] border border-[var(--color-dark)] hover:bg-[var(--color-dark)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]'

const quietLinkClass =
  'text-body-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] underline-offset-4 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] focus-visible:rounded-sm'

type FormStatus = 'idle' | 'loading' | 'info' | 'error'

// A short, deliberate delay before showing the "not connected yet" notice —
// purely so the loading state the task asks for is visible, not a stand-in
// for a real request.
const FAKE_SUBMIT_DELAY_MS = 500

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 15.5 15.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

interface PasswordFieldProps {
  id: string
  name: string
  label: string
  autoComplete: string
  visible: boolean
  onToggleVisible: () => void
}

function PasswordField({ id, name, label, autoComplete, visible, onToggleVisible }: PasswordFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label" style={{ color: 'var(--color-muted)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete={autoComplete}
          className={inputClass}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-0 top-0 h-12 w-11 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  )
}

function StatusNote({ status, action }: { status: FormStatus; action: string }) {
  if (status !== 'info') return null
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-body-sm mt-4 px-4 py-3 border border-[var(--color-border)]"
      style={{ color: 'var(--color-muted)' }}
    >
      {action} isn&rsquo;t connected yet — this page is still in development. Check back soon.
    </p>
  )
}

export function PortalAuth() {
  const loginEmailId = useId()
  const loginPasswordId = useId()

  const firstNameId = useId()
  const lastNameId = useId()
  const addressId = useId()
  const cityId = useId()
  const stateId = useId()
  const zipId = useId()
  const ommaId = useId()
  const regEmailId = useId()
  const phoneId = useId()
  const regPasswordId = useId()
  const confirmPasswordId = useId()

  const loginSectionRef = useRef<HTMLDivElement>(null)

  const [loginStatus, setLoginStatus] = useState<FormStatus>('idle')
  const [loginShowPassword, setLoginShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerStatus, setRegisterStatus] = useState<FormStatus>('idle')
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoginStatus('loading')
    setTimeout(() => setLoginStatus('info'), FAKE_SUBMIT_DELAY_MS)
  }

  function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (password !== confirmPassword) {
      setRegisterError('Passwords do not match.')
      setRegisterStatus('error')
      return
    }

    setRegisterError(null)
    setRegisterStatus('loading')
    setTimeout(() => setRegisterStatus('info'), FAKE_SUBMIT_DELAY_MS)
  }

  function handleCollapseRegister() {
    setRegisterOpen(false)
    setRegisterStatus('idle')
    setRegisterError(null)
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* ── Existing account login — always visible, the primary action
          on the page. ──────────────────────────────────────────────── */}
      <div ref={loginSectionRef}>
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5" style={{ maxWidth: '420px' }}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={loginEmailId} className="text-label" style={{ color: 'var(--color-muted)' }}>
              Email
            </label>
            <input
              id={loginEmailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              className={plainInputClass}
            />
          </div>

          <PasswordField
            id={loginPasswordId}
            name="password"
            label="Password"
            autoComplete="current-password"
            visible={loginShowPassword}
            onToggleVisible={() => setLoginShowPassword((v) => !v)}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-1">
            <Button type="submit" variant="primary" size="lg" disabled={loginStatus === 'loading'}>
              {loginStatus === 'loading' ? 'Logging In' : 'Log In'}
            </Button>
            <button type="button" onClick={() => setForgotOpen((v) => !v)} className={quietLinkClass}>
              Forgot password?
            </button>
          </div>
        </form>

        {forgotOpen && (
          <p className="text-body-sm mt-4" style={{ color: 'var(--color-muted)' }}>
            Password reset isn&rsquo;t available yet. Contact GSX for help getting back into your account.
          </p>
        )}

        <StatusNote status={loginStatus} action="Account sign-in" />
      </div>

      {/* ── New to GSX? — the natural second option on the same page, not
          a tab. Visually secondary to Log In (outline button vs. filled). ── */}
      <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h2 className="text-h4 text-[var(--color-dark)]">New to GSX?</h2>
        <p className="text-body-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Create an account to get started.
        </p>
        {!registerOpen && (
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className={`${outlineButtonClass} mt-4`}
          >
            Create Account
          </button>
        )}
      </div>

      {/* ── Registration — expands inline underneath, same page, same
          visual language. Collapses back to the quiet link below rather
          than navigating anywhere. ──────────────────────────────────── */}
      {registerOpen && (
        <div className="mt-6" style={{ maxWidth: '720px' }}>
          <form onSubmit={handleRegisterSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={firstNameId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  First Name
                </label>
                <input id={firstNameId} name="firstName" type="text" required autoComplete="given-name" className={plainInputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={lastNameId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  Last Name
                </label>
                <input id={lastNameId} name="lastName" type="text" required autoComplete="family-name" className={plainInputClass} />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={addressId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  Address
                </label>
                <input id={addressId} name="address" type="text" required autoComplete="street-address" className={plainInputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={cityId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  City
                </label>
                <input id={cityId} name="city" type="text" required autoComplete="address-level2" className={plainInputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={stateId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  State
                </label>
                <input
                  id={stateId}
                  name="state"
                  type="text"
                  required
                  maxLength={2}
                  placeholder="OK"
                  autoComplete="address-level1"
                  className={plainInputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={zipId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  ZIP Code
                </label>
                <input
                  id={zipId}
                  name="zip"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={5}
                  autoComplete="postal-code"
                  className={plainInputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={ommaId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  OMMA License Number
                </label>
                <input id={ommaId} name="ommaLicense" type="text" required className={plainInputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={regEmailId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  Email
                </label>
                <input id={regEmailId} name="email" type="email" required autoComplete="email" className={plainInputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={phoneId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  Phone
                </label>
                <input id={phoneId} name="phone" type="tel" required autoComplete="tel" className={plainInputClass} />
              </div>

              <PasswordField
                id={regPasswordId}
                name="password"
                label="Password"
                autoComplete="new-password"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((v) => !v)}
              />

              <PasswordField
                id={confirmPasswordId}
                name="confirmPassword"
                label="Confirm Password"
                autoComplete="new-password"
                visible={showConfirmPassword}
                onToggleVisible={() => setShowConfirmPassword((v) => !v)}
              />
            </div>

            {registerStatus === 'error' && registerError && (
              <p role="alert" className="text-body-sm mt-4" style={{ color: 'var(--color-muted)' }}>
                {registerError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6">
              <Button type="submit" variant="primary" size="lg" disabled={registerStatus === 'loading'}>
                {registerStatus === 'loading' ? 'Creating Account' : 'Create Account'}
              </Button>
              <button type="button" onClick={handleCollapseRegister} className={quietLinkClass}>
                Already have an account? Log in above
              </button>
            </div>
          </form>

          <StatusNote status={registerStatus} action="Account creation" />
        </div>
      )}
    </div>
  )
}
