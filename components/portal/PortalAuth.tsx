'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { checkSession, portalPost } from '@/lib/portal/api'

// The unified /portal account page: one page, two sections (log in, and a
// "New to GSX?" area that expands an inline registration form) — never a
// tabbed or two-screen interface. See app/portal/page.tsx for the
// surrounding hero/layout; this component owns all the interactive state.
//
// Wired to the real HostGator PHP backend (portal-*.php, deployed at the
// site root — see lib/portal/api.ts). There is still no dashboard/order
// workflow anywhere here — a logged-in visitor just sees a short
// confirmation and a Log Out button, since nothing in the legacy data
// tells us what a real post-login page looked like.

const inputClass =
  'w-full h-12 px-4 pr-12 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

const plainInputClass =
  'w-full h-12 px-4 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

const outlineButtonClass =
  'text-button px-6 h-12 inline-flex items-center justify-center bg-transparent text-[var(--color-dark)] border border-[var(--color-dark)] hover:bg-[var(--color-dark)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]'

const quietLinkClass =
  'text-body-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] underline-offset-4 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] focus-visible:rounded-sm'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again."

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

function StatusNote({ status, message }: { status: FormStatus; message: string | null }) {
  if ((status !== 'success' && status !== 'error') || !message) return null
  return (
    <p
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className="text-body-sm mt-4 px-4 py-3 border border-[var(--color-border)]"
      style={{ color: 'var(--color-muted)' }}
    >
      {message}
    </p>
  )
}

const REGISTER_FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP Code',
  ommaLicense: 'OMMA License Number',
  email: 'Email',
  phone: 'Phone',
  password: 'Password',
  confirmPassword: 'Confirm Password',
}

