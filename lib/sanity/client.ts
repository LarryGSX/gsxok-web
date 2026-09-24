// HostGator static build: imports createClient from @sanity/client
// directly instead of next-sanity. next-sanity's package root
// unconditionally re-exports @sanity/next-loader and a visual-editing
// client component — both register Next.js Server Actions as a pure
// side effect of the import, even though nothing in this project calls
// them. Next.js's static export refuses to build at all if any Server
// Action is registered anywhere in the app (see
// https://nextjs.org/docs/app/building-your-application/deploying/static-exports#unsupported-features).
// next-sanity's createClient is @sanity/client's createClient re-exported
// unchanged (verified in next-sanity's own source) — importing it from
// @sanity/client instead is identical behavior, just without pulling in
// next-sanity's Next.js-App-Router integration layer this project never
// uses (no live preview, no visual editing, no draft mode).
import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

export const sanityConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
}

// Main read client — used in Server Components and route handlers.
// Uses CDN in production for fast cached reads; bypasses CDN in dev for freshness.
export const sanityClient = createClient(sanityConfig)

// Image URL builder helper
const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

// Revalidation tag used in on-demand revalidation webhook
export const REVALIDATION_TAG = 'sanity'
