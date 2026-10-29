import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AccountStatus, UserRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Never trust a role retained in an old JWT after suspension or reassignment.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, firstName: true, role: true, accountStatus: true },
  })
  if (!user || user.accountStatus !== AccountStatus.ACTIVE) redirect('/login')

  if (user.role === UserRole.ADMIN) {
    const pending = await db.user.findMany({
      where: { accountStatus: AccountStatus.PENDING, role: UserRole.BUYER },
      select: { id: true, firstName: true, lastName: true, email: true, ommaLicense: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">GSX Administrator</h1>
        <p className="mt-2">Welcome, {user.firstName}. Pending customer applications: {pending.length}{pending.length === 100 ? '+' : ''}</p>
        <div className="mt-8 space-y-4">
          {pending.length === 0 ? <p>No pending applications.</p> : pending.map(p => (
            <article key={p.id} className="rounded border p-4">
              <h2 className="font-semibold">{p.firstName} {p.lastName}</h2>
              <p>{p.email}</p>
              <p>OMMA license: {p.ommaLicense}</p>
              <p>Submitted: {p.createdAt.toLocaleDateString('en-US')}</p>
              <p className="mt-2 text-sm">Approval is disabled until the deployment and audit trail are verified.</p>
            </article>
          ))}
        </div>
      </main>
    )
  }

  const orders = await db.order.findMany({
    where: { userId: user.id },
    select: { id: true, status: true, submittedAt: true, items: { select: { productTitle: true, quantity: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 20,
  })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold">GSX Retailer Portal</h1>
      <p className="mt-2">Welcome, {user.firstName}.</p>
      <p className="mt-4">We're reconnecting the wholesale ordering catalog. Orders cannot be submitted from this page yet.</p>
      <p className="mt-4"><Link className="underline" href="/products">View GSX products</Link></p>
      <h2 className="mt-10 text-xl font-semibold">Recent Orders</h2>
      {orders.length === 0 ? <p className="mt-3">No orders found in the new ordering database.</p> : (
        <ul className="mt-3 space-y-4">{orders.map(order => (
          <li key={order.id} className="rounded border p-4">
            <strong>{order.status}</strong> — {order.submittedAt.toLocaleDateString('en-US')}
            <ul>{order.items.map((item, i) => <li key={i}>{item.quantity} × {item.productTitle}</li>)}</ul>
          </li>
        ))}</ul>
      )}
    </main>
  )
}
