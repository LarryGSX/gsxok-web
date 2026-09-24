// Client-side ZIP -> coordinates lookup for the HostGator static build.
//
// The Vercel version resolves ZIPs server-side (see app/api/zip-lookup —
// removed on this branch) using the `zipcodes` npm package's full ~5MB
// national dataset, kept off the client specifically to avoid that bundle
// weight (see the comment in the original lib/geo/zipLookup.ts). A static
// export has no server to hold that route, so this does the same lookup
// entirely in the browser against a much smaller, Oklahoma-relevant subset
// instead of shipping the full national dataset.
//
// public/data/ok-zips.json holds every ZIP inside a bounding box covering
// Oklahoma plus a ~150-mile buffer in every direction (lat 31.4–39.2,
// lng -105.6–-91.8) — the same radius RetailerLocator already treats as
// "nearby" for a real retailer. That's 4,042 ZIPs / ~170KB uncompressed
// (well under 45KB gzipped), versus the original package's 44,175 US ZIPs.
// A search for a ZIP genuinely outside that box (nowhere near an OK
// retailer) correctly resolves to "not found," matching the real-world
// outcome the old radius filter already produced for those cases.
//
// Format is a compact tuple array (not objects) to keep the JSON small:
// [zip, lat, lng, city, state][].

export interface ZipLocation {
  zip: string
  lat: number
  lng: number
  city: string
  state: string
}

type ZipTuple = [string, number, number, string, string]

let cache: Map<string, ZipLocation> | null = null
let inFlight: Promise<Map<string, ZipLocation>> | null = null

async function loadDataset(): Promise<Map<string, ZipLocation>> {
  if (cache) return cache
  if (inFlight) return inFlight

  inFlight = fetch('/data/ok-zips.json')
    .then((res) => {
      if (!res.ok) throw new Error(`ok-zips.json request failed: ${res.status}`)
      return res.json() as Promise<ZipTuple[]>
    })
    .then((rows) => {
      const map = new Map<string, ZipLocation>()
      for (const [zip, lat, lng, city, state] of rows) {
        map.set(zip, { zip, lat, lng, city, state })
      }
      cache = map
      return map
    })

  return inFlight
}

export async function lookupZipClient(zip: string): Promise<ZipLocation | null> {
  const map = await loadDataset()
  return map.get(zip) ?? null
}
