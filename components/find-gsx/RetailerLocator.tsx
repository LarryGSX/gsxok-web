'use client'

import { useId, useMemo, useState } from 'react'
import type { Retailer, RetailerDataSource, RetailerWithDistance } from '@/lib/retailers/types'
import { distanceMiles } from '@/lib/geo/distance'
import { RetailerResult } from './RetailerResult'

// The Find GSX locator: a ZIP-code search plus a city-based browse
// directory. No map — see the earlier Mapbox implementation this replaced.
// The primary flow is deliberately simple: enter a ZIP, see the nearest
// eligible retailers and their addresses. Separately, browse by city (see
// "Browse GSX retailers by city" below) — users pick a city first and only
// ever see that one city's retailers; the full ~150-retailer dataset is
// never rendered at once in either mode. The two are intentionally never
// blended: ZIP results are distance-sorted with an approximate-mileage
// figure, the city directory is alphabetical with no distance shown at all.

const RESULTS_PAGE_SIZE = 5

// Retailers beyond this are not shown as a search result, even if they're
// technically the "nearest" one on file — a ZIP search for a distant or
// out-of-state code shouldn't present a retailer hundreds of miles away as
// if it were a normal nearby result. Wider than the old map-based radius
// (100mi) since a ZIP centroid is less precise than a geocoded address.
const NEARBY_RADIUS_MILES = 150

const ZIP_PATTERN = /^\d{5}$/

type SearchStatus = 'idle' | 'loading' | 'error' | 'not-found'

interface RetailerLocatorProps {
  retailers: Retailer[]
  dataSource: RetailerDataSource
}

function sortByCity(list: Retailer[]): Retailer[] {
  return [...list].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
}

// baseList is already sorted city-then-name, so grouping via a Map (which
// preserves insertion order) naturally yields cities in alphabetical order,
// each with its retailers already in alphabetical order — no re-sorting
// needed here. This is also the *only* place city names come from — derived
// straight from the retailer records passed in, never a separately
// maintained list — so the directory automatically tracks whatever
// Sanity/the catalog actually contains.
function groupByCity(list: Retailer[]): [string, Retailer[]][] {
  const groups = new Map<string, Retailer[]>()
  for (const r of list) {
    const existing = groups.get(r.city)
    if (existing) existing.push(r)
    else groups.set(r.city, [r])
  }
  return Array.from(groups.entries())
}

// Groups an already-alphabetized city list under its first-letter header —
// only letters actually present get a section (never an empty "Q" with no
// cities under it).
function groupByLetter(cities: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>()
  for (const city of cities) {
    const letter = city[0]?.toUpperCase() ?? '#'
    const existing = groups.get(letter)
    if (existing) existing.push(city)
    else groups.set(letter, [city])
  }
  return Array.from(groups.entries())
}

