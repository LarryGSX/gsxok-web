// HostGator static build: talks to the portal-*.php endpoints deployed at
// the site root (same pattern as ContactForm.tsx posting to /contact.php)
// instead of any Vercel/NextAuth route, which doesn't exist in this build.
//
// Shared by PortalAuth.tsx and the /reset-password page, since both need
// a fresh CSRF token before their POST.

export async function getCsrfToken(): Promise<string> {
  const res = await fetch('/csrf-token.php')
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
  ok: boolean
  loggedIn: boolean
  firstName?: string
  email?: string
}

export async function checkSession(): Promise<SessionCheckResponse> {
  const res = await fetch('/session-check.php', { cache: 'no-store' })
  const data: SessionCheckResponse | null = await res.json().catch(() => null)
  if (!res.ok || !data) {
    return { ok: false, loggedIn: false }
  }
  return data
}
