import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { RetailerLocator } from '@/components/find-gsx/RetailerLocator'
import { getRetailers } from '@/lib/retailers/getRetailers'

export const revalidate = 3600

export const metadata = {
  title: 'Find GSX',
  description: 'Search for licensed Oklahoma dispensaries carrying GSX products near you.',
}

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

export default async function FindGsxPage() {
  const { retailers, source } = await getRetailers()

  return (
    <>
      <Nav />
      <main>

        {/* ── 1. HERO — compact, dark, typographic. Consistent with the
            Products/About intro pattern (same eyebrow → h1 → supporting
            copy rhythm, same padding). No image, no product montage: this
            is a functional consumer page, not a storytelling one. ────── */}
        <section className="bg-[var(--color-ink)]">
          <div className={G} style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '1rem' }}>
              Find GSX
            </p>
            <h1
              className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', lineHeight: '1.05', letterSpacing: '-0.03em' }}
            >
              Find GSX near you
            </h1>
            <p
              className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
              style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1rem', maxWidth: '56ch' }}
            >
              Enter your ZIP code to find GSX retailers near you
            </p>
          </div>
        </section>

        {/* ── 2. LOCATOR — ZIP search + nearest results + the full
            retailer directory. No map. See
            components/find-gsx/RetailerLocator.tsx for the full
            architecture (ZIP lookup, distance sort, empty/error states,
            mock-data fallback). ─────────────────────────────────────── */}
        <RetailerLocator retailers={retailers} dataSource={source} />

        {/* ── 3. PRODUCT AVAILABILITY NOTE — compact, restrained. Not a
            marketing section, not a real-time inventory claim. ───────── */}
        <section className="bg-[var(--color-cream)] border-t border-[var(--color-border)]">
          <div className={G} style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
            <h2 className="text-h4 text-[var(--color-dark)]">
              Looking for a specific GSX product?
            </h2>
            <p className="text-body-sm mt-2" style={{ color: 'var(--color-muted)', maxWidth: '64ch' }}>
              Product selection varies by retailer. Check with the dispensary before visiting if you are looking for a specific GSX product.
            </p>
          </div>
        </section>

        {/* ── 4. RETAILER CONVERSION BAND — reused verbatim from
            Homepage / Products / About. ────────────────────────────── */}
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
