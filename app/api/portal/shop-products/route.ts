import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { PortalContext } from '@/lib/portal/security'
import { centsToMoney, imageUrl, requirePriceList, shopCustomer, unitCents } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

// The product list with the signed-in customer's own prices. The price comes
// only from the customer's stored pricing tier: nothing in the request can
// change it, and only that one price is sent to the browser.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const found = await shopCustomer(ctx)
  if ('response' in found) return found.response
  const pricing = requirePriceList(ctx, found.customer)
  if ('response' in pricing) return pricing.response

  const rows = await db.portalProduct.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  const products = rows.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    image: imageUrl(p.image),
    price: centsToMoney(unitCents(p, pricing.priceList)),
    inStock: p.inStock,
  }))

  return ctx.noStore(200, { ok: true, products })
}
