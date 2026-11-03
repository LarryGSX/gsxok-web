import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/portal/admin'
import { PortalContext } from '@/lib/portal/security'
import { timestampText } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

// Every customer account, with its approval status and price list, for the
// administrator screen. Pending registrations come first, then newest first.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const auth = await requireAdmin(ctx)
  if ('response' in auth) return auth.response

  // Pending registrations first, then everyone else, each newest first.
  const newestFirst = [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
  const pending = await db.portalUser.findMany({
    where: { accountStatus: 'pending' },
    include: { pricing: true },
    orderBy: newestFirst,
    take: 1000,
  })
  const others = await db.portalUser.findMany({
    where: { accountStatus: { not: 'pending' } },
    include: { pricing: true },
    orderBy: newestFirst,
    take: 1000 - pending.length,
  })
  const rows = [...pending, ...others]

  return ctx.noStore(200, {
    ok: true,
    customers: rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      ommaLicense: r.ommaLicense,
      status: r.accountStatus,
      pricingTier: r.pricing?.tier ?? null,
      createdAt: timestampText(r.createdAt),
    })),
  })
}
