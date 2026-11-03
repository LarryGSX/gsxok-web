import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { adminAudit, requireAdmin } from '@/lib/portal/admin'
import { PortalContext, methodNotAllowed, readJsonObject } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// Changes which of the two price lists an approved account is charged from
// (Old / Grandfathered or New / Standard). Only those two tiers exist, and a
// pending registration gets its price list during approval instead.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure
  const auth = await requireAdmin(ctx)
  if ('response' in auth) return auth.response
  const { admin } = auth

  const body = await readJsonObject(req)
  if (body === null) return ctx.noStore(400, { ok: false, error: 'invalid_request' })

  const userId = Number.isInteger(body.id) ? (body.id as number) : 0
  const tier = body.pricingTier
  if (userId <= 0 || (tier !== 'old' && tier !== 'new')) {
    return ctx.noStore(400, { ok: false, error: 'invalid_fields' })
  }

  const user = await db.portalUser.findUnique({ where: { id: userId }, include: { pricing: true } })
  if (!user) return ctx.noStore(404, { ok: false, error: 'not_found' })
  if (user.accountStatus === 'pending') {
    return ctx.noStore(400, { ok: false, error: 'not_approved' })
  }

  const oldTier = user.pricing?.tier ?? null
  if (oldTier !== tier) {
    await db.portalCustomerPricing.upsert({
      where: { userId },
      create: { userId, tier, setBy: admin.id },
      update: { tier, setBy: admin.id },
    })
    await adminAudit(admin.id, 'customer_pricing_set', userId, `${oldTier ?? 'none'} -> ${tier}`)
  }

  return ctx.noStore(200, { ok: true, pricingTier: tier })
}
