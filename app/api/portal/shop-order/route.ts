import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { PortalContext, methodNotAllowed, readJsonObject } from '@/lib/portal/security'
import {
  cartLines,
  centsToMoney,
  requirePriceList,
  sendOrderEmails,
  shopCustomer,
  type OrderCompany,
} from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// Places an order from the signed-in customer's saved cart, for one of their
// own companies. Nothing about the order comes from the browser except which
// company: the items come from the saved cart and every price from the
// customer's own price list, recalculated here.
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

  const companyId = Number.isInteger(body.companyId) ? (body.companyId as number) : 0
  if (companyId <= 0) return ctx.json(400, { ok: false, error: 'company_required' })

  // Only one of the customer's own companies.
  const row = await db.portalCompany.findFirst({ where: { id: companyId, userId: customer.id } })
  if (!row) return ctx.json(400, { ok: false, error: 'invalid_company' })
  const company: OrderCompany = {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    license: row.ommaLicense,
    email: row.email,
    phone: row.phone,
  }

  const items = await cartLines(customer, pricing.priceList)
  if (items.length === 0) return ctx.json(400, { ok: false, error: 'empty_cart' })

  let subtotalCents = 0
  for (const it of items) {
    if (!it.inStock) return ctx.json(400, { ok: false, error: 'unavailable', title: it.title })
    subtotalCents += it.lineCents
  }

  // The order, its items, and emptying the cart succeed or fail together.
  const order = await db.$transaction(async (tx) => {
    const created = await tx.portalOrder.create({
      data: {
        userId: customer.id,
        companyId: company.id,
        companyName: company.name,
        shipAddress: company.address,
        shipCity: company.city,
        shipState: company.state,
        shipZip: company.zip,
        license: company.license,
        contactEmail: company.email,
        contactPhone: company.phone,
        subtotal: centsToMoney(subtotalCents),
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            title: it.title,
            image: it.image,
            unitPrice: centsToMoney(it.unitCents),
            qty: it.qty,
            lineTotal: centsToMoney(it.lineCents),
          })),
        },
      },
    })
    await tx.portalCartItem.deleteMany({ where: { userId: customer.id } })
    return created
  })

  // After the order is safely saved. A failed email never undoes an order.
  await sendOrderEmails(order.id, customer, company, items, subtotalCents)

  return ctx.json(200, { ok: true, orderId: order.id, total: centsToMoney(subtotalCents) })
}
