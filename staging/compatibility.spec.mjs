import { test, expect } from '@playwright/test'
import { createClient } from '@sanity/client'
import { PrismaClient } from '@prisma/client'
import { image } from './cms.mjs'
const origin = 'http://127.0.0.1:4316',
  password = 'Fictional staging login 2026!'
test.beforeEach(async ({ context }) => {
  await context.route('**/*', async (route) => {
    const u = new URL(route.request().url())
    if (u.hostname === '127.0.0.1') return route.continue()
    if (u.hostname === 'cdn.sanity.io')
      return route.fulfill({ status: 200, contentType: 'image/png', body: image })
    return route.abort()
  })
})
test('content queries, navigation, optimized images and disabled portal entry', async ({
  page,
}) => {
  const content = await (await page.request.get('/api/staging/content')).json()
  expect(content).toMatchObject({
    settings: 'Fictional GSX Staging',
    products: 1,
    product: 'sample',
    family: 1,
    locations: 1,
    steps: 1,
    articles: 1,
    article: 'article',
    families: 1,
  })
  expect(content.productSlugs).toEqual([{ slug: 'fictional-sample' }])
  expect(content.articleSlugs).toEqual([{ slug: 'fictional-article' }])
  await page.goto('/')
  await expect(page.getByText('Fictional staging article', { exact: true })).toBeVisible()
  for (const path of ['/about', '/products', '/find-gsx', '/contact', '/learn', '/account']) {
    const response = await page.goto(path)
    expect(response.status()).toBe(200)
  }
  await expect(
    page.getByText('Account services are being prepared.', { exact: false })
  ).toBeVisible()
  const optimized = await page.request.get(
    '/_next/image?url=' + encodeURIComponent('http://127.0.0.1:4317/image.png') + '&w=640&q=75'
  )
  expect(optimized.ok()).toBe(true)
  expect(optimized.headers()['content-type']).toContain('image/')
  await page.goto('/')
  await page.getByRole('link', { name: 'About', exact: true }).first().click()
  await expect(page).toHaveURL(origin + '/about')
})
async function signIn(context, email) {
  const csrf = await (await context.request.get(origin + '/api/auth/csrf')).json()
  await context.request.post(origin + '/api/auth/callback/credentials', {
    headers: { 'X-Auth-Return-Redirect': '1' },
    form: { email, password, csrfToken: csrf.csrfToken, callbackUrl: origin },
  })
  return (await context.request.get(origin + '/api/auth/session')).json()
}
test('existing credentials provider uses only fictional PostgreSQL accounts and refreshes server authorization', async ({
  context,
}) => {
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  try {
    const session = await signIn(context, 'fictional-stage-admin@example.invalid')
    expect(session.user.email).toBe('fictional-stage-admin@example.invalid')
    const before = await context.request.get(origin + '/api/staging/identity')
    expect((await before.json()).role).toBe('ADMIN')
    await prisma.user.update({
      where: { email: 'fictional-stage-admin@example.invalid' },
      data: { role: 'BUYER' },
    })
    expect((await (await context.request.get(origin + '/api/staging/identity')).json()).role).toBe(
      'BUYER'
    )
    await prisma.user.update({
      where: { email: 'fictional-stage-admin@example.invalid' },
      data: { accountStatus: 'SUSPENDED' },
    })
    expect((await context.request.get(origin + '/api/staging/identity')).status()).toBe(401)
  } finally {
    await prisma.user.update({
      where: { email: 'fictional-stage-admin@example.invalid' },
      data: { role: 'ADMIN', accountStatus: 'ACTIVE' },
    })
    await prisma.$disconnect()
  }
})
test('reset-required fixture cannot authenticate', async ({ context }) => {
  const session = await signIn(context, 'fictional-stage-reset@example.invalid')
  expect(session?.user).toBeUndefined()
})
test('fictional SDK publishing protocol and authenticated Next revalidation update local cached content', async ({
  page,
  request,
}) => {
  const client = createClient({
    projectId: 'gsxstage',
    dataset: 'fictional',
    apiVersion: '2024-01-01',
    apiHost: 'http://127.0.0.1:4317',
    useProjectHostname: false,
    useCdn: false,
    token: process.env.GSX_STAGE_FIXTURE_TOKEN,
  })
  await client.createOrReplace(
    {
      _id: 'article',
      _type: 'educationArticle',
      title: 'Fictional published revision',
      slug: { current: 'fictional-article' },
      summary: 'Fictional revision',
      publishedAt: '2026-01-01T00:00:00Z',
    },
    { returnDocuments: false }
  )
  expect((await request.post(origin + '/api/revalidate')).status()).toBe(401)
  expect(
    (
      await request.post(origin + '/api/revalidate', {
        headers: { Authorization: 'Bearer ' + process.env.GSX_STAGE_WEBHOOK_SECRET },
      })
    ).status()
  ).toBe(200)
  await page.goto('/')
  await expect(page.getByText('Fictional published revision', { exact: true })).toBeVisible()
})
test('Studio route renders its client shell without connecting to a hosted dataset', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const response = await page.goto('/studio')
  expect(response.status()).toBe(200)
  await page
    .waitForFunction(() => document.body.innerText.trim().length > 0, undefined, { timeout: 20000 })
    .catch(() => {})
  await page.screenshot({ path: 'docs/validation/studio-local-shell.png', fullPage: true })
  expect(
    (await page.locator('body').innerText()).trim(),
    'Studio must render visible client content, not just return HTML'
  ).not.toBe('')
  // No claim of authenticated hosted Studio/Vision editing or publishing is made.
  expect(errors.filter((e) => /hydration|top.level.await|SyntaxError/i.test(e))).toEqual([])
})

test('legacy redirects, local ZIP lookup and contact safeguards preserve behavior without sending mail', async ({
  request,
}) => {
  const redirect = await request.get('/about.html', { maxRedirects: 0 })
  expect(redirect.status()).toBe(308)
  expect(redirect.headers().location).toBe('/about')
  // Missing legacy login UI is a documented release blocker, not silently recreated here.
  expect((await request.get('/login')).status()).toBe(404)
  const zip = await request.get('/api/zip-lookup?zip=73102')
  expect(zip.ok()).toBe(true)
  expect((await request.post('/api/contact', { data: {} })).status()).toBe(400)
  const payload = {
    name: 'Fictional Contact',
    email: 'fictional-contact@example.invalid',
    reason: 'Website / Technical Issue',
    message: 'Fictional local staging contact test',
    renderedAt: Date.now() - 10000,
  }
  expect(
    (
      await request.post('/api/contact', { data: { ...payload, gsxHpToken: 'fictional-bot' } })
    ).status()
  ).toBe(200)
  const delivery = await request.post('/api/contact', { data: payload })
  expect(delivery.status()).toBe(503)
  expect((await delivery.json()).error).toBe('delivery_unavailable')
})
