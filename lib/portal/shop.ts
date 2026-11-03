// Shared helpers for the customer ordering endpoints under
// app/api/portal/shop-*. The counterpart of the HostGator build's shop-lib.php.
//
// Pricing rule (approved): a customer is charged from exactly one of two price
// lists, Old / Grandfathered or New / Standard, as chosen by an administrator
// and stored in PortalCustomerPricing. The tier is read in ONE place,
// priceListForCustomer() below, and never from anything the browser sends. A
// customer with no row has no price list: they see no prices and cannot order.

import type { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import { ORDER_FROM, ORDER_NOTIFY_TO } from './config'
import type { PortalContext } from './security'

export interface ShopCustomer {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  pricingTier: 'old' | 'new' | null
}

export type PriceList = 'grandfathered' | 'standard'

/** The signed-in, active customer, or a 401 response. */
export async function shopCustomer(ctx: PortalContext): Promise<{ customer: ShopCustomer } | { response: NextResponse }> {
  const userId = ctx.session?.userId ?? null
  const notSignedIn = { response: ctx.json(401, { ok: false, error: 'not_signed_in' }) }
  if (userId === null) return notSignedIn

  const user = await db.portalUser.findUnique({ where: { id: userId }, include: { pricing: true } })
  if (!user || user.accountStatus !== 'active') return notSignedIn

  return {
    customer: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      pricingTier: user.pricing?.tier ?? null,
    },
  }
}

/** The one place a customer's price list is decided: only from their stored tier. */
export function priceListForCustomer(customer: ShopCustomer): PriceList | null {
  switch (customer.pricingTier) {
    case 'old':
      return 'grandfathered'
    case 'new':
      return 'standard'
    default:
      return null
  }
}

/** The customer's price list, or a 403 response when no pricing has been assigned yet. */
export function requirePriceList(
  ctx: PortalContext,
  customer: ShopCustomer,
): { priceList: PriceList } | { response: NextResponse } {
  const priceList = priceListForCustomer(customer)
  if (priceList === null) {
    return { response: ctx.json(403, { ok: false, error: 'pricing_not_set' }) }
  }
  return { priceList }
}

// ── Money ────────────────────────────────────────────────────────────────
// Prices are handled as whole cents, so totals can never drift by a fraction.

interface PricedProduct {
  price: { toString(): string }
  legacyPrice: { toString(): string } | null
}

export function unitCents(product: PricedProduct, priceList: PriceList): number {
  const price = priceList === 'grandfathered' && product.legacyPrice !== null ? product.legacyPrice : product.price
  return Math.round(Number(price.toString()) * 100)
}

