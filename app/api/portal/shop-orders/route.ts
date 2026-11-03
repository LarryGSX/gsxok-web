import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { PortalContext } from '@/lib/portal/security'
import { decimalToMoney, shopCustomer, timestampText } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

// My Orders: the signed-in customer's own orders, newest first. Shown even to a
// customer who has no pricing assigned yet, since it is only their own history.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const found = await shopCustomer(ctx)
  if ('response' in found) return found.response

  const orders = await db.portalOrder.findMany({
    where: { userId: found.customer.id },
    orderBy: { id: 'desc' },
    take: 100,
    include: { items: { orderBy: { id: 'asc' } } },
  })

  return ctx.noStore(200, {
    ok: true,
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      companyName: o.companyName,
      total: decimalToMoney(o.subtotal),
      createdAt: timestampText(o.createdAt),
      items: o.items.map((it) => ({
        title: it.title,
        unitPrice: decimalToMoney(it.unitPrice),
        qty: it.qty,
        lineTotal: decimalToMoney(it.lineTotal),
      })),
    })),
  })
}
