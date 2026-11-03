import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { PortalContext, methodNotAllowed, readJsonObject } from '@/lib/portal/security'
import { shopCustomer } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// Removes one of the signed-in customer's own companies. Orders already placed
// keep their own copy of the company details, so history is unaffected.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure
  const found = await shopCustomer(ctx)
  if ('response' in found) return found.response

  const body = await readJsonObject(req)
  if (body === null) return ctx.json(400, { ok: false, error: 'invalid_request' })

  const id = Number.isInteger(body.id) ? (body.id as number) : 0
  if (id <= 0) return ctx.json(400, { ok: false, error: 'invalid_fields' })

  await db.portalCompany.deleteMany({ where: { id, userId: found.customer.id } })
  return ctx.json(200, { ok: true })
}
