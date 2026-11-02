import { createHash, timingSafeEqual } from 'node:crypto'

export function validWebhookAuthorization(header: string | null, secret: string | undefined) {
  if (!secret || !header?.startsWith('Bearer ')) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(header.slice(7)), digest(secret))
}
