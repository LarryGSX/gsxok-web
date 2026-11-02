import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createFixtureCms } from './cms.mjs'

const database = process.env.GSX_STAGING_DATABASE_URL
if (!database) throw Error('Supply GSX_STAGING_DATABASE_URL for the disposable loopback database.')
const parsed = new URL(database)
if (
  parsed.hostname !== '127.0.0.1' ||
  parsed.port !== '54329' ||
  parsed.pathname !== '/gsx_web_staging'
)
  throw Error('Refusing non-fictional staging database.')
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local'])
  if (existsSync(file)) throw Error('Use an isolated checkout without real environment files.')
const token = randomBytes(32).toString('hex'),
  secret = randomBytes(48).toString('hex')
const env = {
  ...process.env,
  DATABASE_URL: database,
  NEXT_PUBLIC_GSX_LOCAL_STAGING: '1',
  NEXT_PUBLIC_GSX_STAGE_API_ORIGIN: 'http://127.0.0.1:4317',
  NEXT_PUBLIC_SANITY_PROJECT_ID: 'gsxstage',
  NEXT_PUBLIC_SANITY_DATASET: 'fictional',
  NEXT_TELEMETRY_DISABLED: '1',
  AUTH_URL: 'http://127.0.0.1:4316',
  AUTH_TRUST_HOST: 'true',
  AUTH_SECRET: randomBytes(48).toString('hex'),
  SANITY_REVALIDATE_SECRET: secret,
  RESEND_API_KEY: '',
  GSX_ACCOUNT_PORTAL_ENABLED: 'false',
  GSX_ACCOUNT_PORTAL_ORIGIN: '',
  SANITY_API_TOKEN: '',
  SANITY_API_READ_TOKEN: '',
  GSX_STAGE_FIXTURE_TOKEN: token,
  GSX_STAGE_WEBHOOK_SECRET: secret,
  GSX_STAGE_ALLOW_FONTS: '1',
  NODE_OPTIONS:
    '--require ' + JSON.stringify(fileURLToPath(new URL('./network-guard.cjs', import.meta.url))),
}
const cms = createFixtureCms(token)
await new Promise((r, reject) => {
  cms.server.once('error', reject)
  cms.server.listen(4317, '127.0.0.1', r)
})
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(Error('Staging child failed: ' + code))
    )
  })
}
let app
const prisma = new PrismaClient({ datasourceUrl: database })
try {
  // Check contents before schema synchronization. This database is disposable,
  // and is never allowed to contain copied business/order/reset-token records.
  const tables =
    await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`
  const allowed = new Set(['User', 'Company', 'PasswordResetToken', 'Order', 'OrderItem'])
  if (tables.some((t) => !allowed.has(t.table_name)))
    throw Error('Refusing unknown staging tables.')
  for (const { table_name: name } of tables) {
    if (name === 'User') {
      const users = await prisma.$queryRaw`SELECT email FROM "User"`
      if (
        users.some(
          (u) => !u.email.startsWith('fictional-stage-') || !u.email.endsWith('@example.invalid')
        )
      )
        throw Error('Refusing non-fixture users before schema synchronization.')
    } else {
      // Identifier is restricted by the exact allowlist above, never user input.
      const count = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${name}"`)
      if (count[0].n !== 0) throw Error('Refusing business records in disposable staging.')
    }
  }
  await run(['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'])
  const existing = await prisma.user.findMany({ select: { email: true } })
  if (
    existing.some(
      (u) => !u.email.startsWith('fictional-stage-') || !u.email.endsWith('@example.invalid')
    )
  )
    throw Error('Refusing unexpected records in fictional database.')
  const hash = await bcrypt.hash('Fictional staging login 2026!', 12)
  for (const [label, status, role] of [
    ['active', 'ACTIVE', 'BUYER'],
    ['admin', 'ACTIVE', 'ADMIN'],
    ['reset', 'PASSWORD_RESET_REQUIRED', 'BUYER'],
  ]) {
    const email = `fictional-stage-${label}@example.invalid`
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hash, accountStatus: status, role },
      create: {
        email,
        passwordHash: hash,
        accountStatus: status,
        role,
        firstName: 'Fictional',
        lastName: 'Fixture',
        phone: '555-0100',
        address: '123 Fictional Avenue',
        city: 'Fictional City',
        state: 'OK',
        zip: '74000',
        ommaLicense: 'TEST-ONLY',
      },
    })
  }
  await run(['node_modules/next/dist/bin/next', 'build', '--webpack'])
  app = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4316'],
    { env, stdio: 'inherit', windowsHide: true }
  )
  let ready = false
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch('http://127.0.0.1:4316/account')).ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  if (!ready) throw Error('Staging website did not become ready.')
  await run([
    'node_modules/@playwright/test/cli.js',
    'test',
    '--config',
    'staging/playwright.config.mjs',
  ])
  await mkdir('docs/validation', { recursive: true })
  await writeFile(
    'docs/validation/local-cms-events.json',
    JSON.stringify(
      { fictional: true, hostedSanityPublishingVerified: false, events: cms.events },
      null,
      2
    ) + '\n'
  )
  console.log(
    'Fictional local staging complete. Hosted Sanity authorization/publishing remains a separate acceptance gate.'
  )
} finally {
  if (app) app.kill()
  await prisma.$disconnect()
  await new Promise((r) => cms.server.close(r))
}
