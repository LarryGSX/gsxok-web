import type { NextRequest } from 'next/server'
import { PortalContext, methodNotAllowed } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// Ends the session for good: the session row is deleted, not just the cookie.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure

  await ctx.destroy()
  return ctx.json(200, { ok: true })
}
