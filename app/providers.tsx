'use client'

import { ToastProvider } from '@/components/ui/Toast'

// HostGator static build: no <SessionProvider> here. next-auth (even just
// imported via next-auth/react) registers a Server Action internally,
// which Next.js's static export refuses to build at all — see
// https://nextjs.org/docs/app/building-your-application/deploying/static-exports#unsupported-features.
// That's moot anyway on this branch: there's no /api/auth route for a
// session to come from (see components/layout/Nav.tsx, which no longer
// calls useSession() either), and the portal backend isn't being
// connected yet per this phase's scope.
export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
