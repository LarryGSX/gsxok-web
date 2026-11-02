import type { Metadata } from 'next'
import { portalEntry } from '@/lib/portal-entry'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Business account',
  robots: { index: false, follow: false },
}

export default function AccountEntry() {
  const origin = portalEntry(process.env)
  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-6 py-24 text-[var(--color-ink)]">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs tracking-[0.2em] uppercase">GSX / Business accounts</p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight">Your GSX account</h1>
        <p className="mt-6 text-lg">Manage your business profile, team, license documents and account security.</p>
        {origin ? (
          <a href={origin} rel="noreferrer" className="mt-8 inline-block bg-[var(--color-green)] px-6 py-4 text-white focus-visible:outline-2 focus-visible:outline-offset-4">
            Continue to account services
          </a>
        ) : (
          <p className="mt-8 border-l-4 border-[var(--color-green)] pl-4">Account services are being prepared. Contact GSX for help with your account.</p>
        )}
        <p className="mt-8"><a href="mailto:sales@gsxok.com" className="underline">sales@gsxok.com</a></p>
      </div>
    </main>
  )
}
