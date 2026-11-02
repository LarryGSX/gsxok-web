// Explicitly invoked local build smoke test. Refuses remote/public destinations.
import test from 'node:test'
import assert from 'node:assert/strict'
const origin = process.env.GSX_SMOKE_ORIGIN
if (
  !origin ||
  new URL(origin).hostname !== '127.0.0.1' ||
  new URL(origin).protocol !== 'http:' ||
  new URL(origin).origin !== origin
)
  throw Error('Set an exact loopback GSX_SMOKE_ORIGIN.')
for (const path of ['/', '/about', '/products', '/contact', '/find-gsx', '/account', '/studio'])
  test(`production build serves ${path} locally`, async () => {
    const response = await fetch(origin + path, { redirect: 'follow' })
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /<html/)
    if (path === '/account') {
      assert.match(html, /Account services are being prepared/)
      assert.doesNotMatch(html, /Continue to account services/)
    }
  })
test('unconfigured local webhook rejects unauthenticated mutation', async () => {
  const response = await fetch(origin + '/api/revalidate', { method: 'POST' })
  assert.equal(response.status, 401)
})
