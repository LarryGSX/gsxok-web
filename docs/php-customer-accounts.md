# PHP customer accounts: phase-one handoff

**Latest continuation:** [staff review, signed directory links and validation](php-staff-account-review.md)
supersedes the phase-one unfinished staff/UI/linking items below.

Branch: `codex/php-customer-account-security`, based on `origin/hostgator-static`
at `2ea37129ef1e04411eabad2542958a0665c682f4`. PR #8 and website PR #2 are
unchanged. This branch is pushed as draft PR #3; it has not been merged or deployed. No production
database or real account is used by the tests.

## What this implements

The account-only entry is `/account.php`. It runs directly on PHP; no Node
process, PostgreSQL, Next build, new provider or subscription is needed at
runtime. Static CSS/JS and the existing licensed Manrope/Space Grotesk fonts
reuse the approved cream/ink/green, square-panel, responsive design.

One existing `users` credential store serves old and new account entry points.
Existing password hashes, user/company IDs, legacy links and transaction tables
are retained. No GSX customer or pricing master is created. Existing company rows
are displayed only for their owning user. Edits create bounded profile-review
claims, never updates to those rows or authoritative GSX 2.0 customer records.

`account_access` is independent of existing `account_status`. New users retain
`account_status=pending` even after account approval, verification and password
reset. The account API always reports `transactions:false`. Existing transaction
approval interfaces remain separate and are not repurposed. A single version
increment added to their status-change UPDATE invalidates sessions across status
changes; transaction behavior has otherwise not been redesigned or tested here.

## Security behavior

- Only the socket peer establishes client IP. Forwarded IP/protocol headers are
  ignored. HTTPS must be provided by the actual server; no proxy trust is enabled.
- Production session cookie: `__Host-gsx-account`, Secure, HttpOnly, SameSite=Lax,
  Path=/, no Domain. Strict session IDs, 8-hour absolute and 30-minute idle limits.
  Local fixtures alone use a separate non-Secure cookie on loopback.
- All authenticated entry points recheck persisted status and `auth_version`.
  Password changes/resets, revocation and account-access changes invalidate old
  sessions. Logout clears the current session; password changes sign out all.
- POST requires JSON, session CSRF and an exact allowed Origin. Production allows
  the two existing HTTPS apex/www origins; custom origins use the configured base
  URL only. Body limit is 16 KiB. Customer responses are `no-store`.
- New passwords retain whitespace verbatim, require 12 characters and at most 72
  bytes, and reject NUL. Existing hashes are not rewritten. The 72-byte bound
  prevents bcrypt truncation; an existing password above that bound needs recovery.
- Registration/recovery return matching status/body for known and unknown emails.
  Registration hashes before checking duplicates. SMTP is outside request timing.
  This is response-parity protection, not a claim of mathematically constant-time
  registration/database execution.
- Public account-email operations and reauthentication have persisted throttles.
  A MySQL named mutex makes account-request check/record atomic across workers.
  The conservative limit is 10 requests per 15 minutes per address or socket IP,
  across those account operations. Existing login throttles remain in place.
- Verification/reset secrets are random 32-byte tokens, stored only as SHA-256
  digests, expire after 30 minutes and are consumed under user/token row locks.
  Consumption invalidates sibling tokens and queued mail of that purpose.
  Password recovery never changes approval or transaction status.
- Links use URL fragments; UI removes the fragment before further navigation.
  CSP excludes inline/third-party scripts; private UI uses textContent, and logout
  removes company/account details from the DOM.
- Account access approval is staff-only, requires current-password reauthentication
  and verified email, and audits the change. No self-promotion or customer-ID
  enumeration API is added. Separate internal GSX staff authentication is untouched.

## Additive migration and compatibility

`account-migration-001.sql` adds account-access/verification/version fields, a
staff auth version, token/request/mail/audit/profile-claim tables. Apply once,
only after separate release approval, complete private backup and schema comparison.
MySQL DDL is not an all-or-nothing migration. A partial failure requires inspection
and a reviewed recovery, never blind rerun. No deployment/migration was performed.

The backfill preserves prior active/reset-required account approval, including
original timestamps, but does not fabricate email verification. Existing users
must verify their email; their credentials and legacy mappings remain intact.
Old PHP sessions have no version binding and expire on release. Old reset tokens
remain in their original table for preservation but are not accepted; request a
new link. Old static forms keep HTTP 200 generic registration/recovery success.
Their older password hints still need alignment before release; the new account
entry includes the correct rules. New email links go directly to `/account.php`.

SQL targets MySQL 5.7 syntax and InnoDB, using PDO native prepares and named locks.
Actual tests use MariaDB 10.11.18, not a claim of exact HostGator MySQL 5.7 parity.
PHP 8.2 syntax is supported with PDO MySQL, mbstring, sessions and password hashing.
No runtime Composer dependency is introduced. `.htaccess` protects SQL, test tools,
configuration and the worker. Tests must never be shipped as web content.

