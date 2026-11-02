# Loading the old site's data into the portal

These scripts read an **export of the production old-site database**
(`okgatesc_gsxdb`, from phpMyAdmin: Export, Quick, SQL) and write SQL files to
run in phpMyAdmin. They don't connect to any database themselves.

Never commit an export or a generated SQL file: they hold customer details.
Never use an old or sample export for production; use a fresh one.

Run these in the **portal** database, after `ordering-setup.sql`:

1. Products
   `node tools/import-legacy-products.cjs path/to/export.sql > products-import.sql`
2. Companies for accounts that are already linked to an old account
   (`users.legacy_id` is set):
   `node tools/import-legacy-companies.cjs path/to/export.sql --link <portal user id>:<old account id> [--link ...] > companies-import.sql`

Product photos live in `public/images/products/`. `product-image-map.json` says
which file belongs to which old product photo; the products script warns if one
is missing.
