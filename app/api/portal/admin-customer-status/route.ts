import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { adminAudit, requireAdmin } from '@/lib/portal/admin'
import { PortalContext, methodNotAllowed, readJsonObject } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

const TIERS = ['old', 'new'] as const
type Tier = (typeof TIERS)[number]
const STATUSES = ['pending', 'active', 'suspended'] as const
type Status = (typeof STATUSES)[number]

// Approves, rejects (suspends, keeping the record), suspends, or reactivates a
// customer account. Making an account active (approving, or reactivating) always
// needs a price list: sent in this request, or already stored for the account.
// The price list is saved in the same step as the status, so an account can
// never be active without pricing.
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
  const newStatus = typeof body.status === 'string' ? body.status : ''
  const pricingTier: unknown = body.pricingTier ?? null
  if (
    userId <= 0 ||
    !(STATUSES as readonly string[]).includes(newStatus) ||
    (pricingTier !== null && !(TIERS as readonly unknown[]).includes(pricingTier))
  ) {
    return ctx.noStore(400, { ok: false, error: 'invalid_fields' })
  }
  const status = newStatus as Status
  const tier = pricingTier as Tier | null

  const user = await db.portalUser.findUnique({ where: { id: userId }, include: { pricing: true } })
  if (!user) return ctx.noStore(404, { ok: false, error: 'not_found' })

  const oldStatus = user.accountStatus
  // A migrated account that has not set its new password yet cannot be moved.
  if (oldStatus === 'password_reset_required') {
    return ctx.noStore(400, { ok: false, error: 'awaiting_password_reset' })
  }
  if (status === 'active' && !user.passwordHash) {
    return ctx.noStore(400, { ok: false, error: 'no_password_set' })
  }

  if (oldStatus !== status) {
    const storedTier = user.pricing?.tier ?? null
    if (status === 'active' && tier === null && storedTier === null) {
      return ctx.noStore(400, { ok: false, error: 'pricing_required' })
    }

    await db.$transaction(async (tx) => {
      if (status === 'active' && tier !== null) {
        await tx.portalCustomerPricing.upsert({
          where: { userId },
          create: { userId, tier, setBy: admin.id },
          update: { tier, setBy: admin.id },
        })
      }
      await tx.portalUser.update({ where: { id: userId }, data: { accountStatus: status } })
    })

    await adminAudit(admin.id, 'customer_status_changed', userId, `${oldStatus} -> ${status}`)
    if (status === 'active' && tier !== null && tier !== storedTier) {
      await adminAudit(admin.id, 'customer_pricing_set', userId, `${storedTier ?? 'none'} -> ${tier}`)
    }
  }

  const current = await db.portalCustomerPricing.findUnique({ where: { userId } })
  return ctx.noStore(200, { ok: true, status, pricingTier: current?.tier ?? null })
}
