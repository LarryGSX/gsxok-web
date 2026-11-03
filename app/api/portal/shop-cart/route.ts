import type { NextRequest } from 'next/server'
import { PortalContext } from '@/lib/portal/security'
import { cartResponse, requirePriceList, shopCustomer } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

// The signed-in customer's saved cart, priced from their own price list.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const found = await shopCustomer(ctx)
  if ('response' in found) return found.response
  const pricing = requirePriceList(ctx, found.customer)
  if ('response' in pricing) return pricing.response

  return ctx.noStore(200, await cartResponse(found.customer, pricing.priceList))
}
