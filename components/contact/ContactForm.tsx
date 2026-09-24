'use client'

import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CONTACT_REASONS } from '@/lib/contact/schema'

// The Contact page's form. Square, borderless-card, plain-input styling
// matching the site's other cream-section inputs (see the Find GSX ZIP
// search) — components/ui/FormField.tsx exists but is styled for dark
// backgrounds (translucent white-on-dark) and unused anywhere in the app;
// adapting it for a cream section was out of scope here, so this reuses
// the lighter input pattern already shipped and proven on Find GSX instead.

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

const inputClass =
  'w-full h-12 px-4 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

export function ContactForm() {
  const nameId = useId()
  const emailId = useId()
  const phoneId = useId()
  const companyId = useId()
  const reasonId = useId()
  const messageId = useId()
  const hpId = useId()

  const [status, setStatus] = useState<SubmitStatus>('idle')

  // Captured once at mount — the server compares this against arrival
  // time to reject submissions that couldn't plausibly be human.
  const renderedAtRef = useRef(Date.now())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')

    const form = e.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      company: String(formData.get('company') ?? ''),
      reason: String(formData.get('reason') ?? ''),
      message: String(formData.get('message') ?? ''),
      renderedAt: renderedAtRef.current,
      gsxHpToken: String(formData.get('gsx_hp_token') ?? ''),
    }

    try {
      // HostGator static build: posts to the PHP endpoint (contact.php,
      // deployed at the site root) instead of the Vercel version's
      // /api/contact route handler, which doesn't exist in this build (no
      // Node server to run it). Same JSON payload shape either way, so
      // nothing else in this form changes.
      const res = await fetch('/contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: { ok?: boolean } | null = await res.json().catch(() => null)

      if (res.ok && data?.ok) {
        setStatus('success')
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-[var(--color-border)] px-6 py-8"
        style={{ maxWidth: '640px' }}
      >
        <p className="text-h4 text-[var(--color-dark)]">Thanks for reaching out</p>
        <p className="text-body-sm mt-2" style={{ color: 'var(--color-muted)' }}>
          Your message has been sent to the GSX team.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '640px' }}>
      {/* Honeypot — aria-hidden removes it from the accessibility tree
          entirely (screen reader users never encounter it) and tabIndex=-1
          keeps it out of keyboard tab order. Positioned off-screen rather
          than display:none, since some bots skip display:none fields but
          still blindly fill anything else on the page. The obscure name
          plus autoComplete="off" keeps a real visitor's own browser
          autofill from populating it, which would otherwise cause a false
          positive. */}
      <div
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
        aria-hidden="true"
      >
        <label htmlFor={hpId}>Leave this field blank</label>
        <input id={hpId} name="gsx_hp_token" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-label" style={{ color: 'var(--color-muted)' }}>
            Name
          </label>
          <input id={nameId} name="name" type="text" required maxLength={100} autoComplete="name" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-label" style={{ color: 'var(--color-muted)' }}>
            Email
          </label>
          <input id={emailId} name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={phoneId} className="text-label" style={{ color: 'var(--color-muted)' }}>
            Phone <span style={{ textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
          </label>
          <input id={phoneId} name="phone" type="tel" maxLength={30} autoComplete="tel" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={companyId} className="text-label" style={{ color: 'var(--color-muted)' }}>
            Company / Organization <span style={{ textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
          </label>
          <input id={companyId} name="company" type="text" maxLength={150} autoComplete="organization" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={reasonId} className="text-label" style={{ color: 'var(--color-muted)' }}>
            Reason for contacting GSX
          </label>
          <select id={reasonId} name="reason" required defaultValue="" className={`${inputClass} cursor-pointer`}>
            <option value="" disabled>
              Select a reason
            </option>
            {CONTACT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={messageId} className="text-label" style={{ color: 'var(--color-muted)' }}>
            Message
          </label>
          <textarea
            id={messageId}
            name="message"
            required
            maxLength={2000}
            rows={6}
            className={`${inputClass} h-auto py-3 resize-y`}
          />
        </div>
      </div>

      {status === 'error' && (
        <p role="alert" className="text-body-sm mt-4" style={{ color: 'var(--color-muted)' }}>
          We couldn&rsquo;t send your message. Please try again or email{' '}
          <a href="mailto:contact@gsxok.com" style={{ color: 'var(--color-green)' }}>
            contact@gsxok.com
          </a>
          .
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={status === 'submitting'} style={{ marginTop: '1.5rem' }}>
        {status === 'submitting' ? 'Sending' : 'Send Message'}
      </Button>
    </form>
  )
}
