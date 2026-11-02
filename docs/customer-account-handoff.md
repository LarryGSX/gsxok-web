Current status: [formal dependency/security review](dependency-security-review.md) supersedes the initial audit and build status below.

# Independent customer account entry

Review branch: `codex/customer-account-foundation`. No deployment authorized.

`/account` is a server-rendered entry page using the existing brand tokens. It
stays disabled unless `GSX_ACCOUNT_PORTAL_ENABLED=true` and
`GSX_ACCOUNT_PORTAL_ORIGIN` is an exact HTTPS origin. This is server configuration,
not a NEXT_PUBLIC value or a user-supplied redirect. No cookie, session, identity
claims or database credentials are forwarded. The independent portal owns its
session; website NextAuth tokens never authorize it.

The original Prisma schema, old login system, Company/User one-to-one relation,
legacy IDs and any transaction data are unchanged. Do not repurpose those tables
as the new authoritative customer directory. GSX 2.0 retains customer ownership.
The full architecture/API/operations handoff is in the matching `gsx-2` branch at
`docs/customer-portal-handoff.md` and `docs/customer-portal-plan.md`.

Run `node --test tests/portal-entry.test.mjs`, TypeScript, ESLint and the normal
build after dependencies are installed. This review branch adds a dependency
lockfile; the original repository had none. Use npm ci --ignore-scripts for
reproducible installation, then npm run db:generate (no database connection).
The dependency audit reports 53 findings: 4 low, 35 moderate, 13 high and 1 critical.
The critical finding is transitive decompress via Sanity. Remediation requires
a separately reviewed dependency upgrade. The local build compiles and typechecks,
then stops at existing /about page collection because no Sanity project ID is
configured. Do not treat this branch as release-ready.
Do not push this branch until Vercel preview deployment triggers are reviewed:
even a review-branch push can create a public deployment. Existing site header
links have deliberately not been repointed before the independent portal is
approved and deployed. Once that is authorized, update the navigation to /account,
configure the reviewed origin, and test the separate login boundary.
