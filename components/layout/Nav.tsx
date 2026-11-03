'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

// HostGator static build: no useSession() here (see app/providers.tsx for
// why next-auth can't be part of this bundle at all, not just unused).
// The portal backend isn't connected on this branch, so every visitor is
// necessarily logged-out — this nav always renders exactly the state a
// real visitor already sees today on the live site, just without an idle
// fetch to a /api/auth/session endpoint that doesn't exist in this build.

// Oklahoma / Respect the Dose GSX logo, the approved standalone lockup
// (state outline, "Respect the Dose" script, GSX / Green Science Extracts
// wordmark). This is the cleaned Sanity asset (white flecks and edge halo
// removed pixel-by-pixel by saturation, no redesign) — same one now used
// on the About page's Respect the Dose section, replacing the original
// source asset that had the defect baked in.
const NAV_LOGO_URL = 'https://cdn.sanity.io/images/o7wavkxv/production/00ee0021f084edb3e388c52345fe354c06ae45e7-808x448.png'

// Only the public set is reachable on this branch (see the note above) —
// the retailer/admin nav variants are dormant, not deleted, so restoring
// real session state later is a small diff against this same file rather
// than a rebuild from scratch.
const publicNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/find-gsx', label: 'Find GSX' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const isAdmin = false
  const isRetailer = false
  const isLoggedIn = false

  const navLinks = publicNavLinks

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <header
      className={`sticky top-0 z-[60] transition-all duration-200 ${
        scrolled
          ? 'bg-[rgba(15,26,20,0.96)] backdrop-blur-md border-b border-[rgba(250,248,243,0.06)]'
          : 'bg-[var(--color-ink)]'
      }`}
    >
      <div className="w-full px-6 lg:px-10">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16 md:h-18 gap-x-4">

          {/* Logo — far left */}
          <Link
            href={isAdmin ? '/admin' : isRetailer ? '/portal' : '/'}
            className="col-start-1 flex items-center gap-2 group justify-self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label="Green Science Extracts home"
          >
            <Image
              src={NAV_LOGO_URL}
              alt="GSX, Oklahoma, Green Science Extracts, Respect the Dose"
              width={808}
              height={448}
              priority
              className="h-12 w-auto shrink-0"
            />
            {isAdmin && (
              <span className="text-label text-[rgba(250,248,243,0.4)] hidden sm:block">Admin</span>
            )}
          </Link>

          {/* Desktop nav — centered in the viewport regardless of side-group width.
              Gap scales fluidly from 768px (tight, avoids colliding with the
              logo/CTA groups) up to 1280px, where it locks at the approved
              96px and stays there through every wider desktop width. The
              outer grid's own gap-x-4 (below) is what actually guarantees
              breathing room to the logo/CTA groups — added after swapping
              "Learn" for the wider "Contact" label pushed the centered nav
              flush against Portal Login at 768px with zero gap, since the
              grid's 1fr side tracks had no minimum spacing of their own. */}
          <nav
            className="col-start-2 hidden md:flex items-center justify-self-center"
            style={{ columnGap: 'clamp(6px, 17.578vw - 129px, 96px)' }}
            aria-label="Main navigation"
          >
            {navLinks.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-label transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm ${
                    active
                      ? 'text-[var(--color-cream)]'
                      : 'text-[rgba(250,248,243,0.55)] hover:text-[var(--color-cream)]'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right side — far right: desktop CTAs, or mobile toggle */}
          <div className="col-start-3 flex items-center justify-end gap-4">
            <div className="hidden md:flex items-center gap-4">
              {isLoggedIn ? (
                <>
                  <span className="text-label text-[rgba(250,248,243,0.45)] truncate max-w-[140px]">
                    Account
                  </span>
                  <Button href="/portal" variant="secondary" size="sm">
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/portal"
                    className="text-label text-[rgba(250,248,243,0.55)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
                  >
                    Portal Login
                  </Link>
                  <Button href="/contact" variant="primary" size="sm">
                    Carry GSX
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu toggle — min-w/h-11 keeps the tap target at the
                44px minimum recommended size without enlarging the icon */}
            <button
              className="md:hidden flex flex-col items-center justify-center gap-[5px] min-w-11 min-h-11 -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(v => !v)}
            >
              <span className={`block w-5 h-[1.5px] bg-[var(--color-cream)] origin-center transition-transform duration-200 ${open ? 'translate-y-[6.5px] rotate-45' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-[var(--color-cream)] transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-[var(--color-cream)] origin-center transition-transform duration-200 ${open ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        className={`md:hidden overflow-hidden transition-all duration-200 ease-in-out ${
          open ? 'max-h-[480px] border-b border-[rgba(250,248,243,0.06)]' : 'max-h-0'
        } bg-[rgba(15,26,20,0.98)] backdrop-blur-md`}
      >
        <nav className="flex flex-col px-6 py-6 gap-6" aria-label="Mobile navigation">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`text-body transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm ${
                  active ? 'text-[var(--color-cream)]' : 'text-[rgba(250,248,243,0.6)]'
                }`}
              >
                {label}
              </Link>
            )
          })}
          {isLoggedIn ? (
            <Button href="/portal" variant="secondary" size="sm" className="self-start">
              Sign out
            </Button>
          ) : (
            <>
              <Link href="/portal" className="text-body text-[rgba(250,248,243,0.6)]">Portal Login</Link>
              <Button href="/contact" variant="primary" size="sm" className="self-start">Carry GSX</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
