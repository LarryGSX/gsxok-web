import { googleMapsDirectionsUrl } from '@/lib/geo/directions'
import type { Retailer } from '@/lib/retailers/types'

// A compact retailer row for the "Browse GSX retailers by city" directory
// (see RetailerLocator.tsx) — deliberately distinct from RetailerResult.tsx,
// which is the bordered, roomier treatment used for ZIP search results and
// stays exactly as-is. The city directory can be browsed across 150+
// retailers in a session, so each row here is minimal by design: name,
// address, Get Directions, a subtle divider — no border box, no card, no
// distance, no extra padding. Meant to sit two-up in a CSS grid at desktop
// and stack one-per-row on mobile (the grid lives in the parent).

interface CompactRetailerRowProps {
  retailer: Retailer
}

export function CompactRetailerRow({ retailer }: CompactRetailerRowProps) {
  const directionsUrl = retailer.directionsUrl ?? googleMapsDirectionsUrl(retailer.lat, retailer.lng)

  return (
    <div className="py-3 border-b border-[var(--color-border)]">
      <p className="text-h4 text-[var(--color-dark)]">{retailer.name}</p>
      <p className="text-body-sm text-[var(--color-muted)] mt-1">
        {retailer.address}
        <br />
        {retailer.city}, {retailer.state} {retailer.zip}
      </p>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Get directions to ${retailer.name}`}
        className="text-button inline-flex items-center gap-1.5 text-[var(--color-dark)] border border-[var(--color-dark)] px-3 py-1.5 mt-2 hover:bg-[var(--color-dark)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
      >
        Get Directions
      </a>
    </div>
  )
}
