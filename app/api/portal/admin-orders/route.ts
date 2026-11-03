import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/portal/admin'
import { PortalContext } from '@/lib/portal/security'
import { decimalToMoney, timestampText } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

// Every order, newest first, for the administrator's Active / Completed lists.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const auth = await requireAdmin(ctx)
  if ('response' in auth) return auth.response

  const orders = await db.portalOrder.findMany({
    orderBy: { id: 'desc' },
    take: 500,
    include: { user: true, items: { orderBy: { id: 'asc' } } },
  })

  return ctx.noStore(200, {
    ok: true,
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      customerName: `${o.user.firstName} ${o.user.lastName}`.trim(),
      customerEmail: o.user.email,
      companyName: o.companyName,
      address: `${o.shipAddress}, ${o.shipCity}, ${o.shipState} ${o.shipZip}`,
      license: o.license,
      contactEmail: o.contactEmail,
      contactPhone: o.contactPhone,
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
