import zipcodes from 'zipcodes'

// ZIP → coordinates, from a bundled local dataset (the `zipcodes` npm
// package) — no external API, no account, no token. Replaces the earlier
// Mapbox Geocoding-based search entirely.
//
// This file is only ever imported by app/api/zip-lookup/route.ts (a server
// route), never by a 'use client' component. The package's dataset is a
// ~5MB in-memory JS object, so keeping it behind an API route rather than
// importing it directly in a client component keeps that weight out of the
// browser bundle.
//
// Known limitations (see the Find GSX completion report):
//   - Last published 2018 (npm metadata date is newer, but that's a
//     maintenance-only bump — the ZIP data itself is not recent). New ZIP
//     codes assigned after that won't resolve. Oklahoma's existing ZIPs
//     (including 74016 Chelsea) are present and correct as of this build.
//   - One centroid coordinate per ZIP, not a precise address point — fine
//     for "which retailers are nearest," not for turn-by-turn precision.
//   - US only (a `country` field exists but this build only expects US
//     ZIPs, matching the site's Oklahoma-only scope).

export interface ZipLocation {
  zip: string
  lat: number
  lng: number
  city: string
  state: string
}

// Only ZIPs inside Oklahoma plus a ~150-mile buffer resolve (lat 31.4-39.2,
// lng -105.6 to -91.8). This is the same area the approved HostGator build
// ships in public/data/ok-zips.json, so a search for a ZIP far from any GSX
// retailer gives the same "not found" result on both versions.
const MIN_LAT = 31.4
const MAX_LAT = 39.2
const MIN_LNG = -105.6
const MAX_LNG = -91.8

export function lookupZip(zip: string): ZipLocation | null {
  const result = zipcodes.lookup(zip)
  if (!result) return null
  if (
    result.latitude < MIN_LAT ||
    result.latitude > MAX_LAT ||
    result.longitude < MIN_LNG ||
    result.longitude > MAX_LNG
  ) {
    return null
  }

  return {
    zip: result.zip,
    lat: result.latitude,
    lng: result.longitude,
    city: result.city,
    state: result.state,
  }
}
