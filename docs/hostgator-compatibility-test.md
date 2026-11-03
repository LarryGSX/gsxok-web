# Isolated HostGator compatibility test — installation and restoration

**Preparation only. No upload, database execution, DNS change, mail delivery or
production launch is authorized.** This kit uses prepaid hosting only. If the
existing plan cannot provide a separate directory, schema, user, private storage
and CLI execution without a charge, stop and report the exact limit.

Source is reviewed PR #3 commit `__COMMIT__`. Test run `__RUN__` uses only
`/gsx-account-compat-__RUN__/` on one existing HTTPS hostname. No subdomain/DNS,
Node server, PostgreSQL, new email provider or background service is needed.

## Package and private layout

- `public-upload.zip`: only the account PHP endpoints, account/staff UI, local
  fonts and isolation adapters. Default `.htaccess` denies all requests.
- `private-operator-kit.zip`: private bootstrap/settings template, capture-only
  CLI worker, fictional seeder, SQL, local-only receipt tools and these instructions.
- `MANIFEST.json`: source provenance, each file's SHA-256 and ZIP hashes. Verify
  it locally before upload. No passwords, live exports, private keys or test
  captures are shipped. Neither ZIP is a production release.

**Never extract the whole kit or private ZIP under public_html.** After approval,
resolve exact paths through cPanel (the existing document root remains unchanged):

```text
/home/CPANEL/public_html/gsx-account-compat-__RUN__/   contents of public-upload.zip
/home/CPANEL/gsx-compat-__RUN__/                      contents of private/ only
  bootstrap.php, capture-worker.php, seed-fictional.php
  settings.php                 private copy of settings.php.example
  fixture-password.txt         newly chosen fictional account password
  directory-public.pem         fictional verification PUBLIC key only
  sessions/                    private, new, never shared/restored
  captures/mail.jsonl           verification/reset links; private tokens
  logs/php-error.log            private test errors
/home/CPANEL/gsx-compat-backups/__RUN__/              private test backups
/CPANEL-GENERATED-PRIVATE-GATE-PATH                  test-only htpasswd file
```

These are path templates, not a claim that the live home is `/home/CPANEL`.
Private files must be outside the actual document root and readable only by the
account's PHP/CLI owner: directories 0700, private files 0600 where supported;
public files 0644 and directories 0755 subject to existing host ownership rules.
Never grant 0777. No private-key, email or database credentials go into Git.
The Basic Auth password file is separate: use cPanel Directory Privacy's exact
private path and host-managed Apache-readable ownership/permissions. Apache may
run as a different user from PHP. Do not relax the 0700 application-private
directory so Apache can read a password file placed there; use the generated gate
location instead. The template deliberately contains a path placeholder.

## Exact prerequisites

| Area | Requirement |
| --- | --- |
| PHP web and CLI | PHP 8.2+; same compatible extensions/configuration for both |
| Extensions | PDO + pdo_mysql/mysqlnd; mbstring; session; OpenSSL for signed receipts; standard JSON, hash, filter, random and password APIs |
| Password hashing | Existing Argon2id when supported, otherwise bcrypt; no additional extension/service required |
| Filesystem | PHP can include the private sibling directory (open_basedir permits it); private logs/captures/sessions writable; sessions auto_start=0 |
| HTTPS | Existing valid certificate; actual PHP `HTTPS` reports on; forwarded headers are not accepted as proof |
| MySQL | InnoDB and reviewed MySQL 5.7-compatible SQL; native PDO prepares; transactions, row locks, GET_LOCK/RELEASE_LOCK and SIGNAL triggers |
| Install identity | Permissions only on NEW fictional schema: CREATE, ALTER, INDEX, REFERENCES, TRIGGER, SELECT, INSERT, UPDATE; DROP only for an explicitly approved test restoration/cleanup |
| Runtime identity | NEW dedicated `CPANEL_gctNN` user, SELECT/INSERT/UPDATE/DELETE only on `CPANEL_gsxcompat___RUN__`; no production/global grants, DDL, DROP, TRIGGER, GRANT OPTION, FILE or administrative privileges |
| Backup identity | Schema SELECT/SHOW VIEW/TRIGGER as needed by chosen dump/export tool; RELOAD/PROCESS/global grants are not required by the plan |
| Apache | Apache 2.4; mod_auth_basic, mod_authn_file, mod_authz_user/core and mod_dir; mod_rewrite to disable inherited rewriting; .htaccess overrides for AuthConfig, FileInfo, Indexes and Options |
| Session | save_handler=files, empty cookie_domain, this run's private save_path, cookie `__Secure-gsx-compat-__RUN__`, Secure/HttpOnly/Lax, exact test-directory Path; 8-hour absolute / 30-minute idle application expiry |
| Operator execution | Existing cPanel Terminal/SSH or equivalent authorized PHP CLI access for seeding/capture; manual worker runs only, no cron added |

