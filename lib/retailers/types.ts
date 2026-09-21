// Normalized retailer shape for the Find GSX locator.
//
// This is intentionally decoupled from Sanity's `dispensary` document shape
// (sanity/schemas/dispensary.ts) so the locator UI (map, result list, search)
// never depends on CMS field names directly. Swapping the data source later
// (real Sanity documents replacing lib/retailers/catalog.ts's dev data) means
// updating the mapper in lib/retailers/getRetailers.ts only — no UI changes.
//
// Deliberately excludes anything that would read as a store-level inventory
// signal (e.g. Sanity's `availabilityStatus` or `featuredProducts` fields) —
// the Find GSX page identifies retailers that carry GSX, it does not claim
// per-store or per-SKU stock. See lib/retailers/getRetailers.ts for how
// `availabilityStatus` is used to filter, not to display.

export interface Retailer {
  id: string
  slug: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  phone?: string
  website?: string
  /** Pre-built directions link (e.g. authored in Sanity). Falls back to a
   *  generated Google Maps destination link from lat/lng when absent. */
  directionsUrl?: string
  /** Whether this retailer should currently appear in the locator. */
  active: boolean
  /** Internal-only context, never rendered publicly. */
  notes?: string
}

export interface RetailerWithDistance extends Retailer {
  /** Straight-line distance in miles from the current search/geolocation point. Absent until a reference point exists. */
  distanceMiles?: number
}

// 'catalog' is the real retailer list in lib/retailers/catalog.ts (parsed
// from the GSX customer spreadsheet) — see lib/retailers/getRetailers.ts.
// 'unavailable' is only reachable if that array is ever emptied out
// entirely with nothing in Sanity either; RetailerLocator renders it as a
// truthful empty state rather than falling back to placeholder stores.
export type RetailerDataSource = 'sanity' | 'catalog' | 'unavailable'
