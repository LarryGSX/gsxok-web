# Website dependency and security review — 2026-11-02

Scope: `codex/customer-account-foundation`; draft review only, no merge/deployment.
The original 53 npm findings were package-level counts (1 critical, 13 high,
35 moderate, 4 low), including inherited findings. They were not 53 independent
vulnerabilities and do not prove the deployed website has the same versions.

After reviewed updates: **0 critical, 0 high, 30 moderate, 4 low**. All original
packages and all remaining findings are individually listed in the generated
[package inventory](dependency-package-inventory.md). Reproduce it with
`node scripts/dependency-review.mjs`; both raw audit reports are retained under
`docs/validation/`. No `npm audit fix --force` was run.

## Critical and high findings, conditions, fixes and regression risks

| Root / inherited packages | Exploit conditions and local applicability | Fix / regression risk |
| --- | --- | --- |
| `decompress` through `@sanity/cli` | Malicious archive entries/symlinks/hardlinks can escape extraction directories, expose files or retain dangerous modes. CLI/developer/build risk when processing attacker-controlled archives. No portal route extracts archives; bounded PDFs stay quarantined. Absence of a public archive route does not remove tooling risk. | Sanity 3 → 6.21.0 removes the unmaintained upstream package. No patched `decompress` release exists; did not alias an incompatible fork into the old API. Studio/CLI/plugin behavior needs staging acceptance. [Advisory](https://github.com/advisories/GHSA-mp2f-45pm-3cg9). |
| `adm-zip` / `@sanity/runtime-cli` | Crafted ZIP lengths, symlinks, modes, duplicate entries and async decompression can cause overwrite, privilege or availability problems in extraction workflows. No portal ZIP handling. | Updated Sanity CLI dependency tree selects patched archive tooling. No custom unsafe extraction workaround. Test Studio tooling before release. Original audit retains all eight advisory links. |
| `glob`, `@architect/hydrate`, `@architect/inventory`, `@architect/utils` | CLI `-c/--cmd` with attacker-controlled filenames can execute shell commands; cancellation/traversal paths also affected. The website does not accept glob patterns or invoke glob CLI on customer input. Tooling still requires patching. | Current supported Sanity dependencies remove/replace affected paths; no blanket major-version glob override. [CLI advisory](https://github.com/advisories/GHSA-5j98-mcp5-4vw2). |
| `zod` / `@sanity/codegen` | Oversized invalid collections can accumulate validation errors and exhaust memory. Current contact/auth schemas are bounded scalar objects, not array schemas, but direct parser dependency was vulnerable. | Zod 4.6.7 plus Sanity update. Migrated `errorMap` and `invalid_type_error` to Zod 4 `error`; regression tests verify accepted inputs, defaults, bounds and invalid types. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [migration guide](https://zod.dev/v4/changelog). |
| `deepmerge-ts`, `@prisma/config`, `prisma` | Recursive object graphs can exhaust the stack during configuration merging. Plain JSON cannot represent those cycles; no customer-supplied Prisma config is loaded. | Retain Prisma client/CLI 6.19.3 and its schema/engine compatibility; scoped official `deepmerge-ts` 8.0.2 override in `@prisma/config`. Its `deepmerge` API remains available and schema generation/type checks pass. This is a deliberate cross-major transitive override; production schema/introspection/migration rehearsal is still required. Avoided migrating the data layer to a release candidate or incompatible Prisma major. [Advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). |
| `postcss` / `next` | Processing attacker-controlled CSS/sourceMappingURL can read source-map files; certain stringify-to-HTML uses can permit XSS. CSS is repository-owned; customer documents are not parsed as CSS. | Next.js 16.4.4 resolves patched PostCSS. Preserve webpack build behavior explicitly; verify revalidation, image/font loading, NextAuth, Studio and content queries. [Source-map advisory](https://github.com/advisories/GHSA-6g55-p6wh-862q), [Next 16 upgrade](https://nextjs.org/docs/app/guides/upgrading/version-16). |

The supported Sanity update revealed three additional high dependencies in its
new tooling tree. All were patched with scoped **same-major** official versions:

- `@vercel/frameworks` → `js-yaml` 3.15.2: crafted YAML aliases/merge chains can
  exhaust CPU; trusted repository/framework discovery input here, no portal YAML.
  [Advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh).
- `@vercel/frameworks` → `smol-toml` 1.9.1: malformed TOML can hang parsing or
  force quadratic work; used for framework configuration discovery, not uploads.
- `@module-federation/dts-plugin` → `undici` 7.30.1: malicious network peers can
  trigger decompression/redirect/TLS issues in the tooling client. No assumption
  that catching fetch errors makes it safe. [Example advisory](https://github.com/advisories/GHSA-xjj6-f33q-929c).

Updated peer-compatible set: Sanity/Vision 6.21.0, next-sanity 13.4.0,
@sanity/client 8.14.1, Next 16.4.4, React/React DOM 19.3.1, styled-components
6.6.0, ESLint 9.39.5 and eslint-config-next 16.4.4.
TypeScript 6.0.3 satisfies both Sanity workflow tooling and typescript-eslint. ESLint 9.39.5 is retained from the original resolved tree because the Next plugin ecosystem does not yet declare ESLint 10 compatibility. Its upstream maintenance/deprecation status remains P2 toolchain debt; the integrity check reports no invalid/missing peers. Do not force ESLint 10 into those peer ranges.

NextAuth stays on its existing v5 beta API, updated to beta.32 for supported
Next 16 peer compatibility; do not silently downgrade it to v4. No credentials,
Prisma schema, canonical customers, order data or pricing were migrated.

## Remaining 34 findings: disposition

Resolved moderate roots also include PrismJS DOM clobbering (attacker-controlled
DOM markup reaching the syntax highlighter) and uuid buffer-bound handling
(caller-supplied buffers/offsets for v3/v5/v6). Their older Sanity UI/refractor and
preview-url dependency paths were replaced by the supported Sanity update. No
portal request supplies DOM markup to PrismJS or buffers/offsets to uuid. The
inventory retains their original advisory URLs and package-level inherited paths.

**30 moderate:** one root `minimatch` pattern-amplification advisory propagated
through ESLint and Sanity/oclif tooling. Exploitation requires an attacker-supplied
glob pattern reaching affected preprocessing (not merely a file or form value).
The examined account/contact endpoints never pass customer input to minimatch.
Use trusted repository/configuration inputs and isolated CI. The patched major is
11.0.1+, but several parents require older, API-incompatible majors. A blanket
override or npm's suggested obsolete ESLint downgrade would be unsafe. Track
upstream supported parent releases or a separately tested scoped migration.
Priority P2, with reassessment to P1 if untrusted patterns enter any tooling/API.
[Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

**4 low:** `deepmerge` prototype poisoning propagated through html-to-text,
@react-email/render and Resend 4. Current contact delivery supplies plain text
and scalar fields, not attacker-controlled nested configuration/template objects.
No exploit path was identified in the examined handler; that is not a general
claim about Resend. A separately tested Resend major update can remove the path;
new production portal mail must use a reviewed adapter and must not merge request
objects into provider options. Priority P2; reassess before HTML/template features.

## Additional website boundary corrections

- Webhook authentication now rejects absent configured secrets, absent headers,
  malformed schemes and wrong values using constant-time digests. Previously
  undefined header and undefined environment secret could compare equal.
- Credentials accept ACTIVE accounts only; reset-required accounts cannot sign in.
- `requireAuth` reloads active account status, role and company from the website
  database on each protected request. A stale JWT is not administrative authority.
  Portal API never accepts website JWTs, regardless of this correction.
- Next 16 revalidation uses `{expire:0}` to preserve immediate invalidation.
- New React compiler diagnostics on four existing components remain visible
  warnings (not disabled); no React compiler is enabled. These are existing
  performance/purity patterns, not a reason to rewrite unrelated workflows here.

## Node runtime security (separate from npm audit)

The original system Node 24.18.1 embeds Undici 7.29.0, within affected upstream
ranges. Updating the npm `undici` dependency does not patch Node's built-in fetch.
Both branches now require Node **24.22.2** (24.x only) in `.node-version` and
engines. Official Node 24.22.2 includes Undici **7.30.1**; its portable Windows
archive was downloaded from nodejs.org, verified against official SHASUMS256,
and used for final tests/builds without replacing the user's global installation.
[Official Node releases](https://github.com/nodejs/node/releases),
[Undici security release](https://github.com/nodejs/undici/releases/tag/v7.30.1).

P1 before launch: operators must select and verify the patched runtime on each
developer/CI/production host; an engines declaration alone is not proof of a
hosting provider's patch level. The global machine installation is unchanged.
The local review runtime JSON records the actual final test interpreter.

The successful webpack build emits an async/await target warning for Vision's
GROQ WASM module. `/studio` returns HTTP 200 in the local smoke test, which does
not prove the authenticated Vision tool works. Include Vision in P1 staging
acceptance; no warning was suppressed to claim runtime compatibility.

## Design review boundary

The account portal matches the website ink (#0c0c0b), cream (#faf8f3), green (#1a7a4a), square-corner direction and restrained layout. Its isolated CSP-safe stylesheet currently uses system-ui, while the website uses Space Grotesk/Manrope. Self-hosted brand-font alignment is P2 UI work. Desktop DOM/layout checks passed; true desktop/mobile screenshot sign-off is still blocked by native Edge approval and in-app capture/viewport limitations. No visual acceptance is implied by HTTP smoke tests.

## Review and publication boundary

`vercel.json` in this branch disables Git deployments for the exact review branch,
following [Vercel's branch deployment configuration](https://vercel.com/docs/project-configuration/git-configuration).
There are no repository GitHub Actions/deployment workflow files. Do not merge or
manually deploy. Project/team inspection via the Vercel connector returned 403
because team consent is missing; no hosting settings or deployment were changed.
The branch guard, source review and post-push checks are the available safeguards;
hosting access is still needed to independently inspect all project-level hooks.

See the matching GSX 2.0 branch's `docs/customer-portal-review.md` for the portal
security findings, architecture verdict and prioritized production work.
