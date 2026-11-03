import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { PortalContext } from '@/lib/portal/security'
import { shopCustomer } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

// The signed-in customer's own companies (My Companies, and the company picker
// at checkout). Never anyone else's.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const found = await shopCustomer(ctx)
  if ('response' in found) return found.response

  const rows = await db.portalCompany.findMany({
    where: { userId: found.customer.id },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  })
  const companies = rows.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
    ommaLicense: c.ommaLicense,
    email: c.email,
    phone: c.phone,
  }))

  return ctx.noStore(200, { ok: true, companies })
}
