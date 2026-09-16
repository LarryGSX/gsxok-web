import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { ProductFamilySection } from '@/components/products/ProductFamilySection'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

export const metadata = {
  title: 'Products',
  description: 'The full GSX lineup: Chocolate Bites, Precision Crafted Gummies, Fruit Crunchers, and The Hammer. Formulated, manufactured, and packaged in Chelsea, Oklahoma.',
}

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

const FAMILY_EMPHASIS: Record<string, 'flagship' | 'standard' | 'simple'> = {
  'chocolate-bites': 'flagship',
  'precision-crafted-gummies': 'standard',
  'fruit-crunchers': 'standard',
  'the-hammer': 'simple',
  // 'simple' emphasis's tighter section padding is the desired effect here;
  // its other effects (cardSize fallback, intro/row split) don't apply since
  // this family already sets its own cardSize below and isn't flagship.
  'chocolate-bites-singles': 'simple',
}

// Matches the footer's existing "/products#gummies" and "/products#chocolates"
// links, which had no matching target on this page until now.
const FAMILY_ANCHOR_IDS: Record<string, string> = {
  'chocolate-bites': 'chocolates',
  'precision-crafted-gummies': 'gummies',
}

// Overrides artwork size independent of emphasis (see ProductFamilySection's
// cardSize prop) — Chocolate Bites Singles keeps standard emphasis/spacing
// but uses slightly smaller artwork than Gummies/Fruit Crunchers.
const FAMILY_CARD_SIZE: Record<string, 'compact' | 'default' | 'medium' | 'large'> = {
  'chocolate-bites-singles': 'compact',
}

// Nudges the left intro block up (px, at xl+ only) so it reads balanced
// against a row whose artwork is noticeably shorter than the section's
// original card size — currently only needed for Chocolate Bites Singles.
const FAMILY_INTRO_OFFSET: Record<string, number> = {
  'chocolate-bites-singles': -32,
}

export default function ProductsPage() {
  return (
    <>
      <Nav />
      <main>
        {/* ── Compact dark intro — not a homepage-scale hero ──────────── */}
        <section className="bg-[var(--color-ink)]">
          <div className={G} style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
            <h1
              className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', lineHeight: '1.05', letterSpacing: '-0.03em' }}
            >
              The GSX Lineup
            </h1>
            <p
              className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
              style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1rem', maxWidth: '56ch' }}
            >
              Explore the GSX lineup, formulated, manufactured, and packaged by our team in Chelsea, Oklahoma. Find GSX at a licensed dispensary near you.
            </p>
          </div>
        </section>

        {/* ── Product families — cream showroom, real package artwork ─── */}
        {PRODUCT_FAMILIES.map((family, i) => (
          <ProductFamilySection
            key={family.slug}
            family={family}
            index={i + 1}
            emphasis={FAMILY_EMPHASIS[family.slug] ?? 'standard'}
            tone={i % 2 === 0 ? 'cream' : 'cream-2'}
            id={FAMILY_ANCHOR_IDS[family.slug]}
            cardSize={FAMILY_CARD_SIZE[family.slug]}
            introOffset={FAMILY_INTRO_OFFSET[family.slug]}
          />
        ))}

        {/* ── Find GSX ──────────────────────────────────────────────── */}
        <section className="bg-[var(--color-ink-alt)] border-t border-[rgba(250,248,243,0.06)]">
          <div className={G} style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-6 sm:gap-12 mx-auto"
              style={{ maxWidth: '780px' }}
            >
              <div className="flex items-center gap-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-accent)]" aria-hidden="true">
                  <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Z" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <div>
                  <h2 className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ fontSize: 'clamp(1.375rem, 2vw, 1.75rem)', letterSpacing: '-0.02em' }}>
                    Find GSX near you
                  </h2>
                  <p className="text-[rgba(250,248,243,0.4)] font-[family-name:var(--font-manrope)]" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Available at select dispensaries across Oklahoma.
                  </p>
                </div>
              </div>
              <Button href="/find-gsx" variant="secondary" size="lg" className="shrink-0">
                Find a Retailer
              </Button>
            </div>
          </div>
        </section>

        {/* ── Retailer strip ────────────────────────────────────────── */}
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
                  href="/login"
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
