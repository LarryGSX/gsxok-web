import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { QTY_TECHNICAL_MAX } from '@/lib/portal/config'
import { PortalContext, methodNotAllowed, readJsonObject } from '@/lib/portal/security'
import { cartResponse, requirePriceList, shopCustomer } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// Adds to, sets, or removes a line of the signed-in customer's saved cart.
// Only the product id and quantity are read from the request. The cart total
// is always recalculated from the customer's own price list.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure
  const found = await shopCustomer(ctx)
  if ('response' in found) return found.response
  const { customer } = found
  const pricing = requirePriceList(ctx, customer)
  if ('response' in pricing) return pricing.response

  const body = await readJsonObject(req)
  if (body === null) return ctx.json(400, { ok: false, error: 'invalid_request' })

  const action = typeof body.action === 'string' ? body.action : ''
  const productId = Number.isInteger(body.productId) ? (body.productId as number) : 0
  const qty = Number.isInteger(body.qty) ? (body.qty as number) : 0

  if (!['add', 'set', 'remove'].includes(action) || productId <= 0) {
    return ctx.json(400, { ok: false, error: 'invalid_fields' })
  }
  if (action !== 'remove' && (qty < 1 || qty > QTY_TECHNICAL_MAX)) {
    return ctx.json(400, { ok: false, error: 'invalid_quantity' })
  }

  if (action === 'remove') {
    await db.portalCartItem.deleteMany({ where: { userId: customer.id, productId } })
    return ctx.json(200, await cartResponse(customer, pricing.priceList))
  }

  const product = await db.portalProduct.findUnique({ where: { id: productId }, select: { title: true, inStock: true } })
  if (!product) return ctx.json(400, { ok: false, error: 'unknown_product' })
  if (!product.inStock) return ctx.json(400, { ok: false, error: 'unavailable', title: product.title })

  if (action === 'add') {
    // Atomic: adding to a line that already exists raises it, capped at the technical maximum.
    await db.$executeRaw`
      INSERT INTO portal_cart_items (user_id, product_id, qty, created_at, updated_at)
      VALUES (${customer.id}, ${productId}, ${qty}, now(), now())
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET qty = LEAST(portal_cart_items.qty + EXCLUDED.qty, ${QTY_TECHNICAL_MAX}), updated_at = now()`
  } else {
    await db.portalCartItem.upsert({
      where: { userId_productId: { userId: customer.id, productId } },
      create: { userId: customer.id, productId, qty },
      update: { qty },
    })
  }

  return ctx.json(200, await cartResponse(customer, pricing.priceList))
}
