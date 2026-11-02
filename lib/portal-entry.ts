// Server-side configuration only. No database, cookies, API tokens or account
// claims cross this navigation boundary. Disabled until explicitly configured.
export function portalEntry(env: Readonly<Record<string, string | undefined>>) {
  if (env.GSX_ACCOUNT_PORTAL_ENABLED !== 'true') return null
  const origin = env.GSX_ACCOUNT_PORTAL_ORIGIN
  if (!origin) throw new Error('Portal origin is required when enabled.')
  const url = new URL(origin)
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) {
    throw new Error('Portal origin must be an exact HTTPS origin.')
  }
  return url.origin
}
