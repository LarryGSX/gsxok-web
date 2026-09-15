import Link from 'next/link'
import { Container } from '@/components/layout/Container'

const year = new Date().getFullYear()

const footerLinks = {
  Products: [
    { href: '/products', label: 'All Products' },
    { href: '/products#gummies', label: 'Gummies' },
    { href: '/products#chocolates', label: 'Chocolates' },
  ],
  Company: [
    { href: '/about', label: 'About GSX' },
    { href: '/about#process', label: 'Our Process' },
    { href: '/learn', label: 'Education' },
  ],
  Retailers: [
    { href: '/find-gsx', label: 'Find GSX' },
    { href: '/contact', label: 'Carry GSX' },
    { href: '/login', label: 'Portal Login' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-[#0a1410] border-t border-[rgba(250,248,243,0.06)]">
      <Container className="py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 md:gap-10">

          {/* Brand column */}
          <div className="flex flex-col gap-6">
            <span className="text-h4 text-[var(--color-cream)] font-[family-name:var(--font-space-grotesk)] tracking-tight">
              GSX
            </span>
            <p className="text-body-sm text-[rgba(250,248,243,0.45)] leading-relaxed">
              Oklahoma-licensed cannabis manufacturer. Controlled processes. Precision formulation. Consistent product.
            </p>
            <address className="not-italic text-body-sm text-[rgba(250,248,243,0.35)] leading-relaxed">
              Chelsea, OK 74016
              <br />
              <a
                href="mailto:sales@gsxok.com"
                className="hover:text-[var(--color-accent)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
              >
                sales@gsxok.com
              </a>
            </address>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading} className="flex flex-col gap-4">
              <p className="text-label text-[rgba(250,248,243,0.4)]">{heading}</p>
              <ul className="flex flex-col gap-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-body-sm text-[rgba(250,248,243,0.55)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-sm"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[rgba(250,248,243,0.06)] flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <p className="text-caption text-[rgba(250,248,243,0.25)]">
            © {year} Green Science Extracts. Oklahoma OMMA Licensed Manufacturer.
          </p>
          <p className="text-caption text-[rgba(250,248,243,0.2)]">
            Respect the Dose.
          </p>
        </div>
      </Container>
    </footer>
  )
}
