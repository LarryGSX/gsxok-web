import type { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  PORTAL_MAIL_FROM,
  PORTAL_MAIL_READY,
  PORTAL_SITE_BASE_URL,
  RESET_TOKEN_LIFETIME_MINUTES,
} from '@/lib/portal/config'
import { PortalContext, methodNotAllowed, randomToken, readJsonObject, sha256Hex } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

// Starts a password reset. The answer is the same whether or not the email has
// an account, so this can never be used to find out who has one. Only the
// SHA-256 of the token is stored; the raw token exists only in the emailed link.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure

  const body = await readJsonObject(req)
  if (body === null) return ctx.json(400, { ok: false, error: 'invalid_request' })

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (email === '' || !z.string().email().safeParse(email).success) {
    return ctx.json(400, { ok: false, error: 'invalid_fields' })
  }

  const user = await db.portalUser.findUnique({ where: { email } })
  const eligible = user !== null && (user.accountStatus === 'active' || user.accountStatus === 'password_reset_required')

  if (eligible) {
    const rawToken = randomToken()
    const now = new Date()
    await db.portalPasswordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(rawToken),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_LIFETIME_MINUTES * 60 * 1000),
        createdAt: now,
      },
    })

    // Off until PORTAL_MAIL_READY=true, the same as the HostGator build.
    if (PORTAL_MAIL_READY) {
      try {
        const base = (PORTAL_SITE_BASE_URL || req.nextUrl.origin).replace(/\/+$/, '')
        const resetLink = `${base}/reset-password?token=${rawToken}`
        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) throw new Error('RESEND_API_KEY is not set')
        await new Resend(apiKey).emails.send({
          from: PORTAL_MAIL_FROM,
          to: email,
          subject: 'Reset your GSX Portal password',
          text:
            'A password reset was requested for this email address.\n\n' +
            `Reset your password: ${resetLink}\n\n` +
            `This link expires in ${RESET_TOKEN_LIFETIME_MINUTES} minutes and can only be used once.\n\n` +
            "If you didn't request this, you can ignore this message.",
        })
      } catch (e) {
        console.error('[forgot-password] email failed:', e)
      }
    }
  }

  return ctx.json(200, {
    ok: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
  })
}
