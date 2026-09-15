import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

const fruitCrunchers = PRODUCT_FAMILIES.find((f) => f.slug === 'fruit-crunchers')!

// Warm citrus accent, specific to this chapter — derived from the real
// Elevate/Boost package colors (green-to-orange, orange-to-red). Relax's
// own package is blue/teal, kept as that one card's own accent below
// rather than forced into the section-wide warm wash.
const CITRUS = '#c96a1f'
const VARIANT_ACCENT: Record<string, string> = {
  elevate: '#7a9a2e',
  relax: '#2f7f8c',
  boost: '#c94a2f',
}

export function FruitCrunchersChapter() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(175deg, #fdf6e6 0%, #fbe7bc 55%, #f6d495 100%)' }}
    >
      <p
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-4 md:top-0 left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 700,
          fontSize: 'clamp(4.5rem, 15vw, 11rem)',
          color: 'rgba(120,60,10,0.07)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}
      >
        FRUIT CRUNCHERS
      </p>

      <div className={`${G} relative`} style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
        <p className="text-label" style={{ color: CITRUS, marginBottom: '0.75rem' }}>03</p>
        <h2
          className="font-[family-name:var(--font-space-grotesk)] font-bold text-[var(--color-dark)]"
          style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', lineHeight: '0.98', letterSpacing: '-0.03em' }}
        >
          Fruit Crunchers
        </h2>
        <div style={{ width: '48px', height: '3px', backgroundColor: CITRUS, marginTop: '1.25rem', marginBottom: '1.5rem' }} />
        <p className="text-body text-[var(--color-muted)]" style={{ maxWidth: '58ch' }}>
          {fruitCrunchers.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-8" style={{ marginTop: '3.5rem' }}>
          {fruitCrunchers.variants.map((v) => {
            const accent = VARIANT_ACCENT[v.slug] ?? CITRUS
            return (
              <div key={v.slug} className="flex flex-col items-center text-center">
                <div className="w-full max-w-[260px]">
                  <Image src={v.imageUrl!} alt={v.imageAlt!} width={v.imageWidth!} height={v.imageHeight!} sizes="(max-width: 640px) 70vw, 260px" className="w-full h-auto drop-shadow-xl" />
                </div>
                <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: accent, fontSize: '1.25rem', letterSpacing: '-0.01em', marginTop: '1rem' }}>
                  {v.name}
                </p>
                <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                  {[v.netWeight, v.pieceCount].join(' · ')}
                </p>
                <p className="text-label" style={{ color: accent, marginTop: '0.2rem' }}>
                  {v.perPiece}
                </p>
                {v.totalPotency && (
                  <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                    {v.totalPotency}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-center" style={{ marginTop: '3.5rem' }}>
          <Button href="/find-gsx" variant="primary" size="lg">
            Find Fruit Crunchers Near You
          </Button>
        </div>
      </div>
    </section>
  )
}
