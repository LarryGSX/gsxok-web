'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { portalGet, portalPost } from '@/lib/portal/api'

// What a customer sees after logging in: the product list, their cart, their
// companies, and their order history. It mirrors the old ordering portal
// (browse, add to cart with a quantity, choose a company, place the order),
// rebuilt on the new login. The cart is saved on the server for the account,
// as the old portal did, so it follows the customer between devices. Prices and
// ownership are decided by the server; this screen never sends a price.

const inputClass =
  'w-full h-11 px-3 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150'

const outlineButtonClass =
  'text-button px-5 h-10 inline-flex items-center justify-center bg-transparent text-[var(--color-dark)] border border-[var(--color-dark)] hover:bg-[var(--color-dark)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] disabled:opacity-40 disabled:pointer-events-none'

const solidButtonClass =
  'text-button px-5 h-10 inline-flex items-center justify-center bg-[var(--color-green)] text-[var(--color-cream)] border border-[var(--color-green)] hover:bg-[#155f3a] hover:border-[#155f3a] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] disabled:opacity-40 disabled:pointer-events-none'

const quietLinkClass =
  'text-body-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] underline-offset-4 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] focus-visible:rounded-sm'

const GENERIC_ERROR = 'Something went wrong. Please try again.'
const MAX_QTY = 100000 // technical bound only, matches the server

interface Product {
  id: number
  title: string
  description: string
  image: string
  price: string
  inStock: boolean
}

interface Company {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip: string
  ommaLicense: string
  email: string
  phone: string
}

interface OrderRow {
  id: number
  status: 'in_progress' | 'completed' | 'cancelled'
  companyName: string
  total: string
  createdAt: string
  items: { title: string; unitPrice: string; qty: number; lineTotal: string }[]
}

interface CartLine {
  productId: number
  title: string
  image: string
  inStock: boolean
  qty: number
  unitPrice: string
  lineTotal: string
}

interface CartResponse {
  ok?: boolean
  error?: string
  title?: string
  items?: CartLine[]
  total?: string
}

type View = 'shop' | 'cart' | 'orders' | 'companies'

const STATUS_LABEL: Record<OrderRow['status'], string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const COMPANY_FIELD_LABELS: Record<string, string> = {
  name: 'Company Name',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP Code',
  ommaLicense: 'OMMA License Number',
  email: 'Email',
  phone: 'Phone',
}


function formatDate(createdAt: string): string {
  const [y, m, d] = createdAt.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return createdAt.slice(0, 10)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function clampQty(raw: string | number): number {
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(MAX_QTY, n))
}

function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="text-body-sm px-4 py-3 border border-[var(--color-border)] bg-white"
      style={{ color: 'var(--color-dark)' }}
    >
      {message}
    </p>
  )
}

function CompanyForm({
  initial,
  onSaved,
  onCancel,
  onSignedOut,
}: {
  initial?: Company
  onSaved: () => void
  onCancel?: () => void
  onSignedOut: () => void
}) {
  const baseId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields: { name: string; label: string; type?: string; value: string; maxLength?: number; span?: boolean }[] = [
    { name: 'name', label: 'Company Name', value: initial?.name ?? '', span: true },
    { name: 'address', label: 'Address', value: initial?.address ?? '', span: true },
    { name: 'city', label: 'City', value: initial?.city ?? '' },
    { name: 'state', label: 'State', value: initial?.state ?? 'OK', maxLength: 2 },
    { name: 'zip', label: 'ZIP Code', value: initial?.zip ?? '', maxLength: 10 },
    { name: 'ommaLicense', label: 'OMMA License Number', value: initial?.ommaLicense ?? '' },
    { name: 'email', label: 'Email', type: 'email', value: initial?.email ?? '' },
    { name: 'phone', label: 'Phone', type: 'tel', value: initial?.phone ?? '' },
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const payload: Record<string, unknown> = {}
    for (const f of fields) payload[f.name] = String(formData.get(f.name) ?? '')
    if (initial) payload.id = initial.id

    try {
      const { status, data } = await portalPost<{ ok?: boolean; error?: string; fields?: string[] }>(
        '/shop-company-save.php',
        payload
      )
      if (status === 401) {
        onSignedOut()
        return
      }
      if (status === 200 && data?.ok) {
        onSaved()
        return
      }
      if (data?.error === 'invalid_fields' && data.fields?.length) {
        setError(`Please check: ${data.fields.map((f) => COMPANY_FIELD_LABELS[f] ?? f).join(', ')}.`)
      } else {
        setError(GENERIC_ERROR)
      }
    } catch {
      setError(GENERIC_ERROR)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ maxWidth: '640px' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.name} className={`flex flex-col gap-1.5 ${f.span ? 'sm:col-span-2' : ''}`}>
            <label htmlFor={`${baseId}-${f.name}`} className="text-label" style={{ color: 'var(--color-muted)' }}>
              {f.label}
            </label>
            <input
              id={`${baseId}-${f.name}`}
              name={f.name}
              type={f.type ?? 'text'}
              required
              defaultValue={f.value}
              maxLength={f.maxLength}
              className={inputClass}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="submit" disabled={busy} className={solidButtonClass}>
          {busy ? 'Saving' : initial ? 'Save Changes' : 'Add Company'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={quietLinkClass}>
            Cancel
          </button>
        )}
      </div>
      <Notice message={error} />
    </form>
  )
}

