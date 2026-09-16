import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

// Warm caramel/brown accent, specific to this chapter only — derived from
// the real Chocolate Bites/Caramel Bites package colors (browns, caramel,
// gold-red), not the site-wide GSX green.
const CARAMEL = '#9a5a28'

const [chocolate, singles] = PRODUCT_FAMILIES

export function ChocolateChapter() {
  const [caramelBites, solidMilk, peanutButter] = chocolate.variants
  const [caramelSingle, solidMilkSingle, peanutButterSingle] = singles.variants
  const supporting = chocolate.supportingImage

  return (
    <section id="chocolates" className="relative scroll-mt-16 md:scroll-mt-18" style={{ backgroundColor: '#f7ecd9' }}>
      <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10">
          {/* ── LEFT: family story ──────────────────────────────────── */}
          <div className="lg:col-span-4">
            <p className="text-label" style={{ color: CARAMEL, marginBottom: '0.75rem' }}>01</p>
            <h2
              className="font-[family-name:var(--font-space-grotesk)] font-bold text-[var(--color-dark)]"
              style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', lineHeight: '1', letterSpacing: '-0.03em' }}
            >
              Chocolate Bites
            </h2>
            <div style={{ width: '48px', height: '3px', backgroundColor: CARAMEL, marginTop: '1.25rem', marginBottom: '1.5rem' }} />
            <p className="text-body text-[var(--color-muted)]">
              {chocolate.description} Each flavor is formulated, molded, and packaged by our own team, the same process behind every GSX product.
            </p>
            <p className="text-body-sm text-[var(--color-muted)]" style={{ marginTop: '1.25rem' }}>
              Chocolate Bites Singles offer the same three flavors in a single-serve, one-piece pouch at 100mg THC total.
            </p>
          </div>

          {/* ── CENTER: grouped packages + real supporting photo ───── */}
          <div className="lg:col-span-5" style={{ marginTop: '3rem' }}>
            <div className="flex flex-row items-end justify-center" style={{ gap: 0 }}>
              <div className="w-full max-w-[140px] -mr-5 rotate-[-6deg]" style={{ position: 'relative', zIndex: 1 }}>
                <Image src={caramelBites.imageUrl!} alt={caramelBites.imageAlt!} width={caramelBites.imageWidth!} height={caramelBites.imageHeight!} sizes="(max-width: 640px) 32vw, 140px" className="w-full h-auto drop-shadow-xl" />
              </div>
              <div className="w-full max-w-[190px]" style={{ position: 'relative', zIndex: 2 }}>
                <Image src={solidMilk.imageUrl!} alt={solidMilk.imageAlt!} width={solidMilk.imageWidth!} height={solidMilk.imageHeight!} sizes="(max-width: 640px) 42vw, 190px" priority className="w-full h-auto drop-shadow-2xl" />
              </div>
              <div className="w-full max-w-[140px] -ml-5 rotate-[6deg]" style={{ position: 'relative', zIndex: 1 }}>
                <Image src={peanutButter.imageUrl!} alt={peanutButter.imageAlt!} width={peanutButter.imageWidth!} height={peanutButter.imageHeight!} sizes="(max-width: 640px) 32vw, 140px" className="w-full h-auto drop-shadow-xl" />
              </div>
            </div>

            {supporting && (
              <div className="w-full mx-auto" style={{ maxWidth: '320px', marginTop: '1.75rem' }}>
                <Image
                  src={supporting.url}
                  alt={supporting.alt}
                  width={supporting.width}
                  height={supporting.height}
                  sizes="(max-width: 640px) 70vw, 320px"
                  className="w-full h-auto"
                  style={{ aspectRatio: '4 / 3', objectFit: 'cover', objectPosition: '50% 35%' }}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT: verified facts ───────────────────────────────── */}
          <div className="lg:col-span-3" style={{ marginTop: '3rem' }}>
            <div className="flex flex-col" style={{ gap: '1.1rem' }}>
              {[caramelBites, solidMilk, peanutButter].map((v) => (
                <div key={v.slug} style={{ borderBottom: `1px solid rgba(80,45,20,0.15)`, paddingBottom: '1.1rem' }}>
                  <p className="font-[family-name:var(--font-space-grotesk)] font-semibold text-[var(--color-dark)]" style={{ fontSize: '1.0625rem' }}>
                    {v.name}
                  </p>
                  <p className="text-body-sm text-[var(--color-muted)]" style={{ marginTop: '0.15rem' }}>{v.flavor}</p>
                  <p className="text-label" style={{ color: CARAMEL, marginTop: '0.3rem' }}>
                    {[v.netWeight, v.pieceCount].join(' · ')}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <p className="text-label" style={{ color: 'var(--color-muted)', marginBottom: '0.75rem' }}>Chocolate Bites Singles</p>
              <div className="flex items-start gap-4">
                {[caramelSingle, solidMilkSingle, peanutButterSingle].map((v) => (
                  <div key={v.slug} className="text-center" style={{ width: '68px' }}>
                    <Image src={v.imageUrl!} alt={v.imageAlt!} width={v.imageWidth!} height={v.imageHeight!} sizes="68px" className="w-full h-auto" />
                  </div>
                ))}
              </div>
              <p className="text-label" style={{ color: 'var(--color-muted)', marginTop: '0.6rem', fontSize: '0.6875rem' }}>
                8g (0.28oz) · 1 Piece · 100mg THC each
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center" style={{ marginTop: '3.5rem' }}>
          <Button href="/find-gsx" variant="primary" size="lg">Find Chocolate Bites Near You</Button>
        </div>
      </div>
    </section>
  )
}
