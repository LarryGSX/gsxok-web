import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { REVALIDATION_TAG } from '@/lib/sanity/client'
import { validWebhookAuthorization } from '@/lib/webhook-auth'

/**
 * Sanity on-demand revalidation webhook.
 *
 * Configure in Sanity dashboard:
 *   Webhooks → POST https://your-domain.com/api/revalidate
 *   Header: Authorization: Bearer <SANITY_REVALIDATE_SECRET>
 *
 * On any published change, this clears all Sanity-tagged cache entries
 * so Next.js will fetch fresh content on the next request.
 */
export async function POST(req: NextRequest) {
  if (!validWebhookAuthorization(req.headers.get('authorization'), process.env.SANITY_REVALIDATE_SECRET)) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
  }

  revalidateTag(REVALIDATION_TAG, { expire: 0 })

  return NextResponse.json({ revalidated: true, tag: REVALIDATION_TAG })
}
