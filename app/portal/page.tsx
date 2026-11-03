import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { PortalAuth } from '@/components/portal/PortalAuth'

export const metadata = {
  title: 'Portal Login',
  description: 'Log in to your GSX account, or create a new one.',
}

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

// Same green-to-cream fade used on every other public page — reused
// selectively here, only where a dark section hands off directly into a
// cream one.
const GREEN_FADE = {
  backgroundImage:
    'linear-gradient(to bottom, rgba(26,122,74,0.32) 0%, rgba(26,122,74,0.12) 20%, rgba(26,122,74,0) 60%, rgba(26,122,74,0) 100%)',
}
const GREEN_FADE_CLASS = 'relative bg-[length:100%_96px] md:bg-[length:100%_160px] bg-no-repeat bg-top'

// A single unified account page — one login form plus an inline
// "New to GSX?" registration form, never a tabbed or two-screen interface.
// This is front-end/staging only: no HostGator connection, no database
// write, no real next-auth signIn() call, and no fabricated success state.
// lib/auth.ts already has a fully configured Credentials provider and a
// matching Prisma User model (see PortalAuth.tsx), but wiring this page to
// either is explicitly out of scope for this pass — both forms run real
// client-side validation and a real loading state, then land on an honest
// "not connected yet" notice.
export default function PortalPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── 1. HERO — same compact, dark, typographic pattern as every
            other page (Find GSX, Contact, About). ─────────────────────── */}
        <section className="bg-[var(--color-ink)]">
          <div className={G} style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '1rem' }}>
              Portal
            </p>
            <h1
              className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', lineHeight: '1.05', letterSpacing: '-0.03em' }}
            >
              Portal Login
            </h1>
            <p
              className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
              style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1rem', maxWidth: '56ch' }}
            >
              Log in to your GSX account
            </p>
          </div>
        </section>

        {/* ── 2. ACCOUNT — cream. Login form, then the New to GSX section,
            then (expanded inline, same page) the registration form. See
            PortalAuth.tsx for all the interactive state. ───────────────── */}
        <section className={`${GREEN_FADE_CLASS} bg-[var(--color-cream)]`} style={GREEN_FADE}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '5rem' }}>
            <PortalAuth />
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
