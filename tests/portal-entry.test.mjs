import test from 'node:test'
import assert from 'node:assert/strict'
import { portalEntry } from '../lib/portal-entry.ts'

test('account navigation is disabled by default', () => {
  assert.equal(portalEntry({}), null)
  assert.equal(portalEntry({ GSX_ACCOUNT_PORTAL_ORIGIN: 'https://fictional.example.invalid' }), null)
})
test('enabled account navigation requires an exact HTTPS origin', () => {
  for (const origin of ['http://localhost:4313', 'https://user:pass@example.invalid', 'https://example.invalid/path', 'https://example.invalid/', 'javascript:alert(1)']) {
    assert.throws(() => portalEntry({ GSX_ACCOUNT_PORTAL_ENABLED: 'true', GSX_ACCOUNT_PORTAL_ORIGIN: origin }))
  }
  assert.throws(() => portalEntry({ GSX_ACCOUNT_PORTAL_ENABLED: 'true' }))
  assert.equal(portalEntry({ GSX_ACCOUNT_PORTAL_ENABLED: 'true', GSX_ACCOUNT_PORTAL_ORIGIN: 'https://fictional.example.invalid' }), 'https://fictional.example.invalid')
})
