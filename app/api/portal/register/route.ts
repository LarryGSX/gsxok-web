import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  ADDRESS_MAX,
  CITY_MAX,
  EMAIL_MAX,
  LICENSE_MAX,
  NAME_MAX,
  NEW_ACCOUNTS_REQUIRE_APPROVAL,
  PASSWORD_MIN,
  PHONE_MAX,
  STATE_LEN,
  ZIP_MAX,
} from '@/lib/portal/config'
import { PortalContext, hashPassword, methodNotAllowed, readJsonObject } from '@/lib/portal/security'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

const length = (s: string) => [...s].length
const validEmail = (s: string) => z.string().email().safeParse(s).success

// Creates a customer account. It starts as "pending" until an administrator
// approves it (and chooses its price list); until then it cannot sign in.
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure

  const body = await readJsonObject(req)
  if (body === null) return ctx.json(400, { ok: false, error: 'invalid_request' })

  const str = (key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim() : '')

  // Honeypot: a hidden field real visitors never fill in. A bot that did gets a
  // normal-looking success and nothing is saved.
  if (str('gsxHpToken') !== '') {
    return ctx.json(200, { ok: true, status: 'pending' })
  }

  const firstName = str('firstName')
  const lastName = str('lastName')
  const address = str('address')
  const city = str('city')
  const state = str('state').toUpperCase()
  const zip = str('zip')
  const ommaLicense = str('ommaLicense')
  const email = str('email').toLowerCase()
  const phone = str('phone')
  const password = str('password')
  const confirmPassword = str('confirmPassword')

  const errors: string[] = []
  if (firstName === '' || length(firstName) > NAME_MAX) errors.push('firstName')
  if (lastName === '' || length(lastName) > NAME_MAX) errors.push('lastName')
  if (address === '' || length(address) > ADDRESS_MAX) errors.push('address')
  if (city === '' || length(city) > CITY_MAX) errors.push('city')
  if (length(state) !== STATE_LEN) errors.push('state')
  if (zip === '' || length(zip) > ZIP_MAX) errors.push('zip')
  if (ommaLicense === '' || length(ommaLicense) > LICENSE_MAX) errors.push('ommaLicense')
  if (email === '' || length(email) > EMAIL_MAX || !validEmail(email)) errors.push('email')
  if (phone === '' || length(phone) > PHONE_MAX) errors.push('phone')
  if (length(password) < PASSWORD_MIN) errors.push('password')
  if (password !== confirmPassword) errors.push('confirmPassword')
  if (errors.length > 0) {
    return ctx.json(400, { ok: false, error: 'invalid_fields', fields: errors })
  }

  if (await db.portalUser.findUnique({ where: { email }, select: { id: true } })) {
    return ctx.json(409, { ok: false, error: 'email_taken' })
  }

  const status = NEW_ACCOUNTS_REQUIRE_APPROVAL ? 'pending' : 'active'
  try {
    await db.portalUser.create({
      data: {
        firstName,
        lastName,
        address,
        city,
        state,
        zip,
        ommaLicense,
        email,
        phone,
        passwordHash: await hashPassword(password),
        accountStatus: status,
      },
    })
  } catch (e) {
    // Two sign-ups racing for the same email: the database's unique rule decides.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return ctx.json(409, { ok: false, error: 'email_taken' })
    }
    throw e
  }

  return ctx.json(200, { ok: true, status })
}
