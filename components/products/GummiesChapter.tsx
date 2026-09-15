import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

const gummies = PRODUCT_FAMILIES.find((f) => f.slug === 'precision-crafted-gummies')!

// Per-variant accent pulled from that variant's own real package color —
// Focus (red/orange berry art), Relax (deep purple night art), Balance
// (green forest/watermelon art). Small, restrained nods, not full
// illustrated backgrounds.
const VARIANT_ACCENT: Record<string, string> = {
  focus: '#e0674a',
  relax: '#8b6fc9',
  balance: '#5fa06a',
}

export function GummiesChapter() {
  return (
    <section
      id="gummies"
      className="relative overflow-hidden scroll-mt-16 md:scroll-mt-18"
      style={{
        backgroundColor: 'var(--color-ink)',
        // Restrained multi-hue wash referencing the three real package
        // palettes (red, purple, green) — a CSS gradient, not illustrated
        // artwork. Kept very low-opacity so the section still reads as
        // dark/GSX first, tri-color second.
        backgroundImage:
          'radial-gradient(ellipse 60% 50% at 15% 10%, rgba(224,103,74,0.16) 0%, rgba(224,103,74,0) 60%),' +
          'radial-gradient(ellipse 60% 60% at 85% 30%, rgba(139,111,201,0.16) 0%, rgba(139,111,201,0) 60%),' +
          'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(95,160,106,0.16) 0%, rgba(95,160,106,0) 60%)',
      }}
    >
      <p
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-2 md:top-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 700,
          fontSize: 'clamp(5.5rem, 18vw, 13rem)',
          color: 'rgba(250,248,243,0.045)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}
      >
        GUMMIES
      </p>

      <div className={`${G} relative`} style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
        <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '0.5rem' }}>02</p>
        <p
          className="font-[family-name:var(--font-space-grotesk)] italic"
          style={{ color: 'rgba(250,248,243,0.7)', fontSize: 'clamp(1.25rem, 2vw, 1.625rem)', fontWeight: 500 }}
        >
          Precision Crafted
        </p>
        <h2
          className="font-[family-name:var(--font-space-grotesk)] font-bold text-[var(--color-cream)]"
          style={{ fontSize: 'clamp(2.75rem, 6vw, 5rem)', lineHeight: '0.98', letterSpacing: '-0.03em', marginTop: '0.25rem' }}
        >
          Gummies
        </h2>
        <div style={{ width: '48px', height: '3px', backgroundColor: 'var(--color-accent)', marginTop: '1.25rem', marginBottom: '1.5rem' }} />
        <p className="font-[family-name:var(--font-manrope)] font-light" style={{ color: 'rgba(250,248,243,0.55)', fontSize: '1.0625rem', lineHeight: '1.68', maxWidth: '58ch' }}>
          {gummies.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-8" style={{ marginTop: '3.5rem' }}>
          {gummies.variants.map((v) => {
            const accent = VARIANT_ACCENT[v.slug] ?? 'var(--color-accent)'
            return (
              <div key={v.slug} className="flex flex-col items-center text-center">
                <div className="w-full max-w-[260px]">
                  <Image src={v.imageUrl!} alt={v.imageAlt!} width={v.imageWidth!} height={v.imageHeight!} sizes="(max-width: 640px) 70vw, 260px" className="w-full h-auto drop-shadow-2xl" />
                </div>
                <p className="font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ color: accent, fontSize: '1.25rem', letterSpacing: '-0.01em', marginTop: '1rem' }}>
                  {v.name}
                </p>
                <p className="text-body-sm" style={{ color: 'rgba(250,248,243,0.6)', marginTop: '0.15rem' }}>{v.flavor}</p>
                <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)', marginTop: '0.5rem' }}>
                  {v.enhancement}
                </p>
                <p className="text-label" style={{ color: accent, marginTop: '0.2rem' }}>
                  {v.ratio}
                </p>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center" style={{ marginTop: '3.5rem' }}>
          <Button href="/find-gsx" variant="secondary" size="lg">Find Precision Crafted Gummies Near You</Button>
        </div>
      </div>
    </section>
  )
}
