'use client'

import { useId, useMemo, useState } from 'react'
import type { Retailer, RetailerDataSource, RetailerWithDistance } from '@/lib/retailers/types'
import { distanceMiles } from '@/lib/geo/distance'
import { RetailerResult } from './RetailerResult'
import { CompactRetailerRow } from './CompactRetailerRow'

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
  // Independent of all ZIP-search state above — browsing the directory
  // never touches or resets the current ZIP search, and vice versa.
  //
  // Three-level drill-down, one level visible at a time:
  //   1. alphabet (always visible while selectedCity is null)
  //   2. selectedLetter -> the cities under that letter
  //   3. selectedCity -> that city's retailers (letter/alphabet hidden)
  // citySearch is a parallel entry point into level 2: typing a query shows
  // matching cities directly (no letter needed), and picking one of those
  // still records which letter it falls under so "Back to cities" has
  // somewhere coherent to return to.
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [citySearch, setCitySearch] = useState('')

  const baseList = useMemo(() => sortByCity(retailers), [retailers])
  const cityGroups = useMemo(() => groupByCity(baseList), [baseList])
  const cityMap = useMemo(() => new Map(cityGroups), [cityGroups])
  const cityNames = useMemo(() => cityGroups.map(([city]) => city), [cityGroups])

  // Only letters that actually head a city in the dataset ever render —
  // never a disabled/greyed-out letter with nothing under it.
  const availableLetters = useMemo(() => {
    const letters = new Set<string>()
    for (const city of cityNames) {
      const letter = city[0]?.toUpperCase()
      if (letter) letters.add(letter)
    }
    return Array.from(letters).sort()
  }, [cityNames])

  const isSearchingCities = citySearch.trim().length > 0

  const searchMatches = useMemo(() => {
    if (!isSearchingCities) return []
    const q = citySearch.trim().toLowerCase()
    return cityNames.filter((c) => c.toLowerCase().includes(q))
  }, [cityNames, citySearch, isSearchingCities])

  const citiesForSelectedLetter = useMemo(() => {
    if (!selectedLetter) return []
    return cityNames.filter((c) => c[0]?.toUpperCase() === selectedLetter)
  }, [cityNames, selectedLetter])

  function handleSelectLetter(letter: string) {
    setCitySearch('')
    setSelectedLetter(letter)
  }

  function handleCitySearchChange(value: string) {
    setCitySearch(value)
    // A typed query is its own way into the city list — it shouldn't be
    // read as also having a letter selected. Clearing the field this way
    // lands back on the plain alphabet-only state, per spec.
    if (value.trim()) setSelectedLetter(null)
  }

  function handleSelectCity(city: string) {
    setCitySearch('')
    // If the city was reached via search (no letter chosen yet), record its
    // letter so "Back to cities" below has that letter's list to return to,
    // instead of dropping the visitor all the way back to a bare alphabet.
    setSelectedLetter(city[0]?.toUpperCase() ?? null)
    setSelectedCity(city)
  }

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

          /* The compact A-B-C… letter selector. Wraps on narrow screens
             instead of scrolling or growing tall. */
          .fg-letter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.375rem;
          }
          .fg-letter-button {
            min-width: 2.25rem;
            height: 2.25rem;
            padding: 0 0.5rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--color-border);
            color: var(--color-dark);
            transition: background-color 150ms, color 150ms, border-color 150ms;
          }
          .fg-letter-button:hover {
            border-color: var(--color-green);
            color: var(--color-green);
          }
          .fg-letter-button[data-active="true"] {
            background-color: var(--color-green);
            border-color: var(--color-green);
            color: var(--color-cream);
          }

          /* Cities under one letter (or matching a search) — a handful of
             names at most, never the full ~150-city list at once. 2-4
             columns depending on width, 1 column on the narrowest screens. */
          .fg-city-grid {
            display: grid;
            grid-template-columns: 1fr;
            column-gap: 1.5rem;
          }
          @media (min-width: 480px) {
            .fg-city-grid { grid-template-columns: 1fr 1fr; }
          }
          @media (min-width: 1024px) {
            .fg-city-grid { grid-template-columns: 1fr 1fr 1fr; }
          }
          @media (min-width: 1280px) {
            .fg-city-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
          }

          /* Selected-city retailer results: a plain 2-column CSS grid at
             desktop (each CompactRetailerRow supplies its own bottom
             divider — no outer border box, no card). Single column below
             768px. */
          .fg-city-retailer-grid {
            display: grid;
            grid-template-columns: 1fr;
          }
          @media (min-width: 768px) {
            .fg-city-retailer-grid {
              grid-template-columns: 1fr 1fr;
              column-gap: 2.5rem;
            }
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

        {/* Browse GSX retailers by city — a three-level drill-down
            (alphabet -> cities under a letter -> retailers in a city).
            Exactly one level's contents render at a time; the full city
            list and the full retailer list are never both/either rendered
            in one pass. Independent of the ZIP search above (selecting a
            letter or city never touches searchedZip/nearestResults, and
            vice versa). No distance shown here — a distinct mode from the
            ZIP results above, never blended together. */}
        <div className="mt-12">
          <h2 className="text-h4 text-[var(--color-dark)]">Browse GSX retailers by city</h2>
          <p className="text-body-sm mt-1" style={{ color: 'var(--color-muted)', maxWidth: '56ch' }}>
            View current GSX retailer locations across Oklahoma
          </p>

          {selectedCity === null ? (
            <div className="mt-6">
              {/* Filters the city index only — never a second retailer
                  search. The main ZIP search above remains the primary
                  locator; this just narrows the directory to matching
                  city names. */}
              <div className="flex flex-col gap-1.5" style={{ maxWidth: '320px' }}>
                <label htmlFor={citySearchId} className="text-label" style={{ color: 'var(--color-muted)' }}>
                  Search cities
                </label>
                <input
                  id={citySearchId}
                  type="text"
                  value={citySearch}
                  onChange={(e) => handleCitySearchChange(e.target.value)}
                  placeholder="e.g. Tulsa"
                  className="h-11 px-4 text-body-sm bg-white text-[var(--color-dark)] border border-[var(--color-border)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-green)] transition-colors duration-150"
                />
              </div>

              {/* Level 1: the alphabet. Only letters that actually head a
                  city ever appear, and this stays visible whenever no city
                  is selected so a visitor can jump straight to another
                  letter without backing out first. */}
              <div className="fg-letter-row mt-6" role="group" aria-label="Browse cities by letter">
                {availableLetters.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleSelectLetter(letter)}
                    aria-pressed={selectedLetter === letter}
                    data-active={selectedLetter === letter ? 'true' : undefined}
                    className="fg-letter-button text-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Level 2: cities under the search query or the selected
                  letter — never both sources and never the full city list. */}
              {isSearchingCities ? (
                searchMatches.length === 0 ? (
                  <p className="text-body-sm mt-6" style={{ color: 'var(--color-muted)' }}>
                    No cities match &ldquo;{citySearch}&rdquo;.
                  </p>
                ) : (
                  <div className="mt-6">
                    <p className="text-label" style={{ color: 'var(--color-muted)' }}>
                      Cities matching &ldquo;{citySearch}&rdquo;
                    </p>
                    <div className="fg-city-grid mt-3">
                      {searchMatches.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleSelectCity(city)}
                          className="text-left py-1 text-body-sm text-[var(--color-dark)] hover:text-[var(--color-green)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : selectedLetter ? (
                <div className="mt-6">
                  <p className="text-label" style={{ color: 'var(--color-muted)' }}>
                    Cities beginning with {selectedLetter}
                  </p>
                  <div className="fg-city-grid mt-3">
                    {citiesForSelectedLetter.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className="text-left py-1 text-body-sm text-[var(--color-dark)] hover:text-[var(--color-green)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)]"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6">
              {/* Level 3: just the back action, the heading, and this one
                  city's retailers — the alphabet and city grid are hidden
                  entirely while a city is selected. Quiet text action, not
                  a bordered button, so it doesn't compete with the heading
                  right below it. Returns to the selected letter's city
                  list (selectedLetter is left untouched), not all the way
                  back to a bare alphabet. */}
              <button
                type="button"
                onClick={() => setSelectedCity(null)}
                className="text-body-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] underline-offset-4 hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green)] focus-visible:rounded-sm"
              >
                ← Back to cities
              </button>
              <h3 className="text-h3 text-[var(--color-dark)] mt-3">Retailers in {selectedCity}</h3>
              <div className="fg-city-retailer-grid mt-4">
                {(cityMap.get(selectedCity) ?? []).map((r) => (
                  <CompactRetailerRow key={r.id} retailer={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
