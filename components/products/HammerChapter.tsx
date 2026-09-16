import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

const hammerFamily = PRODUCT_FAMILIES.find((f) => f.slug === 'the-hammer')!
const hammer = hammerFamily.variants[0]

// Gold accent pulled directly from the real Hammer package's own foil-gold
// lettering.
const GOLD = '#c9a961'

export function HammerChapter() {
  return (
    <section id="hammer" className="relative scroll-mt-16 md:scroll-mt-18" style={{ backgroundColor: '#0a0a09' }}>
      <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10 lg:items-center">
          {/* ── LEFT: story ─────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <p className="text-label" style={{ color: GOLD, marginBottom: '0.75rem' }}>04</p>
            <h2
              className="font-[family-name:var(--font-space-grotesk)] font-bold"
              style={{ color: GOLD, fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', lineHeight: '1', letterSpacing: '-0.03em' }}
            >
              The Hammer
            </h2>
            <div style={{ width: '48px', height: '3px', backgroundColor: GOLD, marginTop: '1.25rem', marginBottom: '1.5rem' }} />
            <p className="font-[family-name:var(--font-manrope)] font-light" style={{ color: 'rgba(250,248,243,0.6)', fontSize: '1rem', lineHeight: '1.65' }}>
              {hammerFamily.description}
            </p>
          </div>

          {/* ── CENTER: real package art, product-led, no invented photo ── */}
          <div className="lg:col-span-5 flex justify-center" style={{ marginTop: '3rem' }}>
            <div className="w-full" style={{ maxWidth: '360px' }}>
              <Image
                src={hammer.imageUrl!}
                alt={hammer.imageAlt!}
                width={hammer.imageWidth!}
                height={hammer.imageHeight!}
                sizes="(max-width: 768px) 82vw, 360px"
                className="w-full h-auto"
                style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.5))' }}
              />
            </div>
          </div>

          {/* ── RIGHT: verified facts only ──────────────────────────── */}
          <div className="lg:col-span-3" style={{ marginTop: '3rem' }}>
            <div className="flex flex-col" style={{ gap: '1.1rem' }}>
              <div style={{ borderBottom: '1px solid rgba(201,169,97,0.2)', paddingBottom: '1.1rem' }}>
                <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)' }}>Package</p>
                <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: GOLD, fontSize: '1.0625rem', marginTop: '0.25rem' }}>
                  {hammer.pieceCount}
                </p>
              </div>
              <div style={{ borderBottom: '1px solid rgba(201,169,97,0.2)', paddingBottom: '1.1rem' }}>
                <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)' }}>Per Square</p>
                <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: GOLD, fontSize: '1.0625rem', marginTop: '0.25rem' }}>
                  {hammer.perPiece}
                </p>
              </div>
              <div>
                {/* Total CBD intentionally omitted — the package's printed
                    1000mg CBD total doesn't reconcile with 40mg x 24 squares
                    (960mg). Only the reconciling total THC figure is shown.
                    See lib/products/catalog.ts and the completion report. */}
                <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)' }}>Total THC (per bar)</p>
                <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: GOLD, fontSize: '1.0625rem', marginTop: '0.25rem' }}>
                  {hammer.totalTHC}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center" style={{ marginTop: '3.5rem' }}>
          <Button href="/find-gsx" variant="primary" size="lg">Find The Hammer Near You</Button>
        </div>
      </div>
    </section>
  )
}
