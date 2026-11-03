#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node script (CommonJS) */
// Turns the `products` table of an export of the production OLD-site database
// (okgatesc_gsxdb) into SQL for the portal's `portal_products` table (Postgres).
//
//   node tools/import-legacy-products.cjs path/to/okgatesc_gsxdb.sql > products-import.sql
//
// Then run products-import.sql once against the portal database (the Neon SQL
// editor, or psql), after `npm run db:push` has created the tables. Never
// commit the generated file or the export.
//
// The old table had ONE price per product. Larry's email says original
// customers keep the old chocolate prices, so that old price becomes
// `legacy_price` (grandfathered). `price` (standard) is the same unless Larry
// gave a newer price, listed in STANDARD_CHOCOLATE below.
const path = require('path')
const { readTable, sqlQuote } = require('./sqldump.cjs')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node tools/import-legacy-products.cjs <old-database-export.sql>')
  process.exit(1)
}

// From Larry's email: the chocolate bag prices for new customers. A product
// gets a different standard price only if its title ends in "Chocolate Bites"
// (the 250 / 500 / 1000 mg bags) AND its old price is a key here.
const STANDARD_CHOCOLATE = { '5.00': '6.00', '6.50': '7.50', '8.00': '9.00' }
const CHOCOLATE_TITLE = /Chocolate Bites$/

// Old uploaded image file name -> the file in public/images/products/.
const imageMap = require('./product-image-map.json')

const strip = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

// products: id, title, img, price, status, desc1, pid
const rows = readTable(file, 'products')
if (rows.length === 0) {
  console.error('No products found in ' + path.basename(file))
  process.exit(1)
}

const warnings = []
const values = rows.map(([id, title, img, price, status, desc, sku]) => {
  const oldPrice = Number(price).toFixed(2)
  const standard = CHOCOLATE_TITLE.test(title.trim()) && STANDARD_CHOCOLATE[oldPrice] ? STANDARD_CHOCOLATE[oldPrice] : oldPrice
  const image = imageMap[img]
  if (!image) warnings.push(`product ${id} "${title}": no photo mapped for "${img}" (add it to tools/product-image-map.json)`)
  return `  (${Number(id)}, ${sqlQuote(sku)}, ${sqlQuote(title)}, ${sqlQuote(strip(desc))}, ${sqlQuote(image || '')}, ${standard}, ${oldPrice}, ${status.trim() === 'instock' ? 'true' : 'false'}, ${Number(id)}, now())`
})

console.log(`-- Products from ${path.basename(file)}: ${rows.length} rows.
-- price = standard price, legacy_price = grandfathered (original) price.
-- Run once against the portal database, after the tables exist. A product
-- already brought across (same legacy_id) is skipped, so running it twice is safe.
INSERT INTO "portal_products" ("legacy_id", "sku", "title", "description", "image", "price", "legacy_price", "in_stock", "sort_order", "updated_at") VALUES
${values.join(',\n')}
ON CONFLICT ("legacy_id") DO NOTHING;`)

console.error(`${rows.length} products converted.`)
warnings.forEach((w) => console.error('WARNING: ' + w))
