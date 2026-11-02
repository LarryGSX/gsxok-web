import test from 'node:test'
import assert from 'node:assert/strict'
import { validWebhookAuthorization } from '../lib/webhook-auth.ts'
import { accountMayAuthenticate, currentWebsiteIdentity } from '../lib/account-policy.ts'
import { contactFormSchema } from '../lib/contact/schema.ts'
import { readFile } from 'node:fs/promises'

test('webhook fails closed with absent/malformed/wrong secrets', () => {
  assert.equal(validWebhookAuthorization(null, undefined), false)
  assert.equal(validWebhookAuthorization('Bearer ', ''), false)
  assert.equal(validWebhookAuthorization('secret', 'secret'), false)
  assert.equal(validWebhookAuthorization('Bearer wrong', 'secret'), false)
  assert.equal(validWebhookAuthorization('Bearer fictional-secret', 'fictional-secret'), true)
})
test('website identity policy denies reset-required and suspended accounts and rereads roles/company', async () => {
  for (const status of ['PENDING', 'SUSPENDED', 'PASSWORD_RESET_REQUIRED', 'unknown'])
    assert.equal(accountMayAuthenticate(status), false)
  const fresh = {
    id: 'fictional-user',
    role: 'BUYER',
    accountStatus: 'ACTIVE',
    companyId: 'fictional-current-company',
  }
  assert.deepEqual(await currentWebsiteIdentity('fictional-user', async () => fresh), fresh)
  await assert.rejects(
    currentWebsiteIdentity('fictional-user', async () => ({ ...fresh, accountStatus: 'SUSPENDED' }))
  )
  await assert.rejects(currentWebsiteIdentity('fictional-user', async () => null))
  await assert.rejects(currentWebsiteIdentity(undefined, async () => fresh))
})
test('Zod 4 preserves contact validation, bounds, defaults and error behavior', () => {
  const data = {
    name: ' Fictional Contact ',
    email: 'fictional@example.invalid',
    reason: 'Website / Technical Issue',
    message: 'Fictional validation fixture',
    renderedAt: Date.now(),
  }
  const parsed = contactFormSchema.parse(data)
  assert.equal(parsed.name, 'Fictional Contact')
  assert.equal(parsed.phone, '')
  assert.equal(parsed.company, '')
  for (const change of [
    { reason: 'invalid' },
    { renderedAt: 'now' },
    { message: 'x'.repeat(2001) },
    { email: [] },
    { name: '' },
  ])
    assert.equal(contactFormSchema.safeParse({ ...data, ...change }).success, false)
})
test('review branch cannot trigger Vercel Git deployments', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.equal(config.git.deploymentEnabled['codex/customer-account-foundation'], false)
})
