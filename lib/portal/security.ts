// Shared security helpers for the portal route handlers: server-side sessions,
// CSRF, password hashing, and login rate limiting. Every /api/portal route
// goes through this file rather than reimplementing any of it. It is the
// counterpart of the HostGator build's portal-security.php and has the same
// behavior.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { db } from '@/lib/db'
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_MAX_ATTEMPTS_PER_IP,
  LOGIN_WINDOW_MINUTES,
  SESSION_COOKIE_NAME,
  SESSION_LIFETIME_SECONDS,
} from './config'

// ── Responses ────────────────────────────────────────────────────────────

export type JsonBody = Record<string, unknown>

// ── Sessions and CSRF ────────────────────────────────────────────────────
// The browser holds only a random id in an httpOnly cookie. The session
// itself (CSRF token, signed-in customer or administrator) lives in the
// database, keyed by the SHA-256 of that id, so logging out really ends the
// session and a database leak cannot be replayed as a login.
//
// The frontend is a separate client, not a server-rendered form, so classic
// hidden-input CSRF tokens do not apply. Instead the session holds a random
// token, exposed only through a JSON response (csrf-token), never as a plain
// cookie, so a cross-site page can trigger a request here but can never read
// the response and so can never learn the token to send back. Every
// state-changing endpoint requires it as an X-CSRF-Token header.

export interface SessionRow {
  id: string
  csrfToken: string
  userId: number | null
  adminId: number | null
  adminLastSeen: Date | null
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const newToken = () => randomBytes(32).toString('hex')

export function clientIp(req: NextRequest): string {
  const vercel = req.headers.get('x-vercel-forwarded-for')
  if (vercel) return vercel.split(',')[0].trim()
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

/** One request's view of the visitor's session, plus the response helpers. */
export class PortalContext {
  session: SessionRow | null = null
  private cookieToSet: string | null = null
  private cookieCleared = false

  private constructor(readonly req: NextRequest) {}

  static async open(req: NextRequest): Promise<PortalContext> {
    const ctx = new PortalContext(req)
    const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value
    if (raw && /^[0-9a-f]{64}$/.test(raw)) {
      const row = await db.portalSession.findUnique({ where: { id: sha256(raw) } })
      if (row && row.expiresAt.getTime() > Date.now()) {
        ctx.session = {
          id: row.id,
          csrfToken: row.csrfToken,
          userId: row.userId,
          adminId: row.adminId,
          adminLastSeen: row.adminLastSeen,
        }
      }
    }
    return ctx
  }

  /** Starts a session if the visitor does not have one yet. */
  async ensure(): Promise<SessionRow> {
    if (this.session) return this.session
    const raw = newToken()
    const csrfToken = newToken()
    const now = new Date()
    await db.portalSession.create({
      data: {
        id: sha256(raw),
        csrfToken,
        createdAt: now,
        expiresAt: new Date(now.getTime() + SESSION_LIFETIME_SECONDS * 1000),
      },
    })
    this.session = { id: sha256(raw), csrfToken, userId: null, adminId: null, adminLastSeen: null }
    this.cookieToSet = raw
    return this.session
  }

  async csrfToken(): Promise<string> {
    return (await this.ensure()).csrfToken
  }

  /** Returns a 403 response when the X-CSRF-Token header does not match the session's token. */
  requireCsrf(): NextResponse | null {
    const header = this.req.headers.get('x-csrf-token') ?? ''
    const expected = this.session?.csrfToken ?? ''
    if (header === '' || expected === '' || !safeEqual(header, expected)) {
      return this.json(403, { ok: false, error: 'invalid_csrf_token' })
    }
    return null
  }

  /** Call immediately after a successful login: prevents session fixation. */
  async regenerate(): Promise<SessionRow> {
    const old = this.session
    if (old) await db.portalSession.deleteMany({ where: { id: old.id } })
    const raw = newToken()
    const now = new Date()
    const csrfToken = old?.csrfToken ?? newToken()
    await db.portalSession.create({
      data: {
        id: sha256(raw),
        csrfToken,
        createdAt: now,
        expiresAt: new Date(now.getTime() + SESSION_LIFETIME_SECONDS * 1000),
      },
    })
    this.session = { id: sha256(raw), csrfToken, userId: null, adminId: null, adminLastSeen: null }
    this.cookieToSet = raw
    return this.session
  }

  async setSignedIn(fields: { userId?: number | null; adminId?: number | null; adminLastSeen?: Date | null }) {
    const s = await this.ensure()
    s.userId = fields.userId ?? null
    s.adminId = fields.adminId ?? null
    s.adminLastSeen = fields.adminLastSeen ?? null
    await db.portalSession.update({
      where: { id: s.id },
      data: { userId: s.userId, adminId: s.adminId, adminLastSeen: s.adminLastSeen },
    })
  }

  async touchAdmin(): Promise<void> {
    const s = this.session
    if (!s) return
    s.adminLastSeen = new Date()
    await db.portalSession.update({ where: { id: s.id }, data: { adminLastSeen: s.adminLastSeen } })
  }

  async destroy(): Promise<void> {
    if (this.session) await db.portalSession.deleteMany({ where: { id: this.session.id } })
    this.session = null
    this.cookieCleared = true
  }

  /** JSON response, carrying the session cookie if this request created or changed it. */
  json(status: number, body: JsonBody, extraHeaders: Record<string, string> = {}): NextResponse {
    const res = NextResponse.json(body, { status, headers: extraHeaders })
    const secure = this.req.nextUrl.protocol === 'https:' || this.req.headers.get('x-forwarded-proto') === 'https'
    if (this.cookieToSet) {
      res.cookies.set(SESSION_COOKIE_NAME, this.cookieToSet, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_LIFETIME_SECONDS,
      })
    } else if (this.cookieCleared) {
      res.cookies.set(SESSION_COOKIE_NAME, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 })
    }
    return res
  }