No Composer, PHP mail transport, SMTP credentials, curl, sockets API, ZIP extension
or HostGator Node runtime is required. SQL/ZIP handling can use existing cPanel /
phpMyAdmin. Shared hosting may limit per-directory Apache directives/trigger
grants; inability is a failed prerequisite, not permission to alter global hosting.
Runtime named locks need ordinary connection access, not a global database grant.
Confirm web/CLI clocks agree within 30 seconds for short-lived signed receipts.

## Reversible installation — only after explicit test authorization

1. Record approved exact hostname, document root, test/private/backup paths,
   database and both installer/runtime users. Verify paths are new and schema/user
   unused. Save the current public website's read-only status/hash baseline; do
   not authenticate with real customers or edit any existing root file.
2. Create only the new test directory, private directories, schema and dedicated
   runtime user. Inspect its grants: **only the fictional schema**. Create separate
   Basic Auth credentials through existing Directory Privacy/htpasswd tooling,
   scoped exclusively to this directory. Confirm it will not edit a parent gate.
3. Upload only the public ZIP's contents to the approved test directory while its
   deny-all `.htaccess` remains in place. Put only `private/` contents outside the
   document root. Keep `install/`, `local-tools/` and docs local/private.
4. In phpMyAdmin explicitly select the NEW fictional schema; run SQL in order:
   `00-guard.sql`, `01-schema.sql`, `02-admin-setup.sql`,
   `03-account-migration-001.sql`, `04-account-migration-002.sql`.
   These are fresh-schema scripts, not production upgrades. On any error stop;
   do not rerun or work around it in the live portal. Verify marker run/commit.
5. Copy private `settings.php.example` to `settings.php`; set exact local DB
   host/port/name/dedicated credentials, public-directory absolute path and HTTPS
   origin **without path/trailing slash**. Enable only this fictional run. Create
   a private 12+ character, <=72 UTF-8 byte fixture password file. Create public
   `compat-location.php` from its example, containing only the private path.
6. Using the selected PHP 8.2+ CLI binary, run the private `seed-fictional.php`
   once. It refuses a nonempty application schema. It creates customers A/B and
   one reviewer, all under `@gsx-test.invalid`, fake licenses/legacy IDs, no
   transaction privileges. Keep the password file out of webroot and logs.
7. Replace **only this directory's** deny-all `.htaccess` with the provided Basic
   Auth template, setting its private htpasswd path. Check anonymous 401/403,
   private-helper/file denial, no directory listing, correct PHP handling and
   inherited root rewrites. A 500 is a stop condition; restore the deny-all file,
   inspect private errors, do not alter the website's root Apache/PHP settings.
8. Use a fresh browser profile with no production login cookies. Start the
   acceptance checklist. Do not copy real users, old SQL exports, real company
   documents or production settings into this schema.
9. Export a private fictional baseline including structure/data/triggers/marker;
   archive the test public/private configuration separately, excluding sessions.
   Record SHA-256 and package manifest. Store credentials/captures as sensitive
   private artifacts. This is a test backup, never a production backup replacement.

## Capture-only email exercise

The package **omits the sending worker**. Its private capture adapter preserves
queue/attempt/token behavior but contains no mail()/SMTP/HTTP transport. A
constant cannot enable delivery. Private bootstrap forces mail-ready=false,
rejects nonfictional account rows and nonfictional submitted account/profile
emails, and checks the schema namespace + run/commit marker before application
use. The worker preflights the same guard before doing any queue work.

1. Request resend verification for `customer-a@gsx-test.invalid`. Confirm a queue
   row appears; no message leaves the server.
2. Run `PHP_BINARY -d disable_functions=mail PRIVATE/capture-worker.php --simulate-failure`.
   Confirm pending row, attempts increment and next attempt ~5 minutes later.
