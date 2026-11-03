import Link from 'next/link'
import Image from 'next/image'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { ManufacturingCard } from '@/components/cards/ManufacturingCard'
import { PROCESS_STEPS, OPERATING_PILLARS } from '@/lib/about/content'
import { PRODUCT_FAMILIES } from '@/lib/products/catalog'

export const metadata = {
  title: 'About',
  description: 'GSX develops, manufactures, and packages its edible lineup in Chelsea, Oklahoma. One team and one facility, from formulation through final package.',
}

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

// Same green-to-cream fade used at the top of cream sections on the
// Products page — reused selectively here, only where a dark (or photo)
// section hands off directly into a cream one.
const GREEN_FADE = {
  backgroundImage:
    'linear-gradient(to bottom, rgba(26,122,74,0.32) 0%, rgba(26,122,74,0.12) 20%, rgba(26,122,74,0) 60%, rgba(26,122,74,0) 100%)',
}
const GREEN_FADE_CLASS = 'relative bg-[length:100%_96px] md:bg-[length:100%_160px] bg-no-repeat bg-top'

// Approved Chelsea facility photo — the building's initial build-out
// (framing, steel roof trusses, tools on the slab), not the finished
// production line already shown on the Homepage. Deliberately a different,
// unused asset from the Sanity library so About doesn't repeat Homepage's
// facility photo, and it fits "Built here from the beginning" literally.
const FACILITY_PHOTO_URL = 'https://cdn.sanity.io/images/o7wavkxv/production/228662a9e3b637fb9dd547d26d519e3a2fff2048-1536x1152.jpg'

// Approved manufacturing photo — a tray of finished GSX product being
// pulled from clean stainless packaging equipment. Third pick for this
// slot: 03b7d7ac (too soft, an unusual 1536x710 crop consistent with a
// video-frame source) and 4072508f (sharp, but shows a bare hand directly
// handling equipment beside product — prohibited on this site) were both
// ruled out. This asset has no person in frame at all, so the bare-hand
// rule doesn't apply, and it checked out sharp at every size actually
// rendered (375px, 1024px, 1280px crop widths), not just at full source
// resolution. See the image-selection rules below this file's imports.
const PROCESS_PHOTO_URL = 'https://cdn.sanity.io/images/o7wavkxv/production/8b4daec20b416d47f422574d4295ed4b914a435f-1152x1536.jpg'

// ABOUT-PAGE IMAGE SELECTION RULES (apply to any future photo swap here):
//   - no visible bare hands handling or working immediately around product
//   - prioritize gloved workers when people appear in production imagery
//   - no blurry or visibly low-resolution manufacturing imagery
//   - no stock photography
//   - no AI-generated replacement photography
//   - no reuse of imagery already prominently featured on Homepage if
//     another authentic option exists
//   - verify sharpness at the ACTUAL rendered crop/size, not the source
//     file's native resolution or filename dimensions alone

// Approved Oklahoma-outline / "Respect the Dose" lockup — the same current
// (non-legacy) mark used in the site nav, uploaded as a new Sanity asset.
// The original CDN source (1b4c22a1...) had white flecks and edge halo
// baked into the pixels. This is that same artwork with the defect removed
// pixel-by-pixel by saturation (real green stroke pixels are always highly
// saturated, even where highlighted; the contamination is washed-out/pale,
// so it can be cleared without ever touching real stroke pixels) — no
// redesign, no substitution, shape/proportions/colors unchanged.
const RESPECT_LOGO_URL = 'https://cdn.sanity.io/images/o7wavkxv/production/00ee0021f084edb3e388c52345fe354c06ae45e7-808x448.png'

