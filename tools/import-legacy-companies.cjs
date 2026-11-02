#!/usr/bin/env node
// Brings a customer's companies across from an export of the production OLD-site
// database (okgatesc_gsxdb) into the portal's `companies` table, for accounts
// that have ALREADY been linked (users.legacy_id = old accounts.id).
//
//   node tools/import-legacy-companies.cjs path/to/okgatesc_gsxdb.sql \
//        --link 1:17 --link 2:20 --link 3:28 > companies-import.sql
//
// Each --link is <portal user id>:<old account id>. Run companies-import.sql once
// in phpMyAdmin, in the portal database, after ordering-setup.sql. It is safe to
// run again (a company already brought across is skipped). Never commit the
// generated file or the export: it contains customer details.
//
// A company belongs to an old account the same way the old site decided it
// (dashboard/cart-data.php): the company's userid AND useremail must both match
// the old account's userid and email. Duplicate company rows in the old data are
// brought across as they are. State names like "Oklahoma" become the 2-letter code.
const path = require('path')
const { readTable, sqlQuote } = require('./sqldump.cjs')

const args = process.argv.slice(2)
const file = args[0]
const links = []
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--link' && /^\d+:\d+$/.test(args[i + 1] || '')) {
    const [newUser, oldAccount] = args[++i].split(':').map(Number)
    links.push({ newUser, oldAccount })
  }
}
if (!file || links.length === 0) {
  console.error('Usage: node tools/import-legacy-companies.cjs <old-database-export.sql> --link <portalUserId>:<oldAccountId> [--link ...]')
  process.exit(1)
}

const STATE = { ok: 'OK', oklahoma: 'OK' }
const state = (s) => STATE[s.trim().toLowerCase()] || s.trim().toUpperCase().slice(0, 2)

// accounts: id,fname,lname,address,city,state,zip,lic,email,phone,password,userid,reset,accstatus
// company : id,company,address,city,state,zip,lic,email,phone,userid,useremail
const accounts = readTable(file, 'accounts')
const companies = readTable(file, 'company')

const statements = []
for (const { newUser, oldAccount } of links) {
  const acct = accounts.find((a) => Number(a[0]) === oldAccount)
  if (!acct) {
    console.error(`ERROR: old account ${oldAccount} is not in the export. Nothing generated for portal user ${newUser}.`)
    process.exit(1)
  }
  const userid = acct[11]
  const email = acct[8].trim().toLowerCase()
  const mine = companies.filter((c) => c[9] === userid && c[10].trim().toLowerCase() === email)
  console.error(`old account ${oldAccount} -> portal user ${newUser}: ${mine.length} companies`)
  for (const c of mine) {
    statements.push(
      'INSERT INTO `companies` (`user_id`, `name`, `address`, `city`, `state`, `zip`, `omma_license`, `email`, `phone`, `legacy_id`)\n' +
        `SELECT u.\`id\`, ${sqlQuote(c[1])}, ${sqlQuote(c[2])}, ${sqlQuote(c[3])}, ${sqlQuote(state(c[4]))}, ${sqlQuote(c[5])}, ${sqlQuote(c[6])}, ${sqlQuote(c[7])}, ${sqlQuote(c[8])}, ${Number(c[0])}\n` +
        `FROM \`users\` u WHERE u.\`id\` = ${newUser} AND u.\`legacy_id\` = ${oldAccount}\n` +
        `  AND NOT EXISTS (SELECT 1 FROM \`companies\` x WHERE x.\`legacy_id\` = ${Number(c[0])});`
    )
  }
}

console.log(`-- Companies brought across from ${path.basename(file)} for already-linked accounts.
-- Safe to run more than once. Contains customer details: do not commit or share.
SET NAMES utf8mb4;

${statements.join('\n\n')}
`)
console.error(`${statements.length} companies converted.`)
