import type { NextRequest } from 'next/server'
import { PortalContext } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

// Hands the frontend a fresh CSRF token (and starts the visitor's session if
// they do not have one). The token comes back only as JSON, never a cookie.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfToken = await ctx.csrfToken()
  return ctx.json(200, { ok: true, csrfToken })
}
