import { createClient } from 'next-sanity'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

export const sanityConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn:
    process.env.NEXT_PUBLIC_GSX_LOCAL_STAGING === '1'
      ? false
      : process.env.NODE_ENV === 'production',
  ...(process.env.NEXT_PUBLIC_GSX_LOCAL_STAGING === '1'
    ? { apiHost: process.env.NEXT_PUBLIC_GSX_STAGE_API_ORIGIN, useProjectHostname: false }
    : {}),
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
