import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { adminAudit, requireAdmin } from '@/lib/portal/admin'
import { PortalContext, methodNotAllowed, readJsonObject } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// Marks an order Completed. That is the only change an administrator can make
// to an order (no cancel, no reopen), so "completed" is the only accepted value.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure
  const auth = await requireAdmin(ctx)
  if ('response' in auth) return auth.response
  const { admin } = auth

  const body = await readJsonObject(req)
  if (body === null) return ctx.noStore(400, { ok: false, error: 'invalid_request' })

  const orderId = Number.isInteger(body.id) ? (body.id as number) : 0
  const status = typeof body.status === 'string' ? body.status : ''
  if (orderId <= 0 || status !== 'completed') {
    return ctx.noStore(400, { ok: false, error: 'invalid_fields' })
  }

  const order = await db.portalOrder.findUnique({ where: { id: orderId }, select: { status: true } })
  if (!order) return ctx.noStore(404, { ok: false, error: 'not_found' })

  if (order.status !== 'completed') {
    await db.portalOrder.update({ where: { id: orderId }, data: { status: 'completed' } })
    await adminAudit(admin.id, 'order_completed', null, `order ${orderId}`)
  }

  return ctx.noStore(200, { ok: true, status: 'completed' })
}
