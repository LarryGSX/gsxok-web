# Staff/account review verification

Fictional local data only. PHP runtimes 8.2.35 and 8.4.27; MariaDB 10.11.18;
Node 24.22.2; installed Edge headless through existing Playwright.

| Check | Result |
| --- | --- |
| Expanded account/security/browser scenarios | 33 groups passed on each PHP runtime; no scenario failures |
| Both additive migrations | Passed; every original user column/hash, company row and legacy mapping preserved in the fictional fixture |
| Legacy password form tests | 3 passed, 0 failures/skips; rendered real React components plus JS/PHP Unicode/byte parity |
| Isolated changed-account TypeScript | Passed: `tsc -p tsconfig.account-review.json --noEmit` |
| Targeted flat-config lint | 0 errors, 3 pre-existing legacy effect warnings |
| PHP syntax | 45 files passed on PHP 8.2 and 8.4 |
| JavaScript/operator tool syntax | Passed |
| Full default website typecheck/lint | Blocked by cross-branch generated routes, installed Zod mismatch and default ESLint compatibility; not claimed as passed |

Logs: [PHP 8.2](staff-security-php82.log), [PHP 8.4](staff-security-php84.log),
[legacy forms](legacy-forms.log), [targeted lint](account-eslint.log).
The Node form-test runner emits a harmless module-type detection warning; no
application module type or dependency version was changed to silence it.

Security tests cover customer/anonymous/temporary-password/disabled staff denial,
CSRF/Origin/reauthentication/reasons, rollback-persistent throttling, stale access,
profile approval/rejection/duplicate/stale decisions, immutable audit, signed
directory receipt integrity/scope/expiry, missing verifier, canonical uniqueness,
explicit unlink, replay rejection and legacy/master preservation. The signer
reads a fictional snapshot produced by the real existing GSX export function;
the authoritative fictional directory and export checksum remain identical.

Desktop 1440x1000 and mobile 390x844 browser tests exercise customer login/logout
and staff login, actual account approval, profile approval, linked identity display,
audit history and logout. All have no script errors, external requests or horizontal
overflow. Staff approvals leave the fictional transaction status pending. The
signed receipt/link/unlink mutations are exercised through authenticated API tests.

| Staff screen | Desktop | Mobile |
| --- | --- | --- |
| Review entry/dashboard | [Desktop](desktop-staff.png) | [Mobile](mobile-staff.png) |
| Profile review | [Desktop](desktop-staff-profile.png) | [Mobile](mobile-staff-profile.png) |
| Customer identity link | [Desktop](desktop-staff-link.png) | [Mobile](mobile-staff-link.png) |

Screenshots contain only fictional accounts/IDs. No keys, source exports, real
customer details or private documents are committed.

Actual HostGator PHP/MySQL/Apache, HTTPS/session storage, trigger grants, mail/cron,
production keys and restoration remain release/test acceptance gates. No default
Next/Sanity build or hosted service calls were made. See the
[staff handoff and isolated HostGator test checklist](../php-staff-account-review.md).