export function RetailerLocator({ retailers, dataSource }: RetailerLocatorProps) {
  const zipInputId = useId()
  const zipErrorId = useId()
  const citySearchId = useId()

  const [zip, setZip] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [searchedZip, setSearchedZip] = useState<string | null>(null)
  const [nearestResults, setNearestResults] = useState<RetailerWithDistance[]>([])
  const [showAllNearest, setShowAllNearest] = useState(false)
  // Bumped on every successfully-completed search (result or empty) so the
  // results block below can key off it and replay its entrance transition
  // even when searching the same ZIP twice in a row.
  const [searchNonce, setSearchNonce] = useState(0)
  // Independent of all ZIP-search state above — selecting/clearing a city
  // never touches or resets the current ZIP search, and vice versa.
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [citySearch, setCitySearch] = useState('')

  const baseList = useMemo(() => sortByCity(retailers), [retailers])
  const cityGroups = useMemo(() => groupByCity(baseList), [baseList])
  const cityMap = useMemo(() => new Map(cityGroups), [cityGroups])
  const cityNames = useMemo(() => cityGroups.map(([city]) => city), [cityGroups])

  const filteredCityNames = useMemo(() => {
    const q = citySearch.trim().toLowerCase()
    return q ? cityNames.filter((c) => c.toLowerCase().includes(q)) : cityNames
  }, [cityNames, citySearch])

  const letterGroups = useMemo(() => groupByLetter(filteredCityNames), [filteredCityNames])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = zip.trim()

    if (!ZIP_PATTERN.test(trimmed)) {
      setValidationError('Enter a valid 5-digit ZIP code.')
      setSearchedZip(null)
      return
    }

    setValidationError(null)
    setStatus('loading')

    try {
      const res = await fetch(`/api/zip-lookup?zip=${trimmed}`)
      if (!res.ok) {
        setStatus(res.status === 404 ? 'not-found' : 'error')
        setSearchedZip(null)
        return
      }
      const { location } = await res.json()

      const withDistance = baseList
        .map((r) => ({ ...r, distanceMiles: distanceMiles(location, r) }))
        .filter((r) => r.distanceMiles <= NEARBY_RADIUS_MILES)
        .sort((a, b) => a.distanceMiles - b.distanceMiles)

      setNearestResults(withDistance)
      setSearchedZip(trimmed)
      setShowAllNearest(false)
      setSearchNonce((n) => n + 1)
      setStatus('idle')
    } catch {
      setStatus('error')
      setSearchedZip(null)
    }
  }

  // Only reachable if the real retailer catalog were ever emptied out with
  // nothing in Sanity either — a truthful "we don't have this yet" state,
  // never placeholder stores standing in for real ones. Unchanged from the
  // map-based build: approved as-is, not being redesigned.
  if (dataSource === 'unavailable') {
    return (
      <section
        className="relative bg-[var(--color-cream)] bg-[length:100%_96px] md:bg-[length:100%_160px] bg-no-repeat bg-top"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(26,122,74,0.32) 0%, rgba(26,122,74,0.12) 20%, rgba(26,122,74,0) 60%, rgba(26,122,74,0) 100%)',
        }}
      >
        <div className="w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24" style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
          <h2 className="text-h4 text-[var(--color-dark)]">Retailer locations are being updated</h2>
          <p className="text-body-sm mt-2" style={{ color: 'var(--color-muted)', maxWidth: '56ch' }}>
            Check back soon, or contact GSX at sales@gsxok.com for current availability.
          </p>
        </div>
      </section>
    )
  }

  const visibleNearest = showAllNearest ? nearestResults : nearestResults.slice(0, RESULTS_PAGE_SIZE)
  const hasMoreNearest = !showAllNearest && nearestResults.length > RESULTS_PAGE_SIZE

  return (
    <section
      className="relative bg-[var(--color-cream)] bg-[length:100%_96px] md:bg-[length:100%_160px] bg-no-repeat bg-top"
      style={{
        backgroundImage:
          'linear-gradient(to bottom, rgba(26,122,74,0.32) 0%, rgba(26,122,74,0.12) 20%, rgba(26,122,74,0) 60%, rgba(26,122,74,0) 100%)',
      }}
    >
      <div className="w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Restrained entrance transition for a freshly-completed search —
            reuses the site's existing motion tokens (300ms, the same
            cubic-bezier as --ease-enter) rather than inventing new timing.
            Automatically neutralized by the global prefers-reduced-motion
            rule in globals.css, which forces all animation-duration to
            0.01ms. */}
        <style>{`
          @keyframes fgResultsIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fg-results-in {
            animation: fgResultsIn 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0) both;
          }

          /* The city-name index (letters A, B, C… each with their cities)
             flows into a balanced 2-column layout at desktop via CSS
             multi-column — letter groups vary in size, and columns
             naturally balance that without a fixed row/column template.
             Single column below 1024px (tablet and mobile), per spec. This
             is an index of CITY NAMES only — never retailer rows, and
             never more than one city's retailers on screen at a time. */
          .fg-city-index-columns {
            column-count: 1;
          }
          @media (min-width: 1024px) {
            .fg-city-index-columns {
              column-count: 2;
              column-gap: 3rem;
            }
          }
          .fg-letter-group {
            break-inside: avoid-column;
            display: inline-block;
            width: 100%;
            vertical-align: top;
            margin-bottom: 1.5rem;
          }
        `}</style>

        {/* ZIP search — prominent but constrained, not a full-bleed hero
            control. */}
        <div style={{ maxWidth: '640px' }}>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor={zipInputId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                ZIP code
              </label>
              <input
                id={zipInputId}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Enter ZIP code"
                aria-invalid={validationError ? true : undefined}
                aria-describedby={validationError ? zipErrorId : undefined}
                className="h-12 px-4 text-body bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150"
              />
            </div>
            <button
              type="submit"
              className="text-button px-6 h-12 bg-[var(--color-green)] text-[var(--color-cream)] border border-[var(--color-green)] hover:bg-[#155f3a] hover:border-[#155f3a] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dark)]"
            >
              Find GSX
            </button>
          </form>

          {validationError && (
            <p id={zipErrorId} role="alert" className="text-body-sm mt-3" style={{ color: 'var(--color-muted)' }}>
              {validationError}
            </p>
          )}
          {status === 'error' && (
            <p role="alert" className="text-body-sm mt-3" style={{ color: 'var(--color-muted)' }}>
              We couldn&rsquo;t complete that search. Please try again.
            </p>
          )}
          {status === 'not-found' && (
            <p role="alert" className="text-body-sm mt-3" style={{ color: 'var(--color-muted)' }}>
              We couldn&rsquo;t find that ZIP code. Please check it and try again.
            </p>
          )}
        </div>

        {/* Nearest results — only after a successful search. Keyed on
            searchNonce (not searchedZip) so re-searching the same ZIP still
            replays the entrance transition, per "every successful search
            should clearly read as a new state." The top rule + generous
            top spacing is the primary separation from the search controls
            above — rules-based separation, not color banding, matching the
            rest of the site. This is a distinct section from the directory
            below: sorted by distance, distance shown — never blended with
            the alphabetical, no-distance directory. */}
        {searchedZip && (
          <div
            key={searchNonce}
            className="fg-results-in mt-12 pt-8"
            style={{ maxWidth: '640px', borderTop: '1px solid var(--color-border)' }}
          >
            <h2 className="text-h3 text-[var(--color-dark)]">GSX near {searchedZip}</h2>
            {nearestResults.length > 0 && (
              <p className="text-body-sm mt-1" style={{ color: 'var(--color-muted)' }}>
                Closest retailers, sorted by approximate distance
              </p>
            )}

            {nearestResults.length === 0 ? (
              <div className="mt-4 px-4 py-8 text-center border border-[var(--color-border)]">
                <p className="text-h4 text-[var(--color-dark)]">No nearby GSX retailers found</p>
                <p className="text-body-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                  Try another ZIP code or check back as we continue expanding retailer locations.
                </p>
              </div>
            ) : (
              <>
                <ul className="mt-4 border border-[var(--color-border)]">
                  {visibleNearest.map((r) => (
                    <RetailerResult key={r.id} retailer={r} />
                  ))}
                </ul>
                {hasMoreNearest && (
                  <button
                    type="button"
                    onClick={() => setShowAllNearest(true)}
                    className="text-button mt-4 px-5 h-11 bg-transparent text-[var(--color-dark)] border border-[var(--color-dark)] hover:bg-[var(--color-dark)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
                  >
                    Show More
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Browse GSX retailers by city — a city index, not a retailer
            dump. Users pick one city; only that city's retailers ever
            render. Independent of the ZIP search above (selecting a city
            never touches searchedZip/nearestResults, and vice versa). No
            distance shown here — a distinct mode from the ZIP results
            above, never blended together. */}
        <div className="mt-12">
          <h2 className="text-h4 text-[var(--color-dark)]">Browse GSX retailers by city</h2>
          <p className="text-body-sm mt-1" style={{ color: 'var(--color-muted)', maxWidth: '56ch' }}>
            View current GSX retailer locations across Oklahoma
          </p>

          {selectedCity === null ? (
            <div className="mt-6">
              {/* Filters the city index only — never a second retailer
                  search. The main ZIP search above remains the primary
                  locator; this just narrows a fairly long city list. */}
              <div className="flex flex-col gap-1.5" style={{ maxWidth: '320px' }}>
                <label htmlFor={citySearchId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  Search cities
                </label>
                <input
                  id={citySearchId}
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="e.g. Tulsa"
                  className="h-11 px-4 text-body-sm bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150"
                />
              </div>

              {letterGroups.length === 0 ? (
                <p className="text-body-sm mt-6" style={{ color: 'var(--color-muted)' }}>
                  No cities match &ldquo;{citySearch}&rdquo;.
                </p>
              ) : (
                <div className="fg-city-index-columns mt-6">
                  {letterGroups.map(([letter, cities]) => (
                    <div key={letter} className="fg-letter-group">
                      <p className="text-label" style={{ color: 'var(--color-green)' }}>{letter}</p>
                      <ul className="mt-1 border-t border-[var(--color-border)]">
                        {cities.map((city) => (
                          <li key={city} className="border-b border-[var(--color-border)]">
                            <button
                              type="button"
                              onClick={() => setSelectedCity(city)}
                              className="w-full flex items-center justify-between gap-2 py-2.5 text-body-sm text-left text-[var(--color-dark)] hover:text-[var(--color-green)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
                            >
                              {city}
                              <span aria-hidden="true" style={{ color: 'var(--color-muted)' }}>→</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSelectedCity(null)}
                className="text-button px-5 h-11 bg-transparent text-[var(--color-dark)] border border-[var(--color-dark)] hover:bg-[var(--color-dark)] hover:text-[var(--color-cream)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
              >
                ← Back to All Cities
              </button>
              <h3 className="text-h3 text-[var(--color-dark)] mt-6">Retailers in {selectedCity}</h3>
              <ul className="mt-4 border border-[var(--color-border)]">
                {(cityMap.get(selectedCity) ?? []).map((r) => (
                  <RetailerResult key={r.id} retailer={r} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