export function centsToMoney(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function decimalToMoney(value: { toString(): string }): string {
  return Number(value.toString()).toFixed(2)
}

export function imageUrl(file: string): string {
  return '/images/products/' + encodeURIComponent(file)
}

/** MySQL-style timestamp text ("2026-11-02 17:30:00", UTC): the screens read only the date part. */
export function timestampText(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

// ── Cart ─────────────────────────────────────────────────────────────────

export interface CartLine {
  productId: number
  title: string
  image: string
  inStock: boolean
  qty: number
  unitCents: number
  lineCents: number
}

export async function cartLines(customer: ShopCustomer, priceList: PriceList): Promise<CartLine[]> {
  const rows = await db.portalCartItem.findMany({
    where: { userId: customer.id },
    include: { product: true },
    orderBy: [{ createdAt: 'asc' }, { productId: 'asc' }],
  })
  return rows.map((r) => {
    const unit = unitCents(r.product, priceList)
    return {
      productId: r.productId,
      title: r.product.title,
      image: r.product.image,
      inStock: r.product.inStock,
      qty: r.qty,
      unitCents: unit,
      lineCents: unit * r.qty,
    }
  })
}

export async function cartResponse(customer: ShopCustomer, priceList: PriceList) {
  const lines = await cartLines(customer, priceList)
  let total = 0
  const items = lines.map((l) => {
    total += l.lineCents
    return {
      productId: l.productId,
      title: l.title,
      image: imageUrl(l.image),
      inStock: l.inStock,
      qty: l.qty,
      unitPrice: centsToMoney(l.unitCents),
      lineTotal: centsToMoney(l.lineCents),
    }
  })
  return { ok: true, items, total: centsToMoney(total) }
}

// ── Order emails ─────────────────────────────────────────────────────────
// Same two emails the old site sent: the order to GSX, and a confirmation to
// the email of the company the customer chose. Subjects and layout are the
// old site's, as approved. A failure to send never fails the order.

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

const headerLine = (v: string) => v.replace(/[\r\n]+/g, ' ').trim()

export interface OrderCompany {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip: string
  license: string
  email: string
  phone: string
}

function orderItemsHtml(items: CartLine[], subtotalCents: number): string {
  const cell = 'border:1px solid #dddddd;text-align:left;padding:8px;'
  let html =
    '<table style="border-collapse:collapse;width:100%;"><tr>' +
    `<th style="${cell}background:#f2f2f2;">Products</th>` +
    `<th style="${cell}background:#f2f2f2;">Price</th>` +
    `<th style="${cell}background:#f2f2f2;">Qty</th>` +
    `<th style="${cell}background:#f2f2f2;">Total</th>` +
    '</tr>'
  for (const it of items) {
    html +=
      '<tr>' +
      `<td style="${cell}">${escapeHtml(it.title)}</td>` +
      `<td style="${cell}">$${centsToMoney(it.unitCents)}</td>` +
      `<td style="${cell}">${it.qty}&nbsp;x&nbsp;$${centsToMoney(it.unitCents)}</td>` +
      `<td style="${cell}">$${centsToMoney(it.lineCents)}</td>` +
      '</tr>'
  }
  html +=
    `<tr><td colspan="3" style="${cell}font-weight:bold;">Grand Total</td>` +
    `<td style="${cell}font-weight:bold;">$${centsToMoney(subtotalCents)}</td></tr></table>`
  return html
}

export async function sendOrderEmails(
  orderId: number,
  customer: ShopCustomer,
  company: OrderCompany,
  items: CartLine[],
  subtotalCents: number,
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[shop-order] RESEND_API_KEY is not set: order emails were not sent')
      return
    }
    const resend = new Resend(apiKey)

    const companyEmail = headerLine(company.email)
    const validCompanyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)
    const details =
      `<p><b>Company Name:</b> ${escapeHtml(company.name)}<br>` +
      `<b>Address:</b> ${escapeHtml(`${company.address}, ${company.city}, ${company.state} ${company.zip}`)}<br>` +
      `<b>OMMA License Number:</b> ${escapeHtml(company.license)}<br>` +
      `<b>Email:</b> ${escapeHtml(company.email)}<br>` +
      `<b>Phone:</b> ${escapeHtml(company.phone)}</p>`
    const table = orderItemsHtml(items, subtotalCents)

    // To GSX: the order, with the company's email as Reply-To so GSX can answer them.
    const internal = await resend.emails.send({
      from: ORDER_FROM,
      to: ORDER_NOTIFY_TO,
      replyTo: validCompanyEmail ? companyEmail : undefined,
      subject: 'New order details here',
      html:
        `<b><u><i>Order Details</i></u></b> (order #${orderId}, placed by ${escapeHtml(`${customer.firstName} ${customer.lastName}`)})<br><br>` +
        `${table}<br><b><u><i>Company information</i></u></b><br><br>${details}`,
    })
    if (internal.error) console.error('[shop-order] internal email failed:', internal.error)

    // To the selected company's email only.
    if (validCompanyEmail) {
      const confirmation = await resend.emails.send({
        from: ORDER_FROM,
        to: companyEmail,
        replyTo: ORDER_NOTIFY_TO,
        subject: 'Your order confirmation details here',
        html:
          `<b><u><i>Order Details</i></u></b> (order #${orderId})<br><br>` +
          `${table}<br><b><u><i>Company information</i></u></b><br><br>${details}`,
      })
      if (confirmation.error) console.error('[shop-order] confirmation email failed:', confirmation.error)
    }
  } catch (e) {
    console.error('[shop-order] email failed:', e)
  }
}
