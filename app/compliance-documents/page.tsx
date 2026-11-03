import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { COMPLIANCE_DOCUMENTS } from '@/lib/compliance/documents'

export const metadata = {
  title: 'Compliance Documents',
  description: 'View, print, or download the compliance paperwork GSX provides to dispensaries, including the GSX OMMA processor license.',
}

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

// Same green-to-cream fade used on every other public page — reused here
// because the dark hero hands off directly into a cream section.
const GREEN_FADE = {
  backgroundImage:
    'linear-gradient(to bottom, rgba(26,122,74,0.32) 0%, rgba(26,122,74,0.12) 20%, rgba(26,122,74,0) 60%, rgba(26,122,74,0) 100%)',
}
const GREEN_FADE_CLASS = 'relative bg-[length:100%_96px] md:bg-[length:100%_160px] bg-no-repeat bg-top'

const BUTTON_BASE =
  'inline-flex w-full sm:w-auto items-center justify-center gap-2.5 px-8 py-4 font-[family-name:var(--font-space-grotesk)] text-button tracking-[0.1em] uppercase transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] focus-visible:ring-offset-2'
const BUTTON_PRIMARY =
  'bg-[var(--color-green)] text-[var(--color-cream)] border border-[var(--color-green)] hover:bg-[#155f3a] hover:border-[#155f3a]'
const BUTTON_OUTLINE =
  'bg-transparent text-[var(--color-dark)] border border-[var(--color-dark)] hover:bg-[rgba(15,26,20,0.06)]'

function PdfIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-green)]">
      <path d="M6 2.5h8l4.5 4.5v14a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M14 2.5V7h4.5M8.5 13h7M8.5 16.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ComplianceDocumentsPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── 1. HERO — same compact, dark, typographic pattern as every
            other page (About, Find GSX, Contact, Portal). ──────────────── */}
        <section className="bg-[var(--color-ink)]">
          <div className={G} style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
            <p className="text-label" style={{ color: 'rgba(250,248,243,0.5)', marginBottom: '1rem' }}>
              For Dispensaries
            </p>
            <h1
              className="text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] font-semibold"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', lineHeight: '1.05', letterSpacing: '-0.03em' }}
            >
              Compliance Documents
            </h1>
            <p
              className="text-[rgba(250,248,243,0.5)] font-[family-name:var(--font-manrope)] font-light"
              style={{ fontSize: '1.0625rem', lineHeight: '1.68', marginTop: '1rem', maxWidth: '56ch' }}
            >
              The paperwork dispensaries most often ask GSX for. Open, print, or download any document below. No login required.
            </p>
          </div>
        </section>

        {/* ── 2. DOCUMENTS — cream. One card per document; the list itself
            lives in lib/compliance/documents.ts. ──────────────────────── */}
        <section className={`${GREEN_FADE_CLASS} bg-[var(--color-cream)]`} style={GREEN_FADE}>
          <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '5rem' }}>
            <ul className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '1.5rem' }}>
              {COMPLIANCE_DOCUMENTS.map((doc) => (
                <li
                  key={doc.slug}
                  className="flex flex-col bg-[var(--color-white)] border border-[var(--color-border)]"
                  style={{ padding: '2rem' }}
                >
                  <PdfIcon />
                  <h2 className="text-h3 text-[var(--color-dark)]" style={{ marginTop: '1.25rem' }}>
                    {doc.title}
                  </h2>
                  <p className="text-body text-[var(--color-muted)]" style={{ marginTop: '0.75rem', maxWidth: '46ch' }}>
                    {doc.description}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3" style={{ marginTop: 'auto', paddingTop: '1.75rem' }}>
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener"
                      aria-label={`View ${doc.title} (PDF, opens in a new tab)`}
                      className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}
                    >
                      View PDF
                    </a>
                    <a
                      href={doc.file}
                      download
                      aria-label={`Download ${doc.title} (PDF)`}
                      className={`${BUTTON_BASE} ${BUTTON_OUTLINE}`}
                    >
                      Download PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-body-sm text-[var(--color-muted)]" style={{ marginTop: '2rem', maxWidth: '62ch' }}>
              To print a document, open it with View PDF and use your browser&rsquo;s print option.
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
