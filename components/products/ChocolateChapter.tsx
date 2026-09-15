import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

// Warm caramel/brown accent, specific to this chapter only — derived from
// the real Chocolate Bites/Caramel Bites package colors (browns, caramel,
// gold-red), not the site-wide GSX green. "One coherent system" is kept
// through shared typography, spacing rhythm, and the square/no-card rules —
// not through forcing every section to the same accent color.
const CARAMEL = '#9a5a28'

const [chocolate, singles] = PRODUCT_FAMILIES

export function ChocolateChapter() {
  const [caramelBites, solidMilk, peanutButter] = chocolate.variants
  const [caramelSingle, solidMilkSingle, peanutButterSingle] = singles.variants

  return (
    <section
      id="chocolates"
      className="relative overflow-hidden scroll-mt-16 md:scroll-mt-18"
      style={{ background: 'linear-gradient(175deg, #f9f0e0 0%, #eed7b3 60%, #e8cda0 100%)' }}
    >
      {/* Large background typography — restrained, low-opacity, decorative
          only (aria-hidden, not read twice by screen readers). */}
      <p
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-4 md:top-0 left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 700,
          fontSize: 'clamp(5.5rem, 18vw, 13rem)',
          color: 'rgba(80,45,20,0.07)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}
      >
        CHOCOLATE
      </p>

      <div className={`${G} relative`} style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
        <p className="text-label" style={{ color: CARAMEL, marginBottom: '0.75rem' }}>01</p>
        <h2
          className="font-[family-name:var(--font-space-grotesk)] font-bold text-[var(--color-dark)]"
          style={{ fontSize: 'clamp(2.75rem, 6vw, 5rem)', lineHeight: '0.98', letterSpacing: '-0.03em' }}
        >
          Chocolate Bites
        </h2>
        <div style={{ width: '48px', height: '3px', backgroundColor: CARAMEL, marginTop: '1.25rem', marginBottom: '1.5rem' }} />
        <p className="text-body text-[var(--color-muted)]" style={{ maxWidth: '58ch' }}>
          {chocolate.description}
        </p>

        {/* Flagship trio — one integrated composition, not three equal
            catalog slots. Center bag largest and level; the two flanking
            bags smaller and gently rotated toward it, overlapping via
            negative margin. Rotation/overlap only applies at md+ — below
            that the three stack plainly so nothing collides on mobile. */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-10 md:gap-0" style={{ marginTop: '3.5rem' }}>
          <div className="w-full max-w-[230px] md:max-w-[250px] md:-mr-8 md:rotate-[-6deg] md:mb-4" style={{ position: 'relative', zIndex: 1 }}>
            <Image src={caramelBites.imageUrl!} alt={caramelBites.imageAlt!} width={caramelBites.imageWidth!} height={caramelBites.imageHeight!} sizes="(max-width: 768px) 60vw, 250px" className="w-full h-auto drop-shadow-xl" />
            <div className="text-center" style={{ marginTop: '0.75rem' }}>
              <p className="text-h4 text-[var(--color-dark)]">{caramelBites.name}</p>
              <p className="text-body-sm text-[var(--color-muted)]">{caramelBites.flavor}</p>
              <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.35rem' }}>
                {[caramelBites.netWeight, caramelBites.pieceCount].join(' · ')}
              </p>
            </div>
          </div>

          <div className="w-full max-w-[300px] md:max-w-[360px]" style={{ position: 'relative', zIndex: 2 }}>
            <Image src={solidMilk.imageUrl!} alt={solidMilk.imageAlt!} width={solidMilk.imageWidth!} height={solidMilk.imageHeight!} sizes="(max-width: 768px) 75vw, 360px" priority className="w-full h-auto drop-shadow-2xl" />
            <div className="text-center" style={{ marginTop: '0.75rem' }}>
              <p className="text-h4 text-[var(--color-dark)]">{solidMilk.name}</p>
              <p className="text-body-sm text-[var(--color-muted)]">{solidMilk.flavor}</p>
              <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.35rem' }}>
                {[solidMilk.netWeight, solidMilk.pieceCount].join(' · ')}
              </p>
            </div>
          </div>

          <div className="w-full max-w-[230px] md:max-w-[250px] md:-ml-8 md:rotate-[6deg] md:mb-4" style={{ position: 'relative', zIndex: 1 }}>
            <Image src={peanutButter.imageUrl!} alt={peanutButter.imageAlt!} width={peanutButter.imageWidth!} height={peanutButter.imageHeight!} sizes="(max-width: 768px) 60vw, 250px" className="w-full h-auto drop-shadow-xl" />
            <div className="text-center" style={{ marginTop: '0.75rem' }}>
              <p className="text-h4 text-[var(--color-dark)]">{peanutButter.name}</p>
              <p className="text-body-sm text-[var(--color-muted)]">{peanutButter.flavor}</p>
              <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.35rem' }}>
                {[peanutButter.netWeight, peanutButter.pieceCount].join(' · ')}
              </p>
            </div>
          </div>
        </div>

        {/* Singles — supporting subsection inside the same chapter, visually
            connected (same background) but clearly smaller in scale, no
            per-item CTA. A thin rule separates it from the flagship trio
            above rather than a hard section break. */}
        <div style={{ marginTop: '4.5rem', paddingTop: '3rem', borderTop: `1px solid rgba(80,45,20,0.15)` }}>
          <p className="text-h4 text-[var(--color-dark)]">Chocolate Bites Singles</p>
          <p className="text-body-sm text-[var(--color-muted)]" style={{ marginTop: '0.5rem', maxWidth: '52ch' }}>
            {singles.description}
          </p>

          <div className="flex flex-wrap items-start justify-center gap-8 md:gap-12" style={{ marginTop: '2rem' }}>
            {[caramelSingle, solidMilkSingle, peanutButterSingle].map((v) => (
              <div key={v.slug} className="text-center" style={{ width: '110px' }}>
                <Image src={v.imageUrl!} alt={v.imageAlt!} width={v.imageWidth!} height={v.imageHeight!} sizes="110px" className="w-full h-auto" />
                <p className="text-label text-[var(--color-dark)]" style={{ marginTop: '0.6rem' }}>{v.name}</p>
                <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.2rem', fontSize: '0.625rem' }}>
                  {[v.netWeight, v.pieceCount, v.perPiece].join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* One shared CTA for the whole chapter (flagship + Singles). */}
        <div className="flex justify-center" style={{ marginTop: '3.5rem' }}>
          <Button href="/find-gsx" variant="primary" size="lg">Find Chocolate Bites Near You</Button>
        </div>
      </div>
    </section>
  )
}
