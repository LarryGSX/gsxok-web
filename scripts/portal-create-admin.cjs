#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node script (CommonJS) */
// Creates (or resets) a portal administrator account.
//
//   DATABASE_URL="postgresql://..." node scripts/portal-create-admin.cjs chris@gsxok.com Chris
//
// Prints a random temporary password ONCE. The administrator signs in on the
// regular Portal login page with it, and is made to choose their own password
// straight away (the temporary one only ever works once). Nothing is stored in
// plain text and nothing is committed.
//
// Run it again for an existing email to reset that administrator to a new
// temporary password.
const { randomBytes } = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const [email, firstName] = process.argv.slice(2)
if (!email || !firstName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/portal-create-admin.cjs <email> <first name>')
  process.exit(1)
}

const db = new PrismaClient()

;(async () => {
  // Letters and digits only, no look-alike characters, so it is easy to read out loud.
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const temp = Array.from(randomBytes(14), (b) => alphabet[b % alphabet.length]).join('')
  const passwordHash = await hash(temp, 12)
  const lower = email.trim().toLowerCase()

  const admin = await db.portalAdmin.upsert({
    where: { email: lower },
    create: { email: lower, firstName, passwordHash, mustChangePassword: true, status: 'active' },
    update: { firstName, passwordHash, mustChangePassword: true, status: 'active' },
  })

  console.log(`Administrator ready: ${admin.email} (id ${admin.id})`)
  console.log(`Temporary password (shown once): ${temp}`)
})()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
