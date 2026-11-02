# GSX website / independent account portal handoff

Review branch: `codex/customer-account-foundation`. Keep draft PR #2 open. No merge or public deployment authorized. This supersedes the original missing-project-ID and 53-advisory status. Current dependency findings are in [security review](dependency-security-review.md).

## Ownership and authentication

`/account` stays disabled unless GSX_ACCOUNT_PORTAL_ENABLED=true and GSX_ACCOUNT_PORTAL_ORIGIN is an exact HTTPS origin without path, userinfo, query, fragment or trailing slash. It is an ordinary link: no cookie, identity claims or database credentials are forwarded. Website Auth.js tokens never authorize the independent portal. The website authorization helper rereads current status, role and company from its own database.

GSX 2.0 remains authoritative for customer records. Portal profiles are submitted claims, memberships and a reviewed UUID reference only. The original website Prisma schema, legacy IDs and transaction data remain unchanged. Do not repurpose its Company/User relationship into a second authoritative directory.

Complete portal API contracts, HTTP statuses, cookies/Origin/CSRF rules, schema ledger, directory/email/scanner adapters and operations are documented in the matching private gsx-2 branch: `docs/customer-portal-handoff.md`, `customer-portal-plan.md`, `customer-portal-production.md`, `customer-portal-visual-review.md` and `customer-portal-acceptance.md`.

There is no `/login` page in this checkout. Credentials/session endpoints exist, but legacy redirects/navigation still target missing login/portal pages. Passing credentials-provider tests do not establish that the original production login UI is restored. Reconcile the live application target and approved navigation before release. No transaction functionality was added.

## Reproduce isolated compatibility checks

Use Node 24.22.2, PostgreSQL 17, installed Microsoft Edge on Windows; other systems install Playwright Chromium (`npx playwright install chromium`). From this repository:

```powershell
npm ci --ignore-scripts
npm run db:generate
# Create a NEW empty local database gsx_web_staging on 127.0.0.1:54329.
# Supply a disposable local role/password through the environment.
$env:GSX_STAGING_DATABASE_URL='postgresql://fictional:PLACEHOLDER@127.0.0.1:54329/gsx_web_staging'
npm run check
```

The example DSN is deliberately unusable. Never use a production dump, secret or environment file. The runner rejects hosted/other database destinations, real environment files, unexpected users/tables and nonempty business/order/token tables before schema synchronization. It applies the existing Prisma schema only to the dedicated fictional database; this is not a production migration procedure.

`staging/run.mjs` starts an in-memory Sanity protocol fixture on 127.0.0.1:4317, seeds three fictional website users, builds Next in production mode and starts it on 127.0.0.1:4316. It runs browser/API checks and shuts down app/fixture. PostgreSQL is independently managed and remains for inspection. Ports must be free. Fresh browser profiles do not use personal cookies.

Node network guards reject external business-data destinations; public Google font downloads are allowed during build. Browser routing aborts external requests and substitutes a generated PNG for Sanity CDN images. The actual Next image optimizer is tested locally. The fixture uses the real GROQ evaluator and Sanity SDK; local mutation/revalidation checks do not establish hosted Sanity authorization, CORS or webhook delivery.

| Configuration                            | Local value / purpose              |
| ---------------------------------------- | ---------------------------------- |
| NEXT_PUBLIC_GSX_LOCAL_STAGING            | 1; absent in normal production     |
| NEXT_PUBLIC_GSX_STAGE_API_ORIGIN         | exact http://127.0.0.1:4317        |
| NEXT_PUBLIC_SANITY_PROJECT_ID / DATASET  | gsxstage / fictional               |
| DATABASE_URL                             | exact disposable loopback database |
| AUTH_URL                                 | local website origin               |
| AUTH_SECRET / SANITY_REVALIDATE_SECRET   | random per-run values, not logged  |
| GSX_STAGE_FIXTURE_TOKEN / WEBHOOK_SECRET | random per-run fixture-only values |
| RESEND_API_KEY / Sanity API tokens       | empty; no provider mail/data calls |
| GSX_ACCOUNT_PORTAL_ENABLED               | disabled for compatibility tests   |

Staging refuses Vercel. `/api/staging/content` and `/api/staging/identity` return 404 in ordinary builds; they offer no provisioning/authentication bypass. Identity uses the real authorization helper. Never deploy a staging build artifact. Image-input substitution/private-IP allowance only exist under the exact staging guard.

## Test scope

`npm run check` runs Node security/config tests, ESLint, guarded production build and browser/API integration checks. Coverage includes every existing Sanity query helper, public routes/navigation/images, credentials login with fictional PostgreSQL users, immediate role/status refresh, reset-required rejection, local publishing protocol and authenticated revalidation, Studio shell, redirects, local ZIP lookup and contact validation/honeypot/fail-closed mail. Real mail delivery is deliberately not attempted. See [acceptance review](isolated-staging-review.md).

Sanity Vision currently emits a GROQ WASM async/await build-target warning. A passing local shell test does not prove authenticated hosted Studio/Vision editing. Dedicated non-production Sanity access remains essential for real editing/publishing acceptance. No paid provider API calls were made.

## Production configuration and migrations

Verify the actual project/team/domain/source branch serving the site before release. Both review branches retain exact-branch Vercel Git deployment deny rules. These commands do not deploy.

Keep website Prisma, portal account DB and canonical GSX directory isolated with separate credentials/grants. `prisma db push` here is a local fixture tool, not an approved production migration. Inventory the real Prisma migration history and baseline before generating a reviewed non-destructive migration. Portal migrations use their own `portal.migrations` ledger, never the core migration runner or website schema.

Inject production DATABASE_URL, AUTH_SECRET, exact AUTH_URL, approved Sanity project/dataset, webhook secret and mail settings through the host secret manager. The independent portal uses PORTAL_DATABASE_URL, its own MFA key/key ID, explicit HTTPS origin and private directory/email/scanner adapters. Never share Auth.js secrets with portal/internal staff services. Production composition, provider outbox/email, scanning, least-privilege roles, backup/restore evidence and monitoring remain launch gates. The private production proposal gives specific services/costs and separates required work from later improvements.
