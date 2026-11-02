# Isolated website compatibility acceptance — 2026-11-02

Disposition: local compatibility evidence is ready for review. Hosted Sanity publishing and original login UI remain release blockers. No public staging deployment, production data connection, live-account migration or paid external API call was made.

## Executed verification

`npm run check` completed successfully on Node 24.22.2 with a production-mode Next 16.4.4 webpack build, Sanity 6.21.0 and PostgreSQL 17.11 on loopback. Evidence: [full regression log](validation/full-isolated-staging.log), [fictional CMS events](validation/local-cms-events.json), [current audit](validation/audit-staging.json).

| Check                                                            | Result                                                                                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| All Node security/config tests                                   | 7 passed, no failures/skips                                                                                                                    |
| ESLint                                                           | 0 errors; 4 existing React purity/effect warnings                                                                                              |
| Production-mode build and TypeScript                             | Passed                                                                                                                                         |
| Browser/API compatibility scenarios                              | 6 passed                                                                                                                                       |
| Every existing Sanity query helper                               | Evaluated against fictional in-memory documents with real GROQ evaluator                                                                       |
| Homepage/about/products/locator/contact/learn/account/navigation | Passed locally                                                                                                                                 |
| Next image optimizer                                             | Generated local PNG optimized successfully; production CDN not contacted                                                                       |
| Existing Auth.js credentials/session provider                    | Fictional admin login passed against local PostgreSQL; role changes reread and suspension immediately denied                                   |
| Reset-required fixture                                           | Sign-in denied, as expected                                                                                                                    |
| SDK mutation and revalidation                                    | Fictional article revision visible after authenticated webhook; missing secret rejected                                                        |
| Sanity Studio client boot                                        | Rendered expected network-error UI with external hosted access blocked; no matching runtime syntax/hydration errors                            |
| Redirects/ZIP/contact                                            | Existing redirect and local ZIP lookup passed; malformed form rejected, honeypot accepted generically, real delivery failed closed with no key |
| Dependencies                                                     | 0 critical, 0 high, 30 moderate, 4 low; no forced upgrade                                                                                      |

The log contains an expected CredentialsSignin rejection for the reset-required fixture and delivery_unavailable for the deliberately unconfigured contact mail provider. These negative checks passed. [Studio screenshot](validation/studio-local-shell.png) shows its expected blocked-network state, **not an authenticated working editor**. A prior test-harness image-loader issue was corrected to retain the actual default Next optimizer; the final full run passes.

## Scope of proof

The local runner guards exact loopback database/CMS destinations, rejects Vercel and real environment files, checks fixture-only contents before schema synchronization, and injects random in-memory secrets. No production Sanity project is used. The browser uses a fresh profile. Sanity CDN image requests are locally substituted; hosted image metadata/crop/hotspot fidelity and real CDN optimization still require the dedicated hosted acceptance environment.

The fixture is a narrow Sanity protocol simulation, not a vendor emulator or license to mark hosted publishing complete. Real Studio login, role permissions, draft edit/publish, Vision GROQ execution, CORS and webhook delivery require access to a separate non-production project/dataset. No such access was provided in this run. Do not run those acceptance steps against the production dataset. The GROQ WASM async/await target warning persists; confirm Vision in the supported browsers during hosted acceptance.

The repository contains `/api/auth` credentials/session handlers but no `/login` page. Existing legacy redirects point to absent pages. This review preserves that boundary and reports it; it does not invent or migrate the production login system. The actual HostGator/Vercel/domain routing relationship must be reconciled before deployment.

## Next developer

Read [handoff](customer-account-handoff.md) for reproducible setup, environment table, database separation and migration rules. The matching gsx-2 branch contains actual portal screenshots, fictional canonical-directory invariance proofs, complete account API contracts, architecture diagrams and a production service/cost proposal. Retain both branch deployment-deny rules. Keep PRs #2/#8 draft and unmerged until review and explicit release approval.
