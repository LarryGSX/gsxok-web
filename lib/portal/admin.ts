// Shared helpers for the staff (administrator) endpoints under
// app/api/portal/admin-*. Customers and administrators sign in through the
// same login endpoint, but their accounts are separate: different table,
// different session field, and a customer session can never act as an admin.
// The counterpart of the HostGator build's admin-security.php.

import type { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ADMIN_IDLE_SECONDS } from './config'
import type { PortalContext } from './security'

export interface AdminRow {
  id: number
  email: string
  firstName: string
  mustChangePassword: boolean
}

/**
 * Returns the signed-in admin, or null. Signs the admin out first if they have
 * been idle too long, or if their account was disabled or deleted after they
 * signed in.
 */
export async function currentAdmin(ctx: PortalContext): Promise<AdminRow | null> {
  const s = ctx.session
  if (!s || s.adminId === null) return null

  const lastSeen = s.adminLastSeen?.getTime() ?? 0
  if (lastSeen === 0 || Date.now() - lastSeen > ADMIN_IDLE_SECONDS * 1000) {
    await ctx.setSignedIn({})
    return null
  }

  let admin: AdminRow | null = null
  let status: string | null = null
  try {
    const row = await db.portalAdmin.findUnique({ where: { id: s.adminId } })
    if (row) {
      admin = { id: row.id, email: row.email, firstName: row.firstName, mustChangePassword: row.mustChangePassword }
      status = row.status
    }
  } catch (e) {
    // Admin table not created yet: nobody is an admin, and the customer side
    // of the portal must keep working regardless.
    console.error('[admin-security] admin lookup failed:', e)
  }

  if (!admin || status !== 'active') {
    await ctx.setSignedIn({})
    return null
  }

  await ctx.touchAdmin()
  return admin
}

/**
 * Stops the request with 401 unless an admin is signed in. Pass
 * allowPasswordChangePending = true only for the endpoint an admin needs in
 * order to set their first real password.
 */
export async function requireAdmin(
  ctx: PortalContext,
  allowPasswordChangePending = false,
): Promise<{ admin: AdminRow } | { response: NextResponse }> {
  const admin = await currentAdmin(ctx)
  if (admin === null) {
    return { response: ctx.noStore(401, { ok: false, error: 'not_signed_in' }) }
  }
  if (!allowPasswordChangePending && admin.mustChangePassword) {
    return { response: ctx.noStore(403, { ok: false, error: 'password_change_required' }) }
  }
  return { admin }
}

/** Records an admin action. Never throws: logging must not break the action. */
export async function adminAudit(
  adminId: number,
  action: string,
  targetUserId: number | null,
  detail: string | null,
): Promise<void> {
  try {
    await db.portalAuditLog.create({ data: { adminId, action, targetUserId, detail } })
  } catch (e) {
    console.error('[admin-audit] failed:', e)
  }
}
