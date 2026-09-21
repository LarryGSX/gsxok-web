import { getAllDispensaries } from '@/lib/sanity/queries'
import { googleMapsDirectionsUrl } from '@/lib/geo/directions'
import { RETAILERS } from './catalog'
import type { Retailer, RetailerDataSource } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityDispensary = any

// Only Sanity's "carries" status maps to a locator listing. "intermittent"
// and "out" are excluded entirely rather than shown with a status badge —
// the Find GSX page identifies retailers that carry GSX, and section 10 of
// the build spec prohibits any store-level inventory signal (no "Limited",
// no "Temporarily Out"), so there's no compliant way to surface that
// distinction on this page. Flagged in the completion report for review.
function mapDispensaryToRetailer(doc: SanityDispensary): Retailer | null {
  if (doc.availabilityStatus !== 'carries') return null
  if (typeof doc.coordinates?.lat !== 'number' || typeof doc.coordinates?.lng !== 'number') return null

  return {
    id: doc._id,
    slug: doc.slug?.current ?? doc._id,
    name: doc.name,
    address: doc.address,
    city: doc.city,
    state: doc.state,
    zip: doc.zip,
    lat: doc.coordinates.lat,
    lng: doc.coordinates.lng,
    phone: doc.phone || undefined,
    website: doc.website || undefined,
    directionsUrl: doc.directionsUrl || googleMapsDirectionsUrl(doc.coordinates.lat, doc.coordinates.lng),
    active: true,
  }
}

export async function getRetailers(): Promise<{ retailers: Retailer[]; source: RetailerDataSource }> {
  try {
    const docs = await getAllDispensaries()
    if (Array.isArray(docs) && docs.length > 0) {
      const retailers = docs
        .map(mapDispensaryToRetailer)
        .filter((r: Retailer | null): r is Retailer => r !== null)
      if (retailers.length > 0) {
        return { retailers, source: 'sanity' }
      }
    }
  } catch {
    // Sanity unreachable/misconfigured — fall through below rather than
    // breaking the page.
  }

  // No Sanity documents yet — fall back to the real retailer list parsed
  // from the GSX customer spreadsheet (lib/retailers/catalog.ts). Only if
  // that were ever empty too would this render the truthful "unavailable"
  // empty state instead of mixing in placeholder stores.
  if (RETAILERS.length > 0) {
    return { retailers: RETAILERS, source: 'catalog' }
  }

  return { retailers: [], source: 'unavailable' }
}
