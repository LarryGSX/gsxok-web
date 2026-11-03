# Compatibility package preparation evidence

Application features are frozen at PR #3 source commit
`df16c07f724a6d4067c7363e9252a725bd6b1ca5`. Preparation adds only local packaging
tools, test-only isolation adapters, operator templates and documentation. No
customer-account feature source, production data or HostGator configuration changed.

Delivery: `hostgator-compat-2026-11-03-ready`, run `13af330d`.
The public archive has 30 account-only files, including its deny-all `.htaccess`.
The separate private operator kit contains SQL, private configuration templates,
capture-only worker, fictional seed and local-only receipt tools. No real secrets,
customer records, private signing keys, sending worker, Next/Sanity or transaction
components are shipped. Per-file and archive SHA-256 are in `MANIFEST.json`.

## Local checks

Twelve package-specific checks passed on PHP 8.2.35 and PHP 8.4.27 with an existing
loopback-only MariaDB 10.11.18 instance. All databases, users and records were new,
fictional and local. Evidence: [PHP 8.2](hostgator-compat-validation/php82.log),
[PHP 8.4](hostgator-compat-validation/php84.log).

1. Archive integrity, file allowlists, deny-all default and no delivery transport.
2. Fresh fictional schema and seed; nonempty reseed refusal.
3. Dedicated runtime role cannot execute DDL.
4. Production database name rejected before connection.
5. Unique Secure cookie/Path and authenticated HTTPS metadata guards.
6. Capture-only failure/due retry, subdirectory verification links and token replay.
7. Staff approval, customer login/isolation and unchanged transaction status.
8. Profile-overlay approval and fictional signed GSX linking; original companies intact.
9. Capture-only recovery invalidates sessions and retains account-only approval.
10. Non-test submitted/stored recipients block processing without a transport.
11. Dump/restore into a second empty test schema under the SAME account prefix:
    every table's row count/hash matches, audit triggers still reject mutation,
    credentials/legacy references survive, and old sessions cannot be reused.
12. Disable switch blocks endpoints; shipping artifacts remain unchanged by tests.

Packaged PHP syntax checks pass on both runtimes (24 executable PHP files plus
the two configuration examples). Node builder/rehearsal syntax checks pass.
The archive's PHP is derived from the pinned Git commit; the manifest records
each adapter rather than pretending it is a byte-identical production release.

Local HTTP tests deliberately simulate server TLS/auth metadata in a router kept
OUTSIDE the shipping kit. **Actual Apache/.htaccess/Basic Auth/certificate/HostGator
permissions were not tested.** No HostGator URL, database or credentials were used.
Initial local runs exposed OneDrive directory ReadOnly attributes and a test
client that did not preserve Host; these were fixed in disposable local fixtures,
not by weakening the package's guards. Earlier draft package folders are superseded.

## Reproduce preparation locally

From the website repository, using the existing Node 24 and sibling GSX 2.0's
existing `fflate` development dependency:

```text
node tools/package-hostgator-compat.mjs NEW_OUTPUT_DIRECTORY_OUTSIDE_CHECKOUT
```

An optional third argument selects an eight-hex-digit run ID for a controlled
rebuild. Output directory must be new. No upload/deployment command exists.

The rehearsal requires explicit `GSX_FICTIONAL_TEST=yes`, `GSX_TEST_PHP`,
`GSX_TEST_PHP_EXT`, `GSX_COMPAT_TEST_MYSQL` and `GSX_COMPAT_TEST_DUMP`. It accepts
only the existing local fixture database endpoint 127.0.0.1:53317 with fictional
root credentials, creates random `fict..._gsxcompat_RUN` / `_r1` schemas and
schema-only runtime users, and starts/stops a loopback PHP HTTP fixture. It does
not accept a HostGator or other remote target:

```text
node tests/php/compat-package.mjs PREPARED_PACKAGE_DIRECTORY
```

Run-specific private settings, simulated router, fictional database dump, sessions
and throwaway keys stay in `.tools/compat-rehearsal-*` outside Git and the package.
Stop the separately started local database after testing. These checks complement,
not replace, [the actual test procedure](hostgator-compatibility-test.md) and
[compatibility-only acceptance checklist](hostgator-compatibility-acceptance.md).

## Authorization needed next

Owner approval for the named isolated run and a usable existing cPanel session
with File Manager, phpMyAdmin/database-user management, Directory Privacy and
PHP CLI/Terminal access. The agent can resolve actual paths through that access;
the owner does not need to locate files manually. Approval must cover only new
test/private directories, fictional schema/user, test-only gate/configuration and
private backup/restoration. Confirm existing prepaid quotas permit them at zero
extra cost; otherwise stop with the exact limitation. No production, DNS, billing,
merge, live email or launch authorization is implied.
