import Image from 'next/image'
import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { ChocolateChapter } from '@/components/products/ChocolateChapter'
import { GummiesChapter } from '@/components/products/GummiesChapter'
import { FruitCrunchersChapter } from '@/components/products/FruitCrunchersChapter'
import { HammerChapter } from '@/components/products/HammerChapter'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

export const metadata = {
  title: 'Products',
  description: 'The full GSX lineup: Chocolate Bites, Precision Crafted Gummies, Fruit Crunchers, and The Hammer. Formulated, manufactured, and packaged in Chelsea, Oklahoma.',
}

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

// Same authentic multi-product lineup photo already approved and used as
// the Homepage hero — reused here rather than assembling a new composite
// from individual package cutouts, since a real, already-shot composite of
// the whole lineup is the strongest authentic option available. Hardcoded
// (not pulled from the same Sanity field Homepage uses) so this page's
// hero stays stable if that CMS field is ever changed for the Homepage.
const LINEUP_PHOTO_URL = 'https://cdn.sanity.io/images/o7wavkxv/production/b9b67322f08a0147d0f1b71056f5c7682b9892ad-1672x941.webp'

// One representative real package per family, used as small wayfinding
// thumbnails in the hero — same approved artwork already used in each
// family's own chapter, not new imagery.
const [chocolateFamily, , gummiesFamily, fruitCrunchersFamily, hammerFamily] = PRODUCT_FAMILIES
const HERO_FAMILY_LINKS = [
  { href: '#chocolates', label: 'Chocolate Bites', variant: chocolateFamily.variants[1] },
  { href: '#gummies', label: 'Gummies', variant: gummiesFamily.variants[0] },
  { href: '#fruit-crunchers', label: 'Fruit Crunchers', variant: fruitCrunchersFamily.variants[0] },
  { href: '#hammer', label: 'The Hammer', variant: hammerFamily.variants[0] },
]

export default function ProductsPage() {
  return (
    <>
      <Nav />
      <main>
        {/* ── HERO — product-led, not a plain text intro. Real lineup photo,
            not a new composite or invented lifestyle imagery. ──────────── */}
        <section className="bg-[var(--color-ink)]">
          <div className={`${G} lg:grid lg:grid-cols-[46fr_54fr] lg:items-center lg:gap-12`}>
            <div style={{ paddingTop: '3.5rem', paddingBottom: '2rem' }}>
              <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '1rem' }}>Products</p>
              <h1
                className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-bold"
                style={{ fontSize: 'clamp(2.5rem, 4.2vw, 3.75rem)', lineHeight: '1', letterSpacing: '-0.03em' }}
              >
                The Full GSX Lineup
              </h1>
              <p
                className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
                style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1.25rem', maxWidth: '44ch' }}
              >
                Chocolate Bites, Precision Crafted Gummies, Fruit Crunchers, and The Hammer, every product formulated, manufactured, and packaged by our team in Chelsea, Oklahoma.
              </p>
              <div className="flex flex-wrap items-center gap-5" style={{ marginTop: '2rem' }}>
                <Link
                  href="#chocolates"
                  className="text-button px-8 h-12 inline-flex items-center bg-[var(--color-green)] text-[var(--color-cream)] border border-[var(--color-green)] hover:bg-[#155f3a] hover:border-[#155f3a] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  Explore The Lineup
                </Link>
                <Link
                  href="/find-gsx"
                  className="text-button text-[rgba(250,248,243,0.4)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
                >
                  Find GSX →
                </Link>
              </div>

              {/* Wayfinding strip — real package thumbnails, one per family,
                  jumping straight to that family's chapter. */}
              <div className="flex flex-wrap items-center gap-6" style={{ marginTop: '2.75rem' }}>
                {HERO_FAMILY_LINKS.map((f) => (
                  <Link
                    key={f.href}
                    href={f.href}
                    className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
                  >
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(250,248,243,0.06)' }}>
                      <Image
                        src={f.variant.imageUrl!}
                        alt=""
                        width={f.variant.imageWidth!}
                        height={f.variant.imageHeight!}
                        sizes="36px"
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span
                      className="text-label group-hover:text-[var(--color-cream)] transition-colors duration-150"
                      style={{ color: 'rgba(250,248,243,0.45)' }}
                    >
                      {f.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center w-full" style={{ paddingBottom: '2rem' }}>
              <Image
                src={LINEUP_PHOTO_URL}
                alt="GSX product lineup: Precision Crafted Gummies, The Hammer, Fruit Crunchers, and Chocolate Bites"
                width={1672}
                height={941}
                priority
                sizes="(max-width: 1024px) 100vw, 54vw"
                className="w-full h-auto lg:max-w-[720px]"
              />
            </div>
          </div>
        </section>

        {/* ── Product family chapters — each its own visual identity, one
            shared CTA per chapter instead of a button under every SKU ─── */}
        <ChocolateChapter />
        <GummiesChapter />
        <FruitCrunchersChapter />
        <HammerChapter />

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
