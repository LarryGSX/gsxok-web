import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { ContactForm } from '@/components/contact/ContactForm'

export const metadata = {
  title: 'Contact',
  description: 'Get in touch with GSX about products, availability, or carrying GSX in your store.',
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

// Verified public contact details from the original GSX site.
const CONTACT_EMAIL = 'contact@gsxok.com'
const CONTACT_PHONE = '855-962-5326'
const CONTACT_PHONE_TEL = 'tel:+18559625326'

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── 1. HERO — compact, dark, typographic. No imagery. ────────── */}
        <section className="bg-[var(--color-ink)]">
          <div className={G} style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '1rem' }}>
              Contact
            </p>
            <h1
              className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', lineHeight: '1.05', letterSpacing: '-0.03em' }}
            >
              Get in touch with GSX
            </h1>
            <p
              className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
              style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1rem', maxWidth: '56ch' }}
            >
              Questions about GSX products, availability, or carrying GSX in your store? Reach out and we&rsquo;ll point you in the right direction.
            </p>
          </div>
        </section>

        {/* ── 2. MAIN CONTACT — cream. Intro copy and verified contact
            details up top, form below with its own constrained width (see
            ContactForm). The form posts to app/api/contact/route.ts, which
            sends via Resend server-side only — no key ever reaches the
            browser. See the completion report for the anti-spam layers and
            what production configuration is still required. ───────────── */}
        <section id="contact" className={`${GREEN_FADE_CLASS} bg-[var(--color-cream)]`} style={GREEN_FADE}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <h2 className="text-h2 text-[var(--color-dark)]">Contact GSX</h2>
            <p className="text-body text-[var(--color-muted)]" style={{ marginTop: '0.75rem', maxWidth: '58ch' }}>
              Have a question about GSX products, availability, or something else? Reach out by email or phone and our team will help point you in the right direction.
            </p>

            <div className="sm:flex sm:flex-wrap" style={{ marginTop: '2rem', gap: '2rem 4rem' }}>
              <div style={{ marginTop: '1.5rem' }} className="sm:mt-0">
                <p className="text-label" style={{ color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                  Email
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-h4"
                  style={{ color: 'var(--color-green)' }}
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div style={{ marginTop: '1.5rem' }} className="sm:mt-0">
                <p className="text-label" style={{ color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                  Phone
                </p>
                <a
                  href={CONTACT_PHONE_TEL}
                  className="text-h4"
                  style={{ color: 'var(--color-green)' }}
                >
                  {CONTACT_PHONE}
                </a>
              </div>
              <div style={{ marginTop: '1.5rem' }} className="sm:mt-0">
                <p className="text-label" style={{ color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                  Location
                </p>
                <p className="text-h4 text-[var(--color-dark)]">
                  Chelsea, Oklahoma 74016
                </p>
              </div>
            </div>

            <div style={{ marginTop: '3rem', paddingTop: '2.5rem', borderTop: '1px solid var(--color-border)' }}>
              <ContactForm />
            </div>
          </div>
        </section>

        {/* ── 3. RETAILER CONVERSION BAND — reused verbatim from
            Homepage / Products / About / Find GSX. The separate dark
            "Interested in carrying GSX?" section that used to sit above
            this was removed as redundant — this band already covers the
            same message (heading, copy, Carry GSX, Retailer Portal). ── */}
        <section className="bg-[var(--color-green)]">
          <div className={G} style={{ paddingTop: '2.25rem', paddingBottom: '2.25rem' }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="shrink-0">
                <p className="text-label" style={{ color: 'rgba(250,248,243,0.7)', marginBottom: '0.3rem' }}>
                  For Retailers
                </p>
                <h2
                  className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold whitespace-nowrap"
                  style={{ fontSize: 'clamp(1.375rem, 2.2vw, 1.875rem)', letterSpacing: '-0.02em' }}
                >
                  Carry GSX in your store
                </h2>
              </div>
              <p
                className="text-[rgba(250,248,243,0.68)] font-[family-name:var(--font-manrope)]"
                style={{ fontSize: '0.9375rem', maxWidth: '34ch' }}
              >
                Oklahoma-licensed dispensaries can apply to stock GSX products.
              </p>
              <div className="flex flex-wrap items-center gap-5 shrink-0">
                <Button href="/contact" variant="secondary" size="lg">Carry GSX</Button>
                <Link
                  href="/portal"
                  className="text-button text-[rgba(250,248,243,0.55)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cream)] focus-visible:rounded-sm"
                >
                  Retailer Portal →
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
