import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { adminAudit } from '@/lib/portal/admin'
import {
  PortalContext,
  clientIp,
  loginRateLimited,
  methodNotAllowed,
  pruneLoginData,
  readJsonObject,
  recordLoginAttempt,
  verifyPassword,
} from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// One login for administrators and customers. Administrators are checked first
// and land on the administrator screen; everyone else is a customer.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure

  const body = await readJsonObject(req)
  if (body === null) return ctx.json(400, { ok: false, error: 'invalid_request' })

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (email === '' || password === '') {
    return ctx.json(400, { ok: false, error: 'invalid_fields' })
  }

  const ip = clientIp(req)
  if (await loginRateLimited(email, ip)) {
    return ctx.json(429, {
      ok: false,
      error: 'rate_limited',
      message: 'Too many attempts. Please wait a while before trying again.',
    })
  }

  let admin = null
  try {
    admin = await db.portalAdmin.findUnique({ where: { email } })
  } catch (e) {
    // Staff table not created yet: customers must still be able to sign in.
    console.error('[login] admin lookup failed:', e)
  }
  const user = await db.portalUser.findUnique({ where: { email } })

  // Both passwords are always checked, so the response time does not reveal
  // whether the email belongs to an administrator, a customer, or neither.
  const adminPasswordOk = await verifyPassword(password, admin?.passwordHash)
  const customerPasswordOk = await verifyPassword(password, user?.passwordHash)

  if (admin && adminPasswordOk && admin.status === 'active') {
    await recordLoginAttempt(email, ip, true)
    await pruneLoginData()
    await ctx.regenerate()
    await ctx.setSignedIn({ adminId: admin.id, adminLastSeen: new Date() })
    await adminAudit(admin.id, 'admin_login', null, null)
    return ctx.json(200, { ok: true })
  }

  if (user && customerPasswordOk && user.accountStatus === 'active') {
    await recordLoginAttempt(email, ip, true)
    await pruneLoginData()
    await ctx.regenerate()
    await ctx.setSignedIn({ userId: user.id })
    return ctx.json(200, { ok: true })
  }

  // Wrong password, unknown email, pending, suspended, and password-reset-
  // required accounts all get the same answer.
  await recordLoginAttempt(email, ip, false)
  await pruneLoginData()
  return ctx.json(401, {
    ok: false,
    error: 'invalid_credentials',
    message:
      "We couldn't log you in. Check your email and password — if your account is still pending approval, contact GSX.",
  })
}
