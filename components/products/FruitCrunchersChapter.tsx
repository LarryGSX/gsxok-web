import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

const fruitCrunchers = PRODUCT_FAMILIES.find((f) => f.slug === 'fruit-crunchers')!

const CITRUS = '#c96a1f'
const VARIANT_ACCENT: Record<string, string> = {
  elevate: '#7a9a2e',
  relax: '#2f7f8c',
  boost: '#c94a2f',
}

export function FruitCrunchersChapter() {
  const supporting = fruitCrunchers.supportingImage

  return (
    <section id="fruit-crunchers" className="relative scroll-mt-16 md:scroll-mt-18" style={{ backgroundColor: '#fdf1d6' }}>
      <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10">
          {/* ── LEFT: family story ──────────────────────────────────── */}
          <div className="lg:col-span-4">
            <p className="text-label" style={{ color: CITRUS, marginBottom: '0.75rem' }}>03</p>
            <h2
              className="font-[family-name:var(--font-space-grotesk)] font-bold text-[var(--color-dark)]"
              style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', lineHeight: '1', letterSpacing: '-0.03em' }}
            >
              Fruit Crunchers
            </h2>
            <div style={{ width: '48px', height: '3px', backgroundColor: CITRUS, marginTop: '1.25rem', marginBottom: '1.5rem' }} />
            <p className="text-body text-[var(--color-muted)]">
              {fruitCrunchers.description} All three are built on the same 25mg THC per piece base, with a different secondary cannabinoid, CBD, CBN, or CBG, layered in for each variety.
            </p>
          </div>

          {/* ── CENTER: grouped packages + real supporting photo ───── */}
          <div className="lg:col-span-5" style={{ marginTop: '3rem' }}>
            <div className="grid grid-cols-3 items-end justify-items-center" style={{ gap: '0.75rem' }}>
              {fruitCrunchers.variants.map((v) => (
                <div key={v.slug} className="w-full max-w-[180px]">
                  <Image src={v.imageUrl!} alt={v.imageAlt!} width={v.imageWidth!} height={v.imageHeight!} sizes="(max-width: 640px) 30vw, 180px" className="w-full h-auto drop-shadow-xl" />
                </div>
              ))}
            </div>

            {supporting && (
              <div className="w-full mx-auto" style={{ maxWidth: '360px', marginTop: '1.75rem' }}>
                <Image
                  src={supporting.url}
                  alt={supporting.alt}
                  width={supporting.width}
                  height={supporting.height}
                  sizes="(max-width: 640px) 80vw, 360px"
                  className="w-full h-auto"
                  style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT: verified facts ───────────────────────────────── */}
          <div className="lg:col-span-3" style={{ marginTop: '3rem' }}>
            <div className="flex flex-col" style={{ gap: '1.1rem' }}>
              {fruitCrunchers.variants.map((v) => {
                const accent = VARIANT_ACCENT[v.slug] ?? CITRUS
                return (
                  <div key={v.slug} style={{ borderBottom: '1px solid rgba(120,60,10,0.15)', paddingBottom: '1.1rem' }}>
                    <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: accent, fontSize: '1.0625rem' }}>
                      {v.name}
                    </p>
                    <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.3rem' }}>
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
          </div>
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
