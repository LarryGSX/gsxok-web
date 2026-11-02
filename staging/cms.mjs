// Fictional in-memory Sanity protocol fixture. No network client, paid API or hosted dataset.
import { createServer } from 'node:http'
import { parse, evaluate } from 'groq-js'
import { deflateSync } from 'node:zlib'
function crc32(bytes) {
  let crc = -1
  for (const b of bytes) {
    crc ^= b
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ -1) >>> 0
}
function chunk(type, data) {
  const label = Buffer.from(type),
    size = Buffer.alloc(4),
    crc = Buffer.alloc(4)
  size.writeUInt32BE(data.length)
  crc.writeUInt32BE(crc32(Buffer.concat([label, data])))
  return Buffer.concat([size, label, data, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(32, 0)
ihdr.writeUInt32BE(32, 4)
ihdr[8] = 8
ihdr[9] = 2
const pixels = Buffer.alloc(32 * (1 + 32 * 3))
for (let y = 0; y < 32; y++) {
  pixels[y * 97] = 0
  for (let x = 0; x < 32; x++) {
    const n = y * 97 + 1 + x * 3
    pixels[n] = 26
    pixels[n + 1] = 122
    pixels[n + 2] = 74
  }
}
export const image = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(pixels)),
  chunk('IEND', Buffer.alloc(0)),
])
export function createFixtureCms(secret) {
  const documents = [
    {
      _id: 'siteSettings',
      _type: 'siteSettings',
      siteName: 'Fictional GSX Staging',
      tagline: 'Fictional local staging only',
      contactEmail: 'fictional@example.invalid',
      siteBanner: 'Fictional local staging only',
    },
    {
      _id: 'family',
      _type: 'productFamily',
      name: 'Fictional family',
      slug: { current: 'fictional-family' },
      description: 'Fictional compatibility fixture',
    },
    {
      _id: 'image-fixture-32x32-png',
      _type: 'sanity.imageAsset',
      url: 'http://127.0.0.1:4317/image.png',
      metadata: { dimensions: { width: 32, height: 32 } },
    },
    {
      _id: 'sample',
      _type: 'product',
      name: 'Fictional display sample',
      slug: { current: 'fictional-sample' },
      availabilityStatus: 'available',
      shortDescription: 'Display compatibility only',
      image: { asset: { _ref: 'image-fixture-32x32-png' }, alt: 'Fictional image' },
      productFamily: { _ref: 'family' },
    },
    {
      _id: 'article',
      _type: 'educationArticle',
      title: 'Fictional staging article',
      slug: { current: 'fictional-article' },
      summary: 'Fictional local content query fixture',
      publishedAt: '2026-01-01T00:00:00Z',
      relatedProducts: [],
    },
    {
      _id: 'step',
      _type: 'manufacturingStep',
      order: 1,
      title: 'Fictional step',
      description: 'Fictional staging fixture',
    },
    {
      _id: 'location',
      _type: 'dispensary',
      name: 'Fictional directory location',
      slug: { current: 'fictional-location' },
      address: '123 Fictional Avenue',
      city: 'Fictional City',
      state: 'OK',
      zip: '74000',
      availabilityStatus: 'available',
    },
  ]
  const events = []
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:4317')
    res.setHeader('Content-Type', 'application/json')
    if (req.headers.origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(req.headers.origin))
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    const send = (code, value) => {
      res.statusCode = code
      res.end(JSON.stringify(value))
    }
    if (url.pathname === '/image.png') {
      res.setHeader('Content-Type', 'image/png')
      res.end(image)
      return
    }
    if (url.pathname === '/_fixture/events') {
      if (req.headers.authorization !== 'Bearer ' + secret)
        return send(401, { error: 'Unauthorized' })
      return send(200, events)
    }
    try {
      if (url.pathname.endsWith('/data/query/fictional')) {
        const params = Object.fromEntries(
          [...url.searchParams]
            .filter(([k]) => k.startsWith('$'))
            .map(([k, v]) => [k.slice(1), JSON.parse(v)])
        )
        const query = url.searchParams.get('query')
        const result = await (
          await evaluate(parse(query), {
            dataset: documents.filter((d) => !d._id.startsWith('drafts.')),
            params,
          })
        ).get()
        events.push({ type: 'query', query })
        return send(200, { query, result, ms: 1 })
      }
      if (url.pathname.endsWith('/data/mutate/fictional') && req.method === 'POST') {
        if (req.headers.authorization !== 'Bearer ' + secret)
          return send(401, { error: 'Unauthorized' })
        let text = ''
        for await (const b of req) {
          text += b
          if (text.length > 20000) return send(413, { error: 'Too large' })
        }
        const { mutations } = JSON.parse(text)
        const results = []
        for (const mutation of mutations) {
          if (mutation.createOrReplace) {
            const d = mutation.createOrReplace
            if (
              !['siteSettings', 'drafts.siteSettings', 'article', 'drafts.article'].includes(d._id)
            )
              return send(400, { error: 'Unsupported fixture document' })
            const i = documents.findIndex((x) => x._id === d._id)
            if (i < 0) documents.push(d)
            else documents[i] = d
            results.push({ id: d._id, operation: 'update' })
          } else if (mutation.delete) {
            const i = documents.findIndex((x) => x._id === mutation.delete.id)
            if (i >= 0) documents.splice(i, 1)
            results.push({ id: mutation.delete.id, operation: 'delete' })
          } else return send(400, { error: 'Unsupported fixture mutation' })
        }
        events.push({ type: 'fixture-publish', ids: results.map((r) => r.id) })
        return send(200, { transactionId: 'fictional-transaction', results })
      }
      return send(404, { error: 'No such fictional endpoint' })
    } catch {
      return send(400, { error: 'Invalid fictional request' })
    }
  })
  return { server, events, documents }
}