// Per-variant zoom compensation for the "One operation, multiple product
// lines" showcase row (section 7) — keyed by product variant slug. Only
// needed when a specific pack-shot photo has visibly more backdrop padding
// than its row siblings at the same frame size (see the scale usage below).
const SHOWCASE_SCALE: Record<string, number> = {
  'solid-milk-chocolate-bites': 1.12,
}

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── 1. ABOUT HERO — compact, typographic, dark. No image. ──────
            Scaled close to the Products intro (same padding rhythm) but
            with its own slightly different clamp range and an eyebrow. */}
        <section className="bg-[var(--color-ink)]">
          <div className={G} style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '1rem' }}>
              About GSX
            </p>
            <h1
              className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
              style={{ fontSize: 'clamp(2rem, 3.6vw, 3.125rem)', lineHeight: '1.05', letterSpacing: '-0.03em', maxWidth: '18ch' }}
            >
              Made in Oklahoma, built by GSX
            </h1>
            <p
              className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
              style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1.25rem', maxWidth: '56ch' }}
            >
              GSX develops, manufactures, and packages its edible lineup in Chelsea, Oklahoma. Our products move through one team and one facility, from formulation through final package.
            </p>
          </div>
        </section>

        {/* ── 2. COMPANY STORY — first cream section after the hero. ─────
            Green fade applied here: a genuine dark-to-cream handoff. */}
        <section className={`${GREEN_FADE_CLASS} bg-[var(--color-cream)]`} style={GREEN_FADE}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <div className="lg:grid lg:grid-cols-[54fr_46fr] lg:items-center lg:gap-16">
              <div className="w-full">
                <Image
                  src={FACILITY_PHOTO_URL}
                  alt="The GSX facility during its initial build-out in Chelsea, Oklahoma, showing exposed steel roof trusses and interior framing"
                  width={1536}
                  height={1152}
                  sizes="(max-width: 1024px) 100vw, 54vw"
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-10 lg:mt-0">
                <h2 className="text-h2 text-[var(--color-dark)]">
                  Built here from the beginning
                </h2>
                <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--color-green)', marginTop: '1.1rem', marginBottom: '1.25rem' }} />
                <p className="text-body text-[var(--color-muted)]" style={{ maxWidth: '46ch' }}>
                  GSX is an Oklahoma edible manufacturer based in Chelsea. Rather than separating formulation, manufacturing, and packaging across outside vendors, we built our operation around doing the work ourselves.
                </p>
                <p className="text-body text-[var(--color-muted)]" style={{ maxWidth: '46ch', marginTop: '1rem' }}>
                  That means the same company developing the product is also responsible for making it, packaging it, and putting the GSX name on the final result.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. OPERATING MODEL — dark, one strong statement + 3 plain
            typographic columns (no cards, no icons). ───────────────────── */}
        <section className="bg-[var(--color-dark)]">
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <h2
              className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
              style={{ fontSize: 'clamp(2.125rem, 3.6vw, 3.25rem)', lineHeight: '1.08', letterSpacing: '-0.03em', maxWidth: '20ch' }}
            >
              One facility, one team, one standard
            </h2>
            <p
              className="font-[family-name:var(--font-manrope)] font-light"
              style={{ color: 'rgba(250,248,243,0.55)', fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1.25rem', maxWidth: '52ch' }}
            >
              Keeping the process under one roof gives GSX direct responsibility for how its products move from an idea to a finished package.
            </p>

            <div
              className="grid grid-cols-1 sm:grid-cols-3"
              style={{ gap: '2rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(250,248,243,0.12)' }}
            >
              {OPERATING_PILLARS.map((item) => (
                <div key={item.title}>
                  <p className="text-label" style={{ color: 'var(--color-accent)' }}>{item.title}</p>
                  <p className="text-body-sm" style={{ color: 'rgba(250,248,243,0.55)', marginTop: '0.6rem' }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. MANUFACTURING MOMENT — separate cream section, deliberately
            built to match Company Story's (section 2, "Built here from the
            beginning") proportions almost exactly, just mirrored: same
            grid-cols ratio (54fr image / 46fr text, reversed to put text
            first here), same lg:items-center, same 4.5rem top/bottom
            padding, same lg:gap-16, same mt-10 lg:mt-0 mobile stacking gap.
            The image was previously a tall aspect-square box, which made
            this section's overall height (grid rows size to the tallest
            column under items-center) balloon well past Company Story's,
            reading as oversized and crowding the section below. Now uses
            aspect-[4/3] — the exact ratio Company Story's own image
            renders at (1536/1152) — so the two sections end up almost the
            same height by construction. Source photo is portrait
            (1152x1536), so this crops it into that landscape frame via
            object-cover; object-position Y=40% keeps the equipment
            cabinet, the blue conveyor, and the product tray together in
            frame. Green fade at the top is unchanged from the last round. */}
        <section className={`${GREEN_FADE_CLASS} bg-[var(--color-cream)]`} style={GREEN_FADE}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <div className="lg:grid lg:grid-cols-[46fr_54fr] lg:items-center lg:gap-16">
              <div>
                <h2 className="text-h2 text-[var(--color-dark)]">
                  Made here, from production to package
                </h2>
                <p className="text-body text-[var(--color-muted)]" style={{ marginTop: '1.1rem', maxWidth: '40ch' }}>
                  Inside our Chelsea operation, GSX products move through the equipment and production steps that take them from manufacturing to final package.
                </p>
              </div>
              <div className="relative w-full aspect-[4/3] overflow-hidden mt-10 lg:mt-0">
                <Image
                  src={PROCESS_PHOTO_URL}
                  alt="A tray of finished GSX product on the packaging line's blue conveyor, inside stainless equipment in the Chelsea, Oklahoma facility"
                  fill
                  sizes="(max-width: 1024px) 100vw, 54vw"
                  className="object-cover"
                  style={{ objectPosition: '50% 40%' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. RESPECT THE DOSE — dark philosophy statement, now a
            balanced two-column composition. The small logo that used to
            float above the heading is removed; the same mark returns
            larger on the right, providing the visual balance instead.
            Moved to sit right after Manufacturing (previously came after
            Process): Manufacturing and Process are both cream, and back
            to back they read as one oversized cream chapter with no
            tonal reset. Putting this dark section between them restores
            a clean cream/dark/cream rhythm and gives Manufacturing room
            to stand on its own before Process begins. */}
        <section className="bg-[var(--color-dark)]">
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <div className="lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
              <div>
                <h2
                  className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
                  style={{ fontSize: 'clamp(2.125rem, 3.8vw, 3.25rem)', lineHeight: '1.05', letterSpacing: '-0.03em' }}
                >
                  Respect the Dose
                </h2>
                <p
                  className="font-[family-name:var(--font-manrope)] font-light"
                  style={{ color: 'rgba(250,248,243,0.6)', fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1.25rem', maxWidth: '58ch' }}
                >
                  For GSX, Respect the Dose is more than a line on the package. It is a reminder that an edible should be made deliberately, labeled clearly, and treated like the product it is.
                </p>
                <p
                  className="font-[family-name:var(--font-manrope)] font-light"
                  style={{ color: 'rgba(250,248,243,0.45)', fontSize: '0.9375rem', lineHeight: '1.68', marginTop: '1rem', maxWidth: '58ch' }}
                >
                  That idea runs through how we formulate, manufacture, package, and present the GSX lineup.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end mt-10 lg:mt-0">
                <Image
                  src={RESPECT_LOGO_URL}
                  alt="Oklahoma outline, Respect the Dose, GSX Green Science Extracts"
                  width={808}
                  height={448}
                  className="w-full h-auto"
                  style={{ maxWidth: '360px' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. PROCESS — cream, 4-step horizontal sequence. Carries the
            same shallow green-to-cream fade used elsewhere on cream
            sections that directly follow a dark one (see Company Story,
            section 2, and Product Family Proof, section 7) — now a
            genuine dark-to-cream handoff from Respect the Dose, same as
            those other two, rather than the cream-to-cream separator it
            was standing in for before the section reorder. Confined to
            the top ~96-160px (see GREEN_FADE_CLASS's bg-size) and fully
            faded to transparent before the heading's own text. id="process"
            matches the footer's existing "/about#process" link. ────── */}
        <section id="process" className={`${GREEN_FADE_CLASS} bg-[var(--color-cream)] scroll-mt-16 md:scroll-mt-18`} style={GREEN_FADE}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <h2 className="text-h2 text-[var(--color-dark)]">
              From formulation to final package
            </h2>
            <p className="text-body text-[var(--color-muted)]" style={{ marginTop: '0.75rem', maxWidth: '54ch' }}>
              GSX keeps the core production path connected inside its own operation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ marginTop: '2.5rem', gap: '1.5rem' }}>
              {PROCESS_STEPS.map((step) => (
                <ManufacturingCard
                  key={step.order}
                  order={step.order}
                  title={step.title}
                  description={step.description}
                  tone="light"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. PRODUCT FAMILY PROOF — cream, lightweight proof strip.
            Bridges back into Products. Green fade applied: another genuine
            dark-to-cream handoff. Each family now shows its real pack shot
            (the first/flagship variant's approved product photo, reused
            directly from lib/products/catalog.ts, the same source Products
            page renders from) so the section reads as concrete rather than
            a plain name list. One row of 5 on desktop, wrapping to a 2-3
            column grid on smaller screens. Still not a catalog: no specs,
            per-product CTAs, or SKUs beyond the single representative shot
            and name. Chocolate Bites intentionally shows its second variant
            (Solid Milk Chocolate) rather than the first (Caramel) — every
            other family still uses its first variant as the representative
            shot. ────────────────────────────────────────────────────── */}
        <section className={`${GREEN_FADE_CLASS} bg-[var(--color-cream)]`} style={GREEN_FADE}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <h2 className="text-h2 text-[var(--color-dark)]">
              One operation, multiple product lines
            </h2>
            <p className="text-body text-[var(--color-muted)]" style={{ marginTop: '0.75rem', maxWidth: '62ch' }}>
              Chocolate Bites, Chocolate Bites Singles, Precision Crafted Gummies, Fruit Crunchers, and The Hammer are all part of the GSX lineup produced in Chelsea.
            </p>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
              style={{ gap: '2rem', marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}
            >
              {PRODUCT_FAMILIES.map((family) => {
                const shot = family.slug === 'chocolate-bites' ? family.variants[1] : family.variants[0]
                // The Solid Milk Chocolate Bites source photo has noticeably
                // more empty backdrop around the pouch than its siblings, so
                // at identical frame size the pouch itself reads smaller.
                // Scaling it up compensates so every product reads as the
                // same physical size in this row; overflow-hidden on the
                // frame keeps the slight zoom from bleeding past its box.
                const scale = SHOWCASE_SCALE[shot.slug] ?? 1
                return (
                  <div key={family.slug} className="flex flex-col items-center text-center">
                    <div className="relative w-full overflow-hidden" style={{ maxWidth: '150px', aspectRatio: '1 / 1' }}>
                      <Image
                        src={shot.imageUrl!}
                        alt={shot.imageAlt!}
                        fill
                        sizes="(max-width: 640px) 32vw, 150px"
                        className="object-contain"
                        style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
                      />
                    </div>
                    <p className="text-label text-[var(--color-dark)]" style={{ marginTop: '1rem' }}>
                      {family.name}
                    </p>
                  </div>
                )
              })}
            </div>

            <Button href="/products" variant="primary" size="lg" style={{ marginTop: '2.5rem' }}>
              View Products
            </Button>
          </div>
        </section>

        {/* ── 8. FIND GSX — reused verbatim from Homepage / Products ──── */}
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

        {/* ── 9. RETAILER STRIP — reused verbatim from Homepage / Products ── */}
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