  /** Same as json() but never cached by the browser or any proxy. */
  noStore(status: number, body: JsonBody): NextResponse {
    return this.json(status, body, { 'Cache-Control': 'no-store' })
  }
}

/** The reply to a GET on an endpoint that only accepts POST. */
export function methodNotAllowed(): NextResponse {
  return NextResponse.json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Reads the request body as a JSON object, or null when it is not one. */
export async function readJsonObject(req: NextRequest): Promise<JsonBody | null> {
  try {
    const body: unknown = await req.json()
    return typeof body === 'object' && body !== null ? (body as JsonBody) : null
  } catch {
    return null
  }
}

// ── Passwords ────────────────────────────────────────────────────────────

/** bcrypt, cost 12. Never MD5, never plaintext. */
export function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

let dummyHash: Promise<string> | null = null

/**
 * Checks a password. With no stored hash it still runs a real comparison
 * against a throwaway one, so a login attempt against a nonexistent or
 * unset-password account takes roughly as long as a real one: no timing
 * signal that would reveal which emails have accounts.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    dummyHash ??= hash('gsx-portal-dummy-password', 12)
    await compare(password, await dummyHash)
    return false
  }
  return compare(password, stored)
}

export const sha256Hex = sha256
export const randomToken = newToken

// ── Login rate limiting / lockout ────────────────────────────────────────
// Checked against both the submitted email and the requester's IP: tripping
// either limit blocks further attempts, independent of whether the password
// would have been correct. A low limit per email stops password guessing on
// one account; a higher one per IP stops one machine cycling through many
// emails, yet is high enough that several staff sharing one store connection
// cannot lock each other out by mistyping.

export async function loginRateLimited(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000)
  const [byEmail, byIp] = await Promise.all([
    db.portalLoginAttempt.count({ where: { succeeded: false, email, attemptedAt: { gt: since } } }),
    db.portalLoginAttempt.count({ where: { succeeded: false, ipAddress: ip, attemptedAt: { gt: since } } }),
  ])
  return byEmail >= LOGIN_MAX_ATTEMPTS || byIp >= LOGIN_MAX_ATTEMPTS_PER_IP
}

export async function recordLoginAttempt(email: string, ip: string, succeeded: boolean): Promise<void> {
  await db.portalLoginAttempt.create({ data: { email, ipAddress: ip, succeeded, attemptedAt: new Date() } })
}

/** Opportunistic cleanup, called by the login endpoint so these tables do not grow forever. */
export async function pruneLoginData(): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await db.portalLoginAttempt.deleteMany({ where: { attemptedAt: { lt: weekAgo } } })
  await db.portalSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