## Email without another service

Public requests enqueue `account_mail_queue` rows (user ID/purpose only, no raw
tokens or message body). The CLI-only `account-mail-worker.php` drains up to 50
jobs under a single MySQL worker lock. It rechecks account eligibility, creates a
fresh token, calls existing PHP mail, and records completion. Failures retry after
five minutes, up to five attempts; exhausted rows require operator review. A crash
after successful send but before acknowledgement can cause duplicate emails.
The queue is durable; delivery is at least once, not exactly once or proof of inbox
arrival. `sent_at` also marks discarded/cancelled jobs. Monitor exhausted/pending
rows and set a reviewed retention policy for queue/throttle/audit/token data.

Production remains disabled (`GSX_PORTAL_MAIL_READY=false`). A future authorized
release must validate the existing sender/transport and inbox delivery, configure
the already-available host cron to invoke the worker, and exercise failure/retry.
The private secrets file can override the mail-ready/from/base URL constants.
No Google credentials, SMTP integration, cron change or real email call was made.
Tests execute the same worker against a local fictional file sink outside webroot.

## Account API

Existing `csrf-token.php`, `login.php`, `logout.php`, `register.php`,
`forgot-password.php`, `reset-password.php`, `session-check.php` remain shared.
Registration/recovery return generic HTTP 200; login success is 200, failure 401,
throttle 429. Token consumption succeeds with 200 or returns generic 400 for
invalid/expired/used/ineligible tokens.

| Route | Request/behavior |
| --- | --- |
| POST account-token.php | `action=resend/recover,email`; generic 202 |
| POST account-token.php | `action=verify/reset,token`; reset also `password,confirmPassword` |
| GET account-api.php | Approved verified user; own account/companies/CSRF; transactions false |
| POST account-api.php | `action=profile-request,companyId,profile` (name,address,city,state,zip,phone,email); scoped INSERT; 202 pending review |
| POST account-api.php | `action=password,currentPassword,password,confirmPassword`; reauth + revoke all |
| POST account-api.php | `action=revoke-sessions,currentPassword`; reauth + revoke all |
| POST admin-account-access.php | Staff + CSRF + `id,access=pending/approved/suspended,currentPassword`; never updates transaction status/pricing |

There is no staff review UI or automatic GSX writeback in this phase. A developer
must connect profile-claim review to the existing internal workflow, with approved
canonical customer UUID links. Legacy IDs are not assumed to be GSX UUIDs. No
password synchronization, customer-directory replication or internal admin API
exposure should be added. Existing legacy-folder authentication is outside this
checkout and must not be presumed to inherit this session revocation logic.

## Reproduce fictional tests

Use an isolated empty MySQL-compatible database named **gsx_account_fictional** on
127.0.0.1:53317, user gsx_fictional/password fictional-local-only with permissions
only on that disposable schema. These values are fictional fixtures, not secrets.
Do not run against a live schema. The fixture refuses any nonempty database.
Use portable PHP 8.2/8.4, Node 24 and Playwright with installed Edge. The current
runner reuses `../gsx-2/node_modules/@playwright/test` as a development tool;
it is not a PHP deployment dependency. Both repositories must be present locally.

Set GSX_FICTIONAL_TEST=yes, GSX_FICTIONAL_MAIL to an absolute JSONL path outside
webroot, GSX_TEST_PHP to php.exe, GSX_TEST_PHP_EXT to its ext directory,
GSX_TEST_SESSION_DIR to an existing private test directory, GSX_TEST_BROWSER to
msedge.exe, and optionally GSX_TEST_SCREENSHOTS to an output directory outside
the repository. None may reference production/customer data.

1. `php -n -d extension_dir=EXT -d extension=php_mbstring.dll -d extension=php_pdo_mysql.dll tests/php/fixture.php`
2. `node tests/php/security.mjs`
3. Lint root and tests/php PHP files with `php -n -l FILE`; `node --check account-ui.js`.

The test runner starts and stops only a loopback PHP server, uses local mail, and
blocks browser requests outside loopback. Its test-only session clock is available
only through the test router; Apache denies the tests/php directory. It exercises
concurrent token consumption through independent CLI processes/DB connections.
Stop the separately started test database after the run.

## Remaining release gates

No launch approval implied. Need actual HostGator PHP/MySQL/Apache and session
storage acceptance, backup/restore rehearsal, mail/cron delivery/retry acceptance,
operator monitoring/retention, staff account-review UI and profile-claim processing,
and reviewed GSX canonical linking. Scope excludes MFA, invitations, uploads and
transaction work. No public Node/PostgreSQL service is required by this branch.
The full Next/Sanity site build was not run: no Next sources/dependencies changed,
and its live CMS must not be contacted. The existing draft PRs retain their
separate compatibility evidence and unresolved release gates.