export function PortalAuth() {
  const loginEmailId = useId()
  const loginPasswordId = useId()
  const forgotEmailId = useId()

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

  // 'checking' briefly while session-check.php is asked whether this
  // visitor already has an active session; then either 'loggedIn' (shows
  // the confirmation/Log Out panel below) or 'loggedOut' (shows the
  // normal login/register forms).
  const [sessionState, setSessionState] = useState<'checking' | 'loggedIn' | 'loggedOut'>('checking')
  const [sessionUser, setSessionUser] = useState<{ firstName?: string; email?: string }>({})
  const [logoutStatus, setLogoutStatus] = useState<FormStatus>('idle')

  const [loginStatus, setLoginStatus] = useState<FormStatus>('idle')
  const [loginMessage, setLoginMessage] = useState<string | null>(null)
  const [loginShowPassword, setLoginShowPassword] = useState(false)

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStatus, setForgotStatus] = useState<FormStatus>('idle')
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)

  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerStatus, setRegisterStatus] = useState<FormStatus>('idle')
  const [registerMessage, setRegisterMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    let cancelled = false
    checkSession().then((result) => {
      if (cancelled) return
      if (result.loggedIn) {
        setSessionUser({ firstName: result.firstName, email: result.email })
        setSessionState('loggedIn')
      } else {
        setSessionState('loggedOut')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    setLogoutStatus('loading')
    try {
      await portalPost('/logout.php', {})
    } catch {
      // Even if the request fails, treat the visitor as logged out
      // locally — the session cookie may still be valid server-side, but
      // there's nothing more useful to do here than let them try again.
    }
    setSessionState('loggedOut')
    setSessionUser({})
    setLogoutStatus('idle')
  }

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoginStatus('loading')
    setLoginMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      const { status, data } = await portalPost<{ ok?: boolean; message?: string }>('/login.php', {
        email,
        password,
      })

      if (status === 200 && data?.ok) {
        const result = await checkSession()
        setSessionUser({ firstName: result.firstName, email: result.email })
        setSessionState('loggedIn')
        setLoginStatus('idle')
        return
      }

      setLoginStatus('error')
      setLoginMessage(data?.message ?? GENERIC_ERROR_MESSAGE)
    } catch {
      setLoginStatus('error')
      setLoginMessage(GENERIC_ERROR_MESSAGE)
    }
  }

  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setForgotStatus('loading')
    setForgotMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') ?? '')

    try {
      const { status, data } = await portalPost<{ ok?: boolean; message?: string }>('/forgot-password.php', {
        email,
      })

      if (status === 200 && data?.ok) {
        setForgotStatus('success')
        setForgotMessage(data.message ?? 'If an account exists for that email, a password reset link has been sent.')
      } else {
        setForgotStatus('error')
        setForgotMessage('Please enter a valid email address.')
      }
    } catch {
      setForgotStatus('error')
      setForgotMessage(GENERIC_ERROR_MESSAGE)
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (password !== confirmPassword) {
      setRegisterStatus('error')
      setRegisterMessage('Passwords do not match.')
      return
    }

    setRegisterStatus('loading')
    setRegisterMessage(null)

    const payload = {
      firstName: String(formData.get('firstName') ?? ''),
      lastName: String(formData.get('lastName') ?? ''),
      address: String(formData.get('address') ?? ''),
      city: String(formData.get('city') ?? ''),
      state: String(formData.get('state') ?? ''),
      zip: String(formData.get('zip') ?? ''),
      ommaLicense: String(formData.get('ommaLicense') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      password,
      confirmPassword,
    }

    try {
      const { status, data } = await portalPost<{ ok?: boolean; error?: string; fields?: string[]; status?: string }>(
        '/register.php',
        payload
      )

      if (status === 200 && data?.ok) {
        setRegisterStatus('success')
        setRegisterMessage(
          data.status === 'pending'
            ? 'Your account has been created and is awaiting approval. We’ll be in touch once it’s active.'
            : 'Your account has been created. You can log in above.'
        )
        form.reset()
        return
      }

      if (data?.error === 'email_taken') {
        setRegisterStatus('error')
        setRegisterMessage('An account already exists for that email.')
      } else if (data?.error === 'invalid_fields' && data.fields?.length) {
        const labels = data.fields.map((f) => REGISTER_FIELD_LABELS[f] ?? f)
        setRegisterStatus('error')
        setRegisterMessage(`Please check: ${labels.join(', ')}.`)
      } else {
        setRegisterStatus('error')
        setRegisterMessage(GENERIC_ERROR_MESSAGE)
      }
    } catch {
      setRegisterStatus('error')
      setRegisterMessage(GENERIC_ERROR_MESSAGE)
    }
  }

  function handleCollapseRegister() {
    setRegisterOpen(false)
    setRegisterStatus('idle')
    setRegisterMessage(null)
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (sessionState === 'checking') {
    return (
      <div style={{ maxWidth: '640px' }}>
        <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
          Checking your session&hellip;
        </p>
      </div>
    )
  }

  if (sessionState === 'loggedIn') {
    return (
      <div style={{ maxWidth: '640px' }}>
        <p className="text-body" style={{ color: 'var(--color-dark)' }}>
          {sessionUser.firstName ? `Welcome back, ${sessionUser.firstName}.` : 'You are logged in.'}
        </p>
        {sessionUser.email && (
          <p className="text-body-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {sessionUser.email}
          </p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutStatus === 'loading'}
          className={`${outlineButtonClass} mt-6`}
        >
          {logoutStatus === 'loading' ? 'Logging Out' : 'Log Out'}
        </button>
      </div>
    )
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
            <button
              type="button"
              onClick={() => {
                setForgotOpen((v) => !v)
                setForgotStatus('idle')
                setForgotMessage(null)
              }}
              className={quietLinkClass}
            >
              Forgot password?
            </button>
          </div>
        </form>

        {forgotOpen && (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3 mt-4" style={{ maxWidth: '420px' }}>
            <label htmlFor={forgotEmailId} className="text-label" style={{ color: 'var(--color-muted)' }}>
              Email
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id={forgotEmailId}
                name="email"
                type="email"
                required
                autoComplete="email"
                className={`${plainInputClass} flex-1`}
                style={{ minWidth: '220px' }}
              />
              <button
                type="submit"
                disabled={forgotStatus === 'loading'}
                className={outlineButtonClass}
              >
                {forgotStatus === 'loading' ? 'Sending' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}

        <StatusNote status={forgotStatus} message={forgotMessage} />
        <StatusNote status={loginStatus} message={loginMessage} />
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

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6">
              <Button type="submit" variant="primary" size="lg" disabled={registerStatus === 'loading'}>
                {registerStatus === 'loading' ? 'Creating Account' : 'Create Account'}
              </Button>
              <button type="button" onClick={handleCollapseRegister} className={quietLinkClass}>
                Already have an account? Log in above
              </button>
            </div>
          </form>

          <StatusNote status={registerStatus} message={registerMessage} />
        </div>
      )}
    </div>
  )
}
