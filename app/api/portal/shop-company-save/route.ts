import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { PortalContext, methodNotAllowed, readJsonObject } from '@/lib/portal/security'
import { shopCustomer } from '@/lib/portal/shop'

export const dynamic = 'force-dynamic'

export const GET = methodNotAllowed

const length = (s: string) => [...s].length

// Creates a company, or updates one when an id is sent. A customer can only
// ever change their own companies: the update is scoped to their account, so
// another customer's company id is simply "not found".
export async function POST(req: NextRequest) {
  const ctx = await PortalContext.open(req)
  const csrfFailure = ctx.requireCsrf()
  if (csrfFailure) return csrfFailure
  const found = await shopCustomer(ctx)
  if ('response' in found) return found.response
  const { customer } = found

  const body = await readJsonObject(req)
  if (body === null) return ctx.json(400, { ok: false, error: 'invalid_request' })

  const str = (key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim() : '')
  const id = Number.isInteger(body.id) ? (body.id as number) : 0
  const name = str('name')
  const address = str('address')
  const city = str('city')
  const state = str('state').toUpperCase()
  const zip = str('zip')
  const ommaLicense = str('ommaLicense')
  const email = str('email').toLowerCase()
  const phone = str('phone')

  const errors: string[] = []
  if (name === '' || length(name) > 255) errors.push('name')
  if (address === '' || length(address) > 255) errors.push('address')
  if (city === '' || length(city) > 255) errors.push('city')
  if (length(state) !== 2) errors.push('state')
  if (zip === '' || length(zip) > 10) errors.push('zip')
  if (ommaLicense === '' || length(ommaLicense) > 255) errors.push('ommaLicense')
  if (email === '' || length(email) > 255 || !z.string().email().safeParse(email).success) errors.push('email')
  if (phone === '' || length(phone) > 30) errors.push('phone')
  if (errors.length > 0) {
    return ctx.json(400, { ok: false, error: 'invalid_fields', fields: errors })
  }

  const values = { name, address, city, state, zip, ommaLicense, email, phone }

  if (id > 0) {
    const result = await db.portalCompany.updateMany({ where: { id, userId: customer.id }, data: values })
    if (result.count === 0) return ctx.json(404, { ok: false, error: 'not_found' })
    return ctx.json(200, { ok: true, id })
  }

  const created = await db.portalCompany.create({ data: { ...values, userId: customer.id } })
  return ctx.json(200, { ok: true, id: created.id })
}