3. Wait until due; run the same command without `--simulate-failure`. Read the
   link from private `captures/mail.jsonl`, never a public URL. Confirm sent_at and
   a hashed token. Use the link under the protected test path, then verify replay
   fails. Approve A with the fictional reviewer; test login and password recovery.
4. Try submitting a non-test email: blocked. In the local rehearsal an injected
   nonfictional fixture row also blocks the entire worker; no transport exists.

`disable_functions=mail` is a CLI-only extra precaution; no global or per-directory
PHP setting change is required. Never create an HTTP worker/debug endpoint, cron,
forwarding rule, SMTP grant or Google Workspace change. This tests queue durability
and capture/retry, **not** actual mail/inbox delivery or production readiness.

## Fictional GSX linking

Run `local-tools/prepare-fictional-directory.mjs NEW_PRIVATE_LOCAL_FOLDER` on the
existing local Node runtime. It creates a fresh **synthetic** export and throwaway
keys. After approval copy only `directory-public.pem` to the private test folder.
Keep the private key local. Mint fresh receipts using the included existing
`gsx-customer-receipt.mjs` tool: canonical A UUID
`11111111-1111-4111-8111-111111111111`, account/company 1, legacy 9001/9101;
B uses `22222222-2222-4222-8222-222222222222`, account/company 2, legacy 9002/9102.
Audience is the configured HTTPS origin. Receipts expire after 15 minutes; none
are shipped pre-minted. No live GSX database/export/customer record is involved.

## Conflicts and limitations to check

- No root login/admin/legacy file is overwritten; package excludes ordering,
  pricing, old admin/order endpoints, Next/Sanity/Prisma and old portal folders.
- Cookie name, Path and session storage differ from the root portal and PHPSESSID.
  Production cookies may still be sent by the browser, but the kit never reads
  them. MySQL named mutexes also have run-specific names to avoid cross-schema
  contention with a live worker or login-request limiter.
- PHP session names do not depend on the database, so separate schemas alone
  would not have prevented cookie collisions; this kit adapts them explicitly.
- Parent .htaccess redirects, access control, inherited PHP versions/open_basedir,
  resource limits and account-wide logs remain potential shared-host conflicts.
  Do not change global settings to pass the test. Use actual errors as evidence.
- A subdirectory is **not a separate browser origin**. Basic Auth is a gate, not
  an origin sandbox. Use only fictional data and a separate browser profile; no
  production customer/staff sessions in that profile. This layout is for an
  isolated compatibility exercise, not a production security endorsement.
- Package-only changes are guard loading, private configuration, unique cookies /
  paths / mutexes, subdirectory links, fictional-email enforcement and capture
  transport. The manifest identifies each adapted source file. Compatibility
  results do not replace testing a separately approved production configuration.

## Disable, restore or remove — exact test scope only

**Immediate stop:** put back the shipped deny-all `.htaccess` and set private
enabled=false. Stop manual workers; no cron should exist. Preserve sanitized
failure evidence. Existing website settings and databases stay untouched.

**Restore a test baseline:** keep access blocked; export the current fictional
schema for evidence. Restore the baseline into a NEW empty
`CPANEL_gsxcompat___RUN___r1` schema with the SAME existing cPanel account prefix
and a distinct dedicated test user such as `CPANEL_gct02` (or, only if explicitly
approved, recreate the exact disposable schema). Verify marker/commit, table
counts, checksums and triggers before pointing PRIVATE settings at it. Restore
only matching public/private test files. Archive the old private `sessions/` for
controlled disposal and recreate `sessions/` empty; never restore session
files/cookies. Preserve captures privately or start a new
capture file. Rotate the test gate/fixture credentials if needed. Re-run denial,
fictional login, queue and audit checks before reopening this directory.

**Full removal:** first block access and retain approved private test evidence.
Resolve and check the exact absolute paths and database marker against this run's
manifest. Remove only that test directory/private run and the verified disposable
schema. Remove its dedicated DB user only after verifying it has no other grants.
Do not drop a similarly named production database or restore a test dump over it.
No DNS, parent .htaccess, real accounts, legacy files or production backups change.
Compare the original read-only website baseline afterward. Clear the disposable
browser profile. Owner approval is required before deleting retained evidence.
