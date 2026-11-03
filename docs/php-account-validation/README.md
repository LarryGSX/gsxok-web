# Phase-one validation

Fictional local data only; no production connections or mail.

- PHP 8.2.35: all 20 security/browser scenario groups pass.
- PHP 8.4.27: all 20 security/browser scenario groups pass.
- MariaDB 10.11.18: additive migration preserves every original user column,
  password hash, original company row and legacy mapping in the fictional fixture.
- Concurrent password reset: two independent processes/connections, exactly one success.
- Queue failure/retry simulated locally; no external email sent.
- Desktop 1440x1000 and mobile 390x844: login, own-company dashboard and logout pass;
  no script errors, external requests or horizontal overflow.
- PHP syntax checks and JavaScript syntax checks pass; git diff --check passes.

The logs are security-php82.log/security-php84.log. Four PNGs are actual fictional
local captures of the entry and signed-in dashboard. HostGator Apache/MySQL 5.7,
production HTTPS/session storage, cron and real inbox delivery remain unverified.
The Node/Next/Sanity site build and GSX internal suites were not rerun because
neither implementation was changed. This is PHP/account verification only.
