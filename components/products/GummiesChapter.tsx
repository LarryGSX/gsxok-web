import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

const gummies = PRODUCT_FAMILIES.find((f) => f.slug === 'precision-crafted-gummies')!

// Per-variant accent pulled from that variant's own real package color —
// Focus (red/orange berry art), Relax (deep purple night art), Balance
// (green forest/watermelon art).
const VARIANT_ACCENT: Record<string, string> = {
  focus: '#e0674a',
  relax: '#8b6fc9',
  balance: '#5fa06a',
}

export function GummiesChapter() {
  const supporting = gummies.supportingImage

  return (
    <section id="gummies" className="relative scroll-mt-16 md:scroll-mt-18" style={{ backgroundColor: 'var(--color-ink)' }}>
      <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10">
          {/* ── LEFT: family story ──────────────────────────────────── */}
          <div className="lg:col-span-4">
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '0.5rem' }}>02</p>
            <p
              className="font-[family-name:var(--font-space-grotesk)] italic"
              style={{ color: 'rgba(250,248,243,0.7)', fontSize: 'clamp(1.125rem, 1.6vw, 1.375rem)', fontWeight: 500 }}
            >
              Precision Crafted
            </p>
            <h2
              className="font-[family-name:var(--font-space-grotesk)] font-bold text-[var(--color-cream)]"
              style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', lineHeight: '1', letterSpacing: '-0.03em', marginTop: '0.25rem' }}
            >
              Gummies
            </h2>
            <div style={{ width: '48px', height: '3px', backgroundColor: 'var(--color-accent)', marginTop: '1.25rem', marginBottom: '1.5rem' }} />
            <p className="font-[family-name:var(--font-manrope)] font-light" style={{ color: 'rgba(250,248,243,0.55)', fontSize: '1rem', lineHeight: '1.65' }}>
              {gummies.description} Each ratio is built around a specific enhancement decision, Sativa, Indica, or Hybrid, not a flavor gimmick.
            </p>
          </div>

          {/* ── CENTER: grouped packages + real supporting photo ───── */}
          <div className="lg:col-span-5" style={{ marginTop: '3rem' }}>
            <div className="grid grid-cols-3 items-end justify-items-center" style={{ gap: '0.75rem' }}>
              {gummies.variants.map((v) => (
                <div key={v.slug} className="w-full max-w-[180px]">
                  <Image src={v.imageUrl!} alt={v.imageAlt!} width={v.imageWidth!} height={v.imageHeight!} sizes="(max-width: 640px) 30vw, 180px" className="w-full h-auto drop-shadow-2xl" />
                </div>
              ))}
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
                  style={{ aspectRatio: '4 / 3', objectFit: 'cover', objectPosition: '50% 30%' }}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT: verified facts ───────────────────────────────── */}
          <div className="lg:col-span-3" style={{ marginTop: '3rem' }}>
            <div className="flex flex-col" style={{ gap: '1.1rem' }}>
              {gummies.variants.map((v) => {
                const accent = VARIANT_ACCENT[v.slug] ?? 'var(--color-accent)'
                return (
                  <div key={v.slug} style={{ borderBottom: '1px solid rgba(250,248,243,0.1)', paddingBottom: '1.1rem' }}>
                    <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: accent, fontSize: '1.0625rem' }}>
                      {v.name}
                    </p>
                    <p className="text-body-sm" style={{ color: 'rgba(250,248,243,0.6)', marginTop: '0.15rem' }}>{v.flavor}</p>
                    <p className="text-label" style={{ color: 'rgba(250,248,243,0.45)', marginTop: '0.3rem' }}>
                      {v.enhancement}
                    </p>
                    <p className="text-label" style={{ color: accent, marginTop: '0.15rem' }}>
                      {v.ratio}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-center" style={{ marginTop: '3.5rem' }}>
          <Button href="/find-gsx" variant="secondary" size="lg">Find Precision Crafted Gummies Near You</Button>
        </div>
      </div>
    </section>
  )
}
