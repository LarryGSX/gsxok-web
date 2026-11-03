import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { PASSWORD_MIN } from '@/lib/portal/config'
import { PortalContext, hashPassword, methodNotAllowed, readJsonObject, sha256Hex } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

const length = (s: string) => [...s].length

// Sets a new password from a reset link's token. A token works once, expires
// after an hour, and (for a migrated account) also activates it.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure

  const body = await readJsonObject(req)
  if (body === null) return ctx.json(400, { ok: false, error: 'invalid_request' })

  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  const errors: string[] = []
  if (token === '') errors.push('token')
  if (length(password) < PASSWORD_MIN) errors.push('password')
  if (password !== confirmPassword) errors.push('confirmPassword')
  if (errors.length > 0) {
    return ctx.json(400, { ok: false, error: 'invalid_fields', fields: errors })
  }

  const row = await db.portalPasswordResetToken.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: { select: { id: true, accountStatus: true } } },
  })
  const eligible =
    row !== null &&
    row.usedAt === null &&
    row.expiresAt.getTime() > Date.now() &&
    (row.user.accountStatus === 'active' || row.user.accountStatus === 'password_reset_required')
  if (!eligible) {
    return ctx.json(400, { ok: false, error: 'invalid_or_expired_token' })
  }

  const passwordHash = await hashPassword(password)
  await db.$transaction([
    db.portalPasswordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.portalUser.update({
      where: { id: row.user.id },
      data: {
        passwordHash,
        accountStatus: row.user.accountStatus === 'password_reset_required' ? 'active' : row.user.accountStatus,
      },
    }),
  ])

  return ctx.json(200, { ok: true })
}
