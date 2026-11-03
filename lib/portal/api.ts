// Talks to the portal route handlers under app/api/portal/ (same-origin).
// Same request/response contract as the approved HostGator build, so the
// portal, admin, and ordering screens behave identically on both.
//
// Shared by PortalAuth.tsx and the /reset-password page, since both need
// a fresh CSRF token before their POST.

export async function getCsrfToken(): Promise<string> {
  const res = await fetch('/api/portal/csrf-token')
  const data: { ok?: boolean; csrfToken?: string } | null = await res.json().catch(() => null)
  if (!res.ok || !data?.csrfToken) {
    throw new Error('csrf_token_unavailable')
  }
  return data.csrfToken
}

export async function portalPost<T>(path: string, payload: unknown): Promise<{ status: number; data: T | null }> {
  const csrfToken = await getCsrfToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  })
  const data: T | null = await res.json().catch(() => null)
  return { status: res.status, data }
}

export interface SessionCheckResponse {
  role?: 'admin' | 'customer'
  mustChangePassword?: boolean
  ok: boolean
  loggedIn: boolean
  firstName?: string
  email?: string
}

export async function checkSession(): Promise<SessionCheckResponse> {
  const res = await fetch('/api/portal/session-check', { cache: 'no-store' })
  const data: SessionCheckResponse | null = await res.json().catch(() => null)
  if (!res.ok || !data) {
    return { ok: false, loggedIn: false }
  }
  return data
}

export async function portalGet<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(path, { cache: 'no-store' })
  const data: T | null = await res.json().catch(() => null)
  return { status: res.status, data }
}
