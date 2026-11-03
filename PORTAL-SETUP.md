# Portal setup on Vercel

The Vercel version has the same portal, ordering, and administrator screens as
the approved HostGator site (login, products, cart, companies, My Orders,
approvals with Old / Grandfathered or New / Standard pricing, Active and
Completed orders). The screens are the same code. The backend is Next.js route
handlers under `app/api/portal/` with Prisma and Postgres instead of PHP and
MySQL.

The public pages work without any of this. The portal only works once the
database and settings below are in place.

## 1. Settings (Vercel project, Environment Variables)

See `.env.example`. The portal needs:

- `DATABASE_URL`: the Postgres (Neon) connection string.
- `RESEND_API_KEY` and a verified sender domain: so order emails are delivered.
  Orders go to `ORDER_NOTIFICATION_EMAIL` (sales@gsxok.com), with a
  confirmation to the company the customer chose.

Everything else has the same defaults as HostGator.

## 2. Create the tables

From a computer with the repository, pointed at the Vercel database:

    DATABASE_URL="postgresql://..." npm run db:push

This adds the `portal_*` tables. The existing models in `prisma/schema.prisma`
are not changed by this work.

## 3. Create administrator accounts

    DATABASE_URL="postgresql://..." node scripts/portal-create-admin.cjs chris@gsxok.com Chris

It prints a temporary password once. The administrator signs in on the normal
Portal login page and is made to choose their own password immediately.

## 4. Load products and companies

Use a fresh export of the production old-site database (never an old one):

    node tools/import-legacy-products.cjs export.sql > products-import.sql

Run the generated SQL against the database. Never commit the export or the
generated SQL. See `tools/README.md`, including linking companies to accounts
that came from the old site.

## 5. Existing approved accounts

Nobody is given pricing automatically. After accounts exist, an administrator
opens each approved account on the administrator screen and chooses Old /
Grandfathered or New / Standard. Until then that account sees no prices and
cannot order.

## 6. Check it

Sign in as an administrator, approve a test registration with a pricing choice,
sign in as that customer, place an order, and confirm both emails arrive.
