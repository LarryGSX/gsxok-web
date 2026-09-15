import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

const hammerFamily = PRODUCT_FAMILIES.find((f) => f.slug === 'the-hammer')!
const hammer = hammerFamily.variants[0]

// Gold accent pulled directly from the real Hammer package's own foil-gold
// lettering — the page's most premium, most restrained-elsewhere accent,
// used deliberately only for this one closing chapter.
const GOLD = '#c9a961'

export function HammerChapter() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: '#0a0a09' }}>
      <p
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-6 md:-top-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 700,
          fontSize: 'clamp(4rem, 15vw, 11rem)',
          color: 'rgba(201,169,97,0.06)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        THE HAMMER
      </p>

      <div className={`${G} relative`} style={{ paddingTop: '5.5rem', paddingBottom: '6rem' }}>
        <p className="text-label" style={{ color: GOLD, marginBottom: '0.75rem', textAlign: 'center' }}>04</p>
        <h2
          className="font-[family-name:var(--font-space-grotesk)] font-bold text-center"
          style={{ color: GOLD, fontSize: 'clamp(3rem, 7vw, 5.5rem)', lineHeight: '0.98', letterSpacing: '-0.03em' }}
        >
          The Hammer
        </h2>
        <div style={{ width: '48px', height: '3px', backgroundColor: GOLD, margin: '1.25rem auto 1.5rem' }} />
        <p
          className="font-[family-name:var(--font-manrope)] font-light text-center mx-auto"
          style={{ color: 'rgba(250,248,243,0.6)', fontSize: '1.0625rem', lineHeight: '1.68', maxWidth: '52ch' }}
        >
          {hammerFamily.description}
        </p>

        <div className="flex justify-center" style={{ marginTop: '3.5rem' }}>
          <div className="w-full" style={{ maxWidth: '460px' }}>
            <Image
              src={hammer.imageUrl!}
              alt={hammer.imageAlt!}
              width={hammer.imageWidth!}
              height={hammer.imageHeight!}
              sizes="(max-width: 768px) 82vw, 460px"
              className="w-full h-auto"
              style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.5))' }}
            />
          </div>
        </div>

        {/* Verified packaging information only — printed exactly as it
            appears on the real package. Total CBD (1000mg, front-of-pack)
            and per-square CBD (40mg x 24 squares = 960mg) do not
            arithmetically reconcile; that inconsistency exists on the
            approved packaging itself, so both figures are shown as printed
            rather than recalculated or silently corrected. See the
            completion report. */}
        <div
          className="flex flex-wrap items-center justify-center mx-auto"
          style={{ gap: '2.5rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(201,169,97,0.2)', maxWidth: '520px' }}
        >
          <div className="text-center">
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)' }}>Package</p>
            <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: GOLD, fontSize: '1.0625rem', marginTop: '0.25rem' }}>
              {hammer.pieceCount}
            </p>
          </div>
          <div className="text-center">
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)' }}>Per Square</p>
            <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: GOLD, fontSize: '1.0625rem', marginTop: '0.25rem' }}>
              {hammer.perPiece}
            </p>
          </div>
          <div className="text-center">
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)' }}>Per Bar (as printed)</p>
            <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: GOLD, fontSize: '1.0625rem', marginTop: '0.25rem' }}>
              {hammer.totalPotency}
            </p>
          </div>
        </div>

        <div className="flex justify-center" style={{ marginTop: '3rem' }}>
          <Button href="/find-gsx" variant="primary" size="lg">Find The Hammer Near You</Button>
        </div>
      </div>
    </section>
  )
}