export function OrderPortal({
  firstName,
  email,
  onSignedOut,
}: {
  firstName?: string
  email?: string
  onSignedOut: () => void
}) {
  const companySelectId = useId()

  const [view, setView] = useState<View>('shop')
  const [products, setProducts] = useState<Product[] | null>(null)
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [cartLines, setCartLines] = useState<CartLine[] | null>(null)
  const [cartTotal, setCartTotal] = useState('0.00')
  const [cartBusy, setCartBusy] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)
  const [addQty, setAddQty] = useState<Record<number, string>>({})
  const [openProduct, setOpenProduct] = useState<number | null>(null)

  const [companyId, setCompanyId] = useState<number | null>(null)
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<{ id: number; total: string } | null>(null)

  const [editingCompany, setEditingCompany] = useState<Company | 'new' | null>(null)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [signOutBusy, setSignOutBusy] = useState(false)

  const applyCart = useCallback((data: CartResponse) => {
    setCartLines(data.items ?? [])
    setCartTotal(data.total ?? '0.00')
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const { status, data } = await portalGet<{ ok?: boolean; products?: Product[] }>('/shop-products.php')
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok && data.products) return setProducts(data.products)
      setLoadError(GENERIC_ERROR)
    } catch {
      setLoadError(GENERIC_ERROR)
    }
  }, [onSignedOut])

  const loadCompanies = useCallback(async () => {
    try {
      const { status, data } = await portalGet<{ ok?: boolean; companies?: Company[] }>('/shop-companies.php')
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok && data.companies) return setCompanies(data.companies)
      setLoadError(GENERIC_ERROR)
    } catch {
      setLoadError(GENERIC_ERROR)
    }
  }, [onSignedOut])

  const loadOrders = useCallback(async () => {
    try {
      const { status, data } = await portalGet<{ ok?: boolean; orders?: OrderRow[] }>('/shop-orders.php')
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok && data.orders) return setOrders(data.orders)
      setLoadError(GENERIC_ERROR)
    } catch {
      setLoadError(GENERIC_ERROR)
    }
  }, [onSignedOut])

  const loadCart = useCallback(async () => {
    try {
      const { status, data } = await portalGet<CartResponse>('/shop-cart.php')
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok) return applyCart(data)
      setLoadError(GENERIC_ERROR)
    } catch {
      setLoadError(GENERIC_ERROR)
    }
  }, [onSignedOut, applyCart])

  useEffect(() => {
    loadProducts()
    loadCompanies()
    loadOrders()
    loadCart()
  }, [loadProducts, loadCompanies, loadOrders, loadCart])

  // Keep a valid company selected for the cart.
  useEffect(() => {
    if (!companies) return
    if (companies.length === 0) setCompanyId(null)
    else if (companyId === null || !companies.some((c) => c.id === companyId)) setCompanyId(companies[0].id)
  }, [companies, companyId])

  // Every cart change is saved on the server, which returns the updated cart.
  async function cartAction(action: 'add' | 'set' | 'remove', productId: number, qty?: number) {
    setCartBusy(true)
    setCartError(null)
    try {
      const { status, data } = await portalPost<CartResponse>('/shop-cart-update.php', { action, productId, qty })
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok) {
        applyCart(data)
        setPlaced(null)
      } else if (data?.error === 'unavailable') {
        setCartError(`"${data.title ?? 'That product'}" is currently not available.`)
        loadProducts()
      } else {
        setCartError(GENERIC_ERROR)
      }
    } catch {
      setCartError(GENERIC_ERROR)
    }
    setCartBusy(false)
  }

  const cartCount = (cartLines ?? []).reduce((n, l) => n + l.qty, 0)
  const inCart = (productId: number) => (cartLines ?? []).find((l) => l.productId === productId)?.qty ?? 0
  const selectedCompany = companies?.find((c) => c.id === companyId) ?? null

  async function addToCart(product: Product) {
    const qty = clampQty(addQty[product.id] ?? '1')
    setAddQty((q) => ({ ...q, [product.id]: '1' }))
    await cartAction('add', product.id, qty)
  }

  async function handlePlaceOrder() {
    if (!selectedCompany || !cartLines || cartLines.length === 0) return
    setPlacing(true)
    setOrderError(null)
    try {
      const { status, data } = await portalPost<{
        ok?: boolean
        error?: string
        orderId?: number
        total?: string
        title?: string
      }>('/shop-order.php', { companyId: selectedCompany.id })
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok && data.orderId !== undefined) {
        setPlaced({ id: data.orderId, total: data.total ?? '' })
        setCartLines([])
        setCartTotal('0.00')
        loadOrders()
        setPlacing(false)
        return
      }
      if (data?.error === 'unavailable') {
        setOrderError(`"${data.title ?? 'A product'}" is no longer available. Please remove it and try again.`)
        loadProducts()
        loadCart()
      } else if (data?.error === 'empty_cart') {
        setOrderError('Your cart is empty.')
        loadCart()
      } else {
        setOrderError(GENERIC_ERROR)
      }
    } catch {
      setOrderError(GENERIC_ERROR)
    }
    setPlacing(false)
  }

  async function handleDeleteCompany(company: Company) {
    if (!window.confirm(`Remove ${company.name}? Past orders keep their details.`)) return
    setCompanyError(null)
    try {
      const { status, data } = await portalPost<{ ok?: boolean }>('/shop-company-delete.php', { id: company.id })
      if (status === 401) return onSignedOut()
      if (status === 200 && data?.ok) return loadCompanies()
      setCompanyError(GENERIC_ERROR)
    } catch {
      setCompanyError(GENERIC_ERROR)
    }
  }

  async function handleSignOut() {
    setSignOutBusy(true)
    try {
      await portalPost('/logout.php', {})
    } catch {
      // Treat as signed out locally either way.
    }
    onSignedOut()
  }

  const navButton = (key: View, label: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={view === key}
      onClick={() => {
        setView(key)
        if (key === 'cart') setPlaced(null)
      }}
      className={`text-button px-4 h-10 inline-flex items-center border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] ${
        view === key
          ? 'bg-[var(--color-dark)] text-[var(--color-cream)] border-[var(--color-dark)]'
          : 'bg-transparent text-[var(--color-dark)] border-[var(--color-border)] hover:border-[var(--color-dark)]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-body" style={{ color: 'var(--color-dark)' }}>
            {firstName ? `Welcome back, ${firstName}.` : 'You are logged in.'}
          </p>
          {email && (
            <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
              {email}
            </p>
          )}
        </div>
        <button type="button" onClick={handleSignOut} disabled={signOutBusy} className={outlineButtonClass}>
          {signOutBusy ? 'Logging Out' : 'Log Out'}
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Sections">
        {navButton('shop', 'Products')}
        {navButton('cart', `Cart (${cartCount})`)}
        {navButton('orders', 'My Orders')}
        {navButton('companies', 'My Companies')}
      </div>

      {loadError && (
        <div className="mt-6">
          <Notice message={loadError} />
        </div>
      )}

      {/* ── Products ─────────────────────────────────────────────── */}
      {view === 'shop' && (
        <div className="mt-8">
          {products === null ? (
            <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
              Loading products&hellip;
            </p>
          ) : products.length === 0 ? (
            <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
              No products are available right now.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <li key={p.id} className="bg-white border border-[var(--color-border)] flex flex-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    className="w-full object-contain bg-white"
                    style={{ height: '200px', padding: '12px' }}
                  />
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <h3 className="text-h4 text-[var(--color-dark)]">{p.title}</h3>
                    <p className="text-body" style={{ color: 'var(--color-dark)', fontWeight: 600 }}>
                      ${p.price}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenProduct(openProduct === p.id ? null : p.id)}
                        className={quietLinkClass}
                        aria-expanded={openProduct === p.id}
                      >
                        {openProduct === p.id ? 'Hide details' : 'Details'}
                      </button>
                      {openProduct === p.id && (
                        <p className="text-body-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                          {p.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto pt-2">
                      {p.inStock ? (
                        <div className="flex items-end gap-3">
                          <div className="flex flex-col gap-1.5" style={{ width: '88px' }}>
                            <label
                              htmlFor={`qty-${p.id}`}
                              className="text-label"
                              style={{ color: 'var(--color-muted)' }}
                            >
                              Qty
                            </label>
                            <input
                              id={`qty-${p.id}`}
                              type="number"
                              min={1}
                              max={MAX_QTY}
                              inputMode="numeric"
                              value={addQty[p.id] ?? '1'}
                              onChange={(e) => setAddQty((q) => ({ ...q, [p.id]: e.target.value }))}
                              className={inputClass}
                            />
                          </div>
                          <button type="button" disabled={cartBusy} onClick={() => addToCart(p)} className={solidButtonClass}>
                            Add to Cart
                          </button>
                        </div>
                      ) : (
                        <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                          Currently not available.
                        </p>
                      )}
                      {inCart(p.id) > 0 ? (
                        <p className="text-body-sm mt-2" style={{ color: 'var(--color-green)' }}>
                          {inCart(p.id)} in your cart
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Cart ─────────────────────────────────────────────────── */}
      {view === 'cart' && (
        <div className="mt-8" style={{ maxWidth: '860px' }}>
          {placed ? (
            <div className="bg-white border border-[var(--color-border)] p-6 flex flex-col gap-3" role="status">
              <h2 className="text-h4 text-[var(--color-dark)]">Thank you. Your order has been placed.</h2>
              <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                Order #{placed.id}
                {placed.total ? ` · Total $${placed.total}` : ''}. A confirmation has been emailed to the company
                email, and GSX has been notified.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button type="button" onClick={() => setView('orders')} className={solidButtonClass}>
                  View My Orders
                </button>
                <button type="button" onClick={() => setView('shop')} className={outlineButtonClass}>
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : cartLines === null ? (
            <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
              Loading your cart&hellip;
            </p>
          ) : cartLines.length === 0 ? (
            <div>
              <p className="text-body" style={{ color: 'var(--color-dark)' }}>
                Your cart is empty.
              </p>
              <button type="button" onClick={() => setView('shop')} className={`${outlineButtonClass} mt-4`}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <ul className="flex flex-col gap-3">
                {cartLines.map((line) => (
                  <li
                    key={line.productId}
                    className="bg-white border border-[var(--color-border)] p-4 flex flex-wrap items-center gap-x-5 gap-y-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={line.image} alt="" className="object-contain" style={{ width: '64px', height: '64px' }} />
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-body-sm" style={{ color: 'var(--color-dark)', fontWeight: 600 }}>
                        {line.title}
                      </p>
                      <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                        ${line.unitPrice} each
                        {!line.inStock && ' · currently not available'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5" style={{ width: '88px' }}>
                      <label
                        htmlFor={`cart-qty-${line.productId}`}
                        className="text-label"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        Qty
                      </label>
                      <input
                        id={`cart-qty-${line.productId}`}
                        key={`${line.productId}-${line.qty}`}
                        type="number"
                        min={1}
                        max={MAX_QTY}
                        inputMode="numeric"
                        defaultValue={line.qty}
                        disabled={cartBusy}
                        onBlur={(e) => {
                          const next = clampQty(e.target.value)
                          if (next !== line.qty) cartAction('set', line.productId, next)
                          else e.target.value = String(line.qty)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        className={inputClass}
                      />
                    </div>
                    <p className="text-body" style={{ color: 'var(--color-dark)', minWidth: '84px', textAlign: 'right' }}>
                      ${line.lineTotal}
                    </p>
                    <button
                      type="button"
                      disabled={cartBusy}
                      onClick={() => cartAction('remove', line.productId)}
                      className={quietLinkClass}
                    >
                      Remove
                    </button>
                  </li>
                ))}
                <li className="flex justify-end pt-2">
                  <p className="text-h4 text-[var(--color-dark)]">Grand total: ${cartTotal}</p>
                </li>
              </ul>

              <Notice message={cartError} />

              <div className="bg-white border border-[var(--color-border)] p-5 flex flex-col gap-4">
                <h2 className="text-h4 text-[var(--color-dark)]">Who is this order for?</h2>
                {companies === null ? (
                  <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                    Loading&hellip;
                  </p>
                ) : companies.length === 0 ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                      Add the company you are ordering for to confirm your order.
                    </p>
                    <CompanyForm onSaved={loadCompanies} onSignedOut={onSignedOut} />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5" style={{ maxWidth: '420px' }}>
                      <label htmlFor={companySelectId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                        Choose your company for this order
                      </label>
                      <select
                        id={companySelectId}
                        value={companyId ?? ''}
                        onChange={(e) => setCompanyId(Number(e.target.value))}
                        className={inputClass}
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedCompany && (
                      <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                        {selectedCompany.address}, {selectedCompany.city}, {selectedCompany.state} {selectedCompany.zip}
                        <br />
                        OMMA license {selectedCompany.ommaLicense} · {selectedCompany.email} · {selectedCompany.phone}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        disabled={placing || cartBusy || !selectedCompany}
                        onClick={handlePlaceOrder}
                      >
                        {placing ? 'Placing Order' : 'Place Order'}
                      </Button>
                      <button type="button" onClick={() => setView('companies')} className={quietLinkClass}>
                        Manage companies
                      </button>
                    </div>
                  </>
                )}
                <Notice message={orderError} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── My orders ────────────────────────────────────────────── */}
      {view === 'orders' && (
        <div className="mt-8" style={{ maxWidth: '860px' }}>
          {orders === null ? (
            <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
              Loading orders&hellip;
            </p>
          ) : orders.length === 0 ? (
            <p className="text-body" style={{ color: 'var(--color-dark)' }}>
              You haven&rsquo;t placed any orders yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.map((o) => (
                <li key={o.id} className="bg-white border border-[var(--color-border)]">
                  <details>
                    <summary className="p-4 cursor-pointer flex flex-wrap items-center gap-x-5 gap-y-1">
                      <span className="text-body" style={{ color: 'var(--color-dark)', fontWeight: 600 }}>
                        Order #{o.id}
                      </span>
                      <span className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                        {formatDate(o.createdAt)} · {o.companyName}
                      </span>
                      <span
                        className="text-label px-2 py-0.5 border border-[var(--color-border)]"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                      <span className="text-body ml-auto" style={{ color: 'var(--color-dark)' }}>
                        ${o.total}
                      </span>
                    </summary>
                    <div className="px-4 pb-4 overflow-x-auto">
                      <table className="w-full text-body-sm" style={{ color: 'var(--color-dark)', minWidth: '420px' }}>
                        <thead>
                          <tr style={{ color: 'var(--color-muted)', textAlign: 'left' }}>
                            <th className="py-1 pr-3 font-normal">Product</th>
                            <th className="py-1 pr-3 font-normal">Price</th>
                            <th className="py-1 pr-3 font-normal">Qty</th>
                            <th className="py-1 font-normal" style={{ textAlign: 'right' }}>
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.items.map((it, i) => (
                            <tr key={i}>
                              <td className="py-1 pr-3">{it.title}</td>
                              <td className="py-1 pr-3">${it.unitPrice}</td>
                              <td className="py-1 pr-3">{it.qty}</td>
                              <td className="py-1" style={{ textAlign: 'right' }}>
                                ${it.lineTotal}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── My companies ─────────────────────────────────────────── */}
      {view === 'companies' && (
        <div className="mt-8" style={{ maxWidth: '860px' }}>
          {editingCompany ? (
            <div className="bg-white border border-[var(--color-border)] p-5">
              <h2 className="text-h4 text-[var(--color-dark)] mb-4">
                {editingCompany === 'new' ? 'Add a company' : 'Edit company'}
              </h2>
              <CompanyForm
                initial={editingCompany === 'new' ? undefined : editingCompany}
                onSaved={() => {
                  setEditingCompany(null)
                  loadCompanies()
                }}
                onCancel={() => setEditingCompany(null)}
                onSignedOut={onSignedOut}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <button type="button" onClick={() => setEditingCompany('new')} className={solidButtonClass}>
                  Add a Company
                </button>
              </div>
              <Notice message={companyError} />
              {companies === null ? (
                <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                  Loading&hellip;
                </p>
              ) : companies.length === 0 ? (
                <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                  You haven&rsquo;t added a company yet. You&rsquo;ll need at least one to place an order.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {companies.map((c) => (
                    <li
                      key={c.id}
                      className="bg-white border border-[var(--color-border)] p-4 flex flex-wrap items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-body" style={{ color: 'var(--color-dark)', fontWeight: 600 }}>
                          {c.name}
                        </p>
                        <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                          {c.address}, {c.city}, {c.state} {c.zip}
                        </p>
                        <p className="text-body-sm" style={{ color: 'var(--color-muted)' }}>
                          OMMA license {c.ommaLicense} · {c.email} · {c.phone}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button type="button" onClick={() => setEditingCompany(c)} className={quietLinkClass}>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDeleteCompany(c)} className={quietLinkClass}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
