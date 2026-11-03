import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { currentAdmin } from '@/lib/portal/admin'
import { PortalContext } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

// Tells the Portal page who, if anyone, is signed in, and whether they are an
// administrator or a customer, so it can show the right screen. Administrators
// and customers share one login, so this is what tells them apart.
export async function GET(req: NextRequest) {
  const ctx = await PortalContext.open(req)

  const admin = await currentAdmin(ctx)
  if (admin !== null) {
    return ctx.noStore(200, {
      ok: true,
      loggedIn: true,
      role: 'admin',
      firstName: admin.firstName,
      email: admin.email,
      mustChangePassword: admin.mustChangePassword,
    })
  }

  const userId = ctx.session?.userId ?? null
  if (userId === null) {
    return ctx.noStore(200, { ok: true, loggedIn: false })
  }

  const user = await db.portalUser.findUnique({ where: { id: userId } })
  if (!user || user.accountStatus !== 'active') {
    return ctx.noStore(200, { ok: true, loggedIn: false })
  }

  return ctx.noStore(200, {
    ok: true,
    loggedIn: true,
    role: 'customer',
    firstName: user.firstName,
    email: user.email,
  })
}
