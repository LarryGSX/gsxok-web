import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ADMIN_PASSWORD_MIN } from '@/lib/portal/config'
import { adminAudit, requireAdmin } from '@/lib/portal/admin'
import { PortalContext, hashPassword, methodNotAllowed, readJsonObject, verifyPassword } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

const length = (s: string) => [...s].length

// An administrator changes their own password. This is the one admin endpoint
// that works while a first-sign-in password change is still pending: the
// temporary password is only ever used once.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure
  const auth = await requireAdmin(ctx, true)
  if ('response' in auth) return auth.response
  const { admin } = auth

  const body = await readJsonObject(req)
  if (body === null) return ctx.noStore(400, { ok: false, error: 'invalid_request' })

  const current = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const next = typeof body.newPassword === 'string' ? body.newPassword : ''
  const confirm = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  const errors: string[] = []
  if (current === '') errors.push('currentPassword')
  if (length(next) < ADMIN_PASSWORD_MIN) errors.push('newPassword')
  if (next !== confirm) errors.push('confirmPassword')
  if (next === current && next !== '') errors.push('newPassword')
  if (errors.length > 0) {
    return ctx.noStore(400, { ok: false, error: 'invalid_fields', fields: errors })
  }

  const row = await db.portalAdmin.findUnique({ where: { id: admin.id }, select: { passwordHash: true } })
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    return ctx.noStore(400, { ok: false, error: 'wrong_current_password' })
  }

  await db.portalAdmin.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  })
  await adminAudit(admin.id, 'admin_password_changed', null, null)

  return ctx.noStore(200, { ok: true })
}
