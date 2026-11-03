# Staff account review and GSX identity linking

Continuation of [the PHP account foundation](php-customer-accounts.md), on the
same `codex/php-customer-account-security` branch and [draft PR #3](https://github.com/LarryGSX/gsxok-web/pull/3).
GSX PR #8 and website PR #2 remain untouched. No production data, deployments,
hosting configuration, subscriptions or internal GSX code were changed.

## Delivered behavior

Staff use `/staff-accounts.php` with the existing PHP administrator login. The
screen lists customer verification/access, profile claims, company legacy
references, current GSX UUID links and paginated audit history. Each decision
requires a reason and the current staff password, cleared after submission.
Customers, anonymous sessions, disabled staff and staff still using a temporary
password cannot use the review API. Sensitive GETs are no-store; mutations require
Origin/JSON/CSRF, persisted throttles and fresh staff/version checks under a row lock.
Failed reauthentication attempts commit before the decision transaction so a
rollback cannot erase the throttle record.

Account access is separate from existing transaction status. Approving an account
does not modify `users.account_status`, pricing or any transaction table. UI/API
capabilities remain `transactions:false`. Suspending/reapproving access invalidates
prior sessions. Stale account versions return 409.

Profile approval appends a decision against the immutable submitted claim. The
latest approved claim is displayed as the **account profile overlay**; original
company rows and canonical GSX records are never rewritten. The reviewer sees the
current approved account profile (or original baseline) alongside the proposal.
Requests based on an older approved revision cannot overwrite a newer revision;
they can be rejected with a reason. A reviewed request cannot be decided twice.
This is approval for the portal display, not automatic acceptance into the GSX
customer master. Any master changes still use the existing internal GSX workflow.

Legacy customer registration, reset and staff password forms now share the PHP
policy: 12 Unicode characters minimum, at most 72 UTF-8 bytes, no NUL, whitespace
preserved. Existing-password login has no new client minimum. Registration success
uses generic email/approval guidance. Staff password changes return to sign-in.

## Linking without another customer directory or hosted API

An exact canonical GSX customer UUID is linked to an existing portal company only
after staff reauthentication and review of a signed **single-record receipt**.
No names, emails or license suffixes are used to infer identity.

1. A trusted GSX operator uses an existing fresh `gsx2-logical-v1` business export
   from the normal internal GSX export process. No recovery/discovery is repeated.
2. The offline Node tool verifies the existing export/table checksums and that the
   exact UUID occurs once in `public.order_customers`. It signs a 15-minute receipt
   bound to the portal origin, account ID, company ID and both existing legacy IDs.
3. PHP verifies with a fixed server-side public key, checks the scope/expiry and
   consumes the receipt once. The private key and full export stay off HostGator.
4. Only the UUID reference, version, source checksum and reviewer history are
   stored. Another company cannot claim the same UUID. Reassignment requires an
   explicit unlink decision followed by a fresh receipt and link decision.

This proves existence in the operator-reviewed snapshot, not a live lookup,
current license status, customer eligibility or transaction permission. Export
checksums detect corruption; they do not authenticate an untrusted export. The
signing-key holder must verify its trusted GSX provenance. The CLI rejects files
older than 24 hours by modification time, which is a practical guard, not a
cryptographic timestamp. Stale source data requires a fresh normal GSX export.
Deleting/deactivating a GSX customer later is not automatically pushed to PHP;
staff must review and revoke the reference. The portal grants no transaction
privileges based on that reference.

No second authoritative directory is persisted or imported. Node runs only as a
local operator tool; HostGator still needs only PHP/MySQL and OpenSSL. Missing
verification configuration returns 503 and leaves the identity unlinked.

### Offline signer command

Generate/secure a dedicated RSA signing key of at least 3072 bits in the internal
operator environment after approval. Do not reuse web/TLS/mail keys. Keep both
export and private key outside the website checkout and Git. Use the tool privately:

```text
node tools/gsx-customer-receipt.mjs --export PRIVATE_EXPORT_PATH --private-key PRIVATE_KEY_PATH --customer EXACT_GSX_UUID --account PORTAL_ACCOUNT_ID --company PORTAL_COMPANY_ID --legacy-user LEGACY_ACCOUNT_ID_OR_null --legacy-company LEGACY_COMPANY_ID_OR_null --audience https://www.gsxok.com
```

The tool writes only a receipt to stdout; do not put receipts in public links,
Git, logs or shared documents. No source export is uploaded to the website.
Install only the public verification key outside the document root and define
`GSX_DIRECTORY_PUBLIC_KEY_FILE` in the existing private portal secrets file.
Key rotation invalidates pending receipts; existing references/history remain.
Approve key custody, access/backup and rotation before real linking. Tests generate
throwaway fictional keys outside the checkout. No production key was provisioned.

## Migration and API continuation

Apply `account-migration-002.sql` once after 001 in an approved isolated schema.
It adds immutable profile decisions, per-company UUID/version references, consumed
receipt digests, link history, audit details and profile base revisions. Triggers
reject UPDATE/DELETE on audit, claims, decisions and link history. Runtime roles
must not have DDL/TRUNCATE privileges; these triggers do not constrain a DBA.
Existing accounts, password hashes, company rows, legacy IDs and original timestamps
are preserved in the fictional migration rehearsal. MySQL DDL is not atomic;
backup/restore and partial-migration recovery must be reviewed before a real run.

| Endpoint | Contract |
| --- | --- |
| GET staff-account-api.php | `resource=accounts/profiles/companies/history`, `page=1..10000`, 25 rows/page; companies/history also require `accountId` |
| POST admin-account-access.php | Existing endpoint now requires `id,access,currentPassword,reason`; optional `expectedVersion` (staff UI always sends it); no transaction changes |
| POST staff-account-api.php | Profile: `action=profile-review,requestId,decision=approved/rejected,currentPassword,reason` |
| POST staff-account-api.php | Link: `action=link,companyId,expectedVersion,customerId,receipt,currentPassword,reason` |
| POST staff-account-api.php | Revoke link: `action=unlink,companyId,expectedVersion,currentPassword,reason` |
| GET/POST account-api.php | Own-company display now overlays approved claims and returns `profileVersion`; profile submissions can supply it to reject stale edits |

Decision success 200; malformed input/missing reason 400; missing identity 401;
CSRF/Origin/reauth/password-change restriction 403; absent record 404; duplicate,
stale, existing or conflicting link/review 409; throttle 429; missing directory
verification 503. Reasons must be 8–1000 characters. Audit JSON records staff actor,
target, previous/new access or UUID/version, reason and source hash as applicable.
Passwords and complete receipts are never written to audit/history.

## Validation and reproduction

Use the [phase-one test setup](php-customer-accounts.md#reproduce-fictional-tests).
Additionally enable `php_openssl.dll` on Windows (OpenSSL extension on Linux), set
`GSX_TEST_DIRECTORY_DIR` to a private local directory outside webroot and
`GSX_TEST_DIRECTORY_PUBLIC_KEY` to `fictional-public.pem` inside that directory.
The fixture now applies both additive migrations. To deliberately recreate only
the fixed disposable `gsx_account_fictional` schema's tables, pass
`--reset-fictional` to `tests/php/fixture.php`. It never touches another schema.

Run `node tests/php/security.mjs`, then `node --test tests/php/legacy-forms.test.mjs`.
The latter uses existing installed TypeScript/React to render the actual legacy
password components and compares JS/PHP byte/Unicode policies. No CMS or external
API is involved. Typecheck with `tsc -p tsconfig.account-review.json --noEmit`;
lint the changed TSX/policy files using `--config tests/php/eslint.account-review.mjs`.

See [current test logs and desktop/mobile screenshots](php-staff-validation/README.md).
Full default website typecheck/lint are not claimed to pass: the shared installed
dependencies/generated `.next` files belong to the separate newer website branch,
causing missing routes/Zod errors and default ESLint configuration mismatch. The
isolated account typecheck passes. Its flat lint configuration retains three
pre-existing legacy effect warnings, matching the separate website review policy;
transaction UI is not rewritten to clear those diagnostics. A matching isolated
website dependency/build environment is still required before shipping rebuilt
legacy forms. No dependency version or either existing draft PR was changed here.

## Before a safe HostGator test

Obtain approval for a protected, isolated test directory/schema with fictional
accounts only; do not overwrite production login files. Preserve private file/DB
backups and rehearse restoration. Verify PHP 8.2+ PDO MySQL/mbstring/OpenSSL,
actual MySQL syntax/trigger privileges, Apache protections, HTTPS/session storage
and approved base URL. Use a public key for fictional receipts and a test mail sink
or disabled mail, not real customers or production senders. Exclude test tools,
exports, private keys, SQL and unrelated source files from publicly served content.

Before launch, separately verify existing mail/cron delivery and retry monitoring,
key custody, staff access/recovery, retention, the canonical-link review process,
and the rebuilt older forms in a matching website environment. No new services,
Node hosting, PostgreSQL hosting or additional recurring fees are required.
