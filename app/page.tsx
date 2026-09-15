import Image from 'next/image'
import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { getSiteSettings, getAllProductFamilies, getAllArticles } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/client'

export const revalidate = 3600

type SanitySettings = Record<string, unknown>
type ProductFamily  = { _id: string; name: string; slug: { current: string } }
type Article        = { _id: string; title: string; slug: { current: string }; summary?: string; category?: { name: string } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImage    = any

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

function Rule({ className = '' }: { className?: string }) {
  return (
    <div className={`${G} ${className}`}>
      <div className="h-px bg-[rgba(250,248,243,0.1)]" />
    </div>
  )
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg width="13" height="9" viewBox="0 0 13 9" fill="none" aria-hidden="true" className={className}>
      <path d="M1 4.5h11M7.5 1l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}

// Verified, already-approved facts only — no invented stats or certifications.
const PROOF_POINTS = [
  { label: 'Chelsea, Oklahoma', detail: 'Manufactured in-house, start to finish' },
  { label: 'Formulation to Final Package', detail: 'Every step handled under one roof' },
  { label: 'Multiple Product Lines', detail: 'Gummies, chocolates, and fruit crunchers' },
]

const PROCESS_MARKERS = ['Ingredient sourcing', 'Written batch procedures', 'Final packaging']

// Approved high-resolution factory image for the "Built in Oklahoma" section
// (production line, American and Oklahoma flags, GSX wall logo). Native
// resolution 1310x1200, rendered at intrinsic aspect ratio, no crop.
const FACILITY_PHOTO_URL = 'https://cdn.sanity.io/images/o7wavkxv/production/488d2b67b8289033440ea79284b9772023b2961c-1310x1200.jpg'

// Approved production-in-progress photo for the "Real equipment, real
// people, real product" section — a cooling-tunnel drawer of freshly molded
// Hammer/Chocolate Bites squares emerging onto the line. Hardcoded rather
// than pulled from the Sanity siteSettings.processImage field (as this
// section used to do): this asset was the strongest authentic match for
// "production in progress" out of every image asset in the Sanity media
// library (reviewed directly via the Content API), but the read token
// available here can't write back a new asset assignment to the CMS
// document, so the choice is hardcoded here instead, same pattern as
// FACILITY_PHOTO_URL above. No people in this shot (unlike the previous
// processImage asset), but no bare hands either — see the completion
// report for the other candidates considered and why this one won.
const PROCESS_PHOTO_URL = 'https://cdn.sanity.io/images/o7wavkxv/production/8b4daec20b416d47f422574d4295ed4b914a435f-1152x1536.jpg'

function FlaskIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 2h6M10 2v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 8.5V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 15h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3.5 8 12 12l8.5-4M12 12v8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

const PROOF_STRIP = [
  { Icon: FlaskIcon, line1: 'Formulated', line2: 'In-House' },
  { Icon: GearIcon,  line1: 'Manufactured', line2: 'In-House' },
  { Icon: BoxIcon,   line1: 'Packaged', line2: 'In-House' },
]

export default async function HomePage() {
  const [settings, productFamilies, articles] = await Promise.allSettled([
    getSiteSettings(),
    getAllProductFamilies(),
    getAllArticles(),
  ])

  const s        = settings.status        === 'fulfilled' ? (settings.value as SanitySettings) : null
  const families = productFamilies.status === 'fulfilled' && Array.isArray(productFamilies.value) ? productFamilies.value as ProductFamily[] : []
  const featured = (articles.status       === 'fulfilled' && Array.isArray(articles.value) ? articles.value as Article[] : []).slice(0, 3)
  void families // reserved for when real productFamily records exist

  const heroImg    : SanityImage = s?.heroImage    ?? null
  const heroSrc    = heroImg    ? urlFor(heroImg).auto('format').fit('max').width(1600).url() : null

  return (
    <>
      <Nav />
      <main className="bg-[#0c0c0b]">

        {/* ── HERO — locked brand/product-universe graphic, 42/58 split ──── */}
        <section aria-label="Hero">
          <div className={`${G} lg:grid lg:grid-cols-[42fr_58fr] lg:items-center lg:gap-10 xl:gap-14`}>
            <div className="flex flex-col justify-center" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
              <div style={{ maxWidth: '460px' }}>
                <h1
                  className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
                  style={{
                    fontSize: 'clamp(2.25rem, 3.4vw, 3.25rem)',
                    lineHeight: '1.05',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Oklahoma&rsquo;s own edible company
                </h1>
                <p
                  className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
                  style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1.25rem', maxWidth: '36ch' }}
                >
                  GSX formulates, manufactures, and packages every product itself, from Chelsea, Oklahoma to dispensary shelves across the state.
                </p>
                <p className="text-label text-[rgba(250,248,243,0.32)]" style={{ marginTop: '1.25rem' }}>
                  OMMA Licensed Manufacturer &nbsp;·&nbsp; Chelsea, Oklahoma
                </p>
                <div className="flex flex-wrap items-center gap-5" style={{ marginTop: '2rem' }}>
                  <Button href="/products" variant="primary" size="lg">View Products</Button>
                  <Link
                    href="/find-gsx"
                    className="text-button text-[rgba(250,248,243,0.4)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
                  >
                    Find GSX →
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-end w-full" style={{ paddingBottom: '2rem' }}>
              {heroSrc ? (
                <Image
                  src={heroSrc}
                  alt={heroImg?.alt ?? 'GSX product lineup: Precision Crafted Gummies, The Hammer, Fruit Crunchers, and Chocolate Bites'}
                  width={1672}
                  height={941}
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="w-full h-auto lg:max-w-[820px]"
                />
              ) : (
                <div className="w-full" style={{ aspectRatio: '16 / 9', background: 'linear-gradient(160deg, #0f1a14 0%, #0c0c0b 100%)' }} />
              )}
            </div>
          </div>
        </section>

        {/* ── COMPANY PROOF STATEMENT — compact editorial 2/3 + proof points ── */}
        <section className="border-t border-[rgba(250,248,243,0.06)]">
          <div className={G} style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
            <div className="lg:flex lg:items-center lg:gap-16">
              <p
                className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)]"
                style={{
                  fontSize: 'clamp(1.25rem, 2vw, 1.625rem)',
                  lineHeight: '1.35',
                  letterSpacing: '-0.015em',
                  fontWeight: 400,
                  maxWidth: '46ch',
                }}
              >
                No contract manufacturing. No outsourced formulation. GSX is the only company behind every product it sells.
              </p>
              <div
                className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 lg:shrink-0 mt-8 lg:mt-0"
                style={{ gap: '1.5rem', maxWidth: '360px', paddingTop: '1.5rem', borderTop: '1px solid rgba(250,248,243,0.1)' }}
              >
                {PROOF_POINTS.map((item) => (
                  <div key={item.label}>
                    <p className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ fontSize: '0.875rem' }}>
                      {item.label}
                    </p>
                    <p className="text-[rgba(250,248,243,0.4)] font-[family-name:var(--font-manrope)]" style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Rule />

        {/* ── BUILT IN OKLAHOMA, MADE BY GSX — real HTML/CSS, full-width ── */}
        <section className="w-full" style={{ backgroundColor: '#050505' }}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '4rem' }}>
            <div className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:items-center">
              <div className="w-full">
                <Image
                  src={FACILITY_PHOTO_URL}
                  alt="GSX production line with American and Oklahoma flags and the GSX Green Science Extracts wall logo in Chelsea, Oklahoma"
                  width={1310}
                  height={1200}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-10 lg:mt-0">
                <h2
                  className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-bold uppercase"
                  style={{ fontSize: 'clamp(2rem, 3.2vw, 2.75rem)', lineHeight: '1.08', letterSpacing: '-0.02em' }}
                >
                  Built in Oklahoma,
                  <br />
                  <span style={{ color: 'var(--color-green)' }}>made by GSX</span>
                </h2>
                <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--color-green)', marginTop: '1.25rem', marginBottom: '1.25rem' }} />
                <p
                  className="font-[family-name:var(--font-manrope)] font-light"
                  style={{ color: 'rgba(250,248,243,0.55)', fontSize: '1rem', lineHeight: '1.7' }}
                >
                  Every GSX product on the shelf started here, built and run by our own team in Chelsea.
                </p>
                <p
                  className="text-label"
                  style={{ color: 'var(--color-green)', marginTop: '1rem' }}
                >
                  One Facility, One Team, One Standard
                </p>
                <Button href="/about" variant="secondary" size="lg" className="inline-flex items-center gap-2" style={{ marginTop: '2rem' }}>
                  Our Story
                  <Arrow />
                </Button>
              </div>
            </div>

            <div
              className="grid grid-cols-3 gap-4 sm:gap-8 mt-10 sm:mt-14 pt-6 sm:pt-8"
              style={{ borderTop: '1px solid rgba(250,248,243,0.1)' }}
            >
              {PROOF_STRIP.map(({ Icon, line1, line2 }) => (
                <div key={line1} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:items-center sm:text-left sm:gap-4">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full w-9 h-9 sm:w-11 sm:h-11"
                    style={{ border: '1px solid var(--color-green)', color: 'var(--color-green)' }}
                  >
                    <Icon />
                  </div>
                  <div>
                    <p className="text-label" style={{ color: 'rgba(250,248,243,0.4)' }}>{line1}</p>
                    <p
                      className="font-[family-name:var(--font-space-grotesk)] font-semibold"
                      style={{ color: 'var(--color-green)', fontSize: '0.9375rem', letterSpacing: '-0.01em', marginTop: '0.15rem' }}
                    >
                      {line2}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Rule />

        {/* ── REAL EQUIPMENT, REAL PEOPLE, REAL PRODUCT — inset editorial photo ── */}
        <section aria-label="Manufacturing" className={G} style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
          <div className="lg:grid lg:grid-cols-[1fr_1.35fr] lg:items-center lg:gap-12">
            <div className="flex flex-col justify-center">
              <h2
                className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
                style={{ fontSize: 'clamp(1.75rem, 2.6vw, 2.5rem)', lineHeight: '1.05', letterSpacing: '-0.028em' }}
              >
                Real equipment, real people, real product
              </h2>
              <p
                className="text-[rgba(250,248,243,0.48)] font-[family-name:var(--font-manrope)] font-light"
                style={{ fontSize: '1rem', lineHeight: '1.7', marginTop: '1.25rem' }}
              >
                Consistency starts with process, not chance. Every batch follows the same written procedures, in the same facility, by the same team. That discipline is what Respect the Dose means to us.
              </p>
              <ul style={{ marginTop: '1.75rem' }} className="flex flex-col gap-2.5">
                {PROCESS_MARKERS.map((step) => (
                  <li key={step} className="flex items-center gap-3 text-[rgba(250,248,243,0.55)] font-[family-name:var(--font-manrope)]" style={{ fontSize: '0.875rem' }}>
                    <span className="inline-block w-1.5 h-1.5 bg-[var(--color-accent)] shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
              <Link
                href="/manufacturing"
                className="inline-flex items-center gap-2 text-label text-[rgba(250,248,243,0.4)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
                style={{ marginTop: '2rem' }}
              >
                Our manufacturing process
                <Arrow />
              </Link>
            </div>
            <div className="relative w-full mt-10 lg:mt-0" style={{ aspectRatio: '4 / 3' }}>
              <Image
                src={PROCESS_PHOTO_URL}
                alt="A cooling-tunnel drawer of freshly molded GSX chocolate squares emerging onto the production line"
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
                style={{ objectPosition: '50% 38%' }}
              />
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <>
            <Rule />
            <div className={G} style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
              <div className="flex items-baseline justify-between gap-4 mb-6">
                <h2 className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold" style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)', letterSpacing: '-0.015em' }}>
                  From the lab
                </h2>
                <Link href="/learn" className="text-label text-[rgba(250,248,243,0.28)] hover:text-[var(--color-cream)] transition-colors duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm">
                  All articles →
                </Link>
              </div>
              {featured.map((a, i) => (
                <Link
                  key={a._id}
                  href={`/learn/${a.slug.current}`}
                  className={`group flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8 py-4 border-b border-[rgba(250,248,243,0.07)] hover:border-[rgba(250,248,243,0.14)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${i === 0 ? 'border-t border-t-[rgba(250,248,243,0.07)]' : ''}`}
                >
                  {a.category && <span className="text-label text-[rgba(250,248,243,0.26)] shrink-0 sm:w-28">{a.category.name}</span>}
                  <span className="text-[rgba(250,248,243,0.56)] font-[family-name:var(--font-space-grotesk)] font-medium group-hover:text-[var(--color-cream)] transition-colors duration-150 flex-1" style={{ fontSize: 'clamp(0.875rem, 1.3vw, 1.125rem)', letterSpacing: '-0.012em' }}>
                    {a.title}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── FIND GSX — compact, functional, no photo ─────────────────── */}
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

        {/* ── RETAILER STRIP — thin 3-part band: label+headline / copy / CTAs ── */}
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
