<?php
/**
 * Portal backend settings — HostGator MySQL build.
 *
 * Safe to commit: no credentials live here. Real database credentials go
 * in portal-secrets.php instead — a file that is .gitignore'd, denied by
 * .htaccess, and only ever created directly on the server via FTP/File
 * Manager, never committed. Same pattern already used for
 * contact-config.php / contact-secrets.php.
 *
 * Do NOT point local development at the live HostGator database — the
 * secrets file on your local test machine should hold a local MySQL
 * database's credentials (e.g. one created in XAMPP), never the live one.
 */

// ── Database (defaults are placeholders — real values come from
//    portal-secrets.php, which does not exist yet on a fresh checkout) ──
define('GSX_DB_HOST', 'localhost');
define('GSX_DB_NAME', 'gsx_portal');
define('GSX_DB_USER', '');
define('GSX_DB_PASS', '');

// ── Session / cookie security ────────────────────────────────────────────
// 'Lax' allows normal same-site navigation (e.g. following a password
// reset link from an email) while still blocking cross-site POST forgery.
define('GSX_SESSION_COOKIE_SAMESITE', 'Lax');
define('GSX_SESSION_LIFETIME_SECONDS', 60 * 60 * 8); // 8 hours

// ── Login rate limiting / lockout ────────────────────────────────────────
// Checked per-email AND per-IP (see login_attempts table) — either one
// tripping the threshold blocks further attempts on that axis.
define('GSX_LOGIN_MAX_ATTEMPTS', 5);
define('GSX_LOGIN_WINDOW_MINUTES', 15);

// ── Password reset tokens ────────────────────────────────────────────────
define('GSX_RESET_TOKEN_LIFETIME_MINUTES', 60);

// The reset link emailed to a visitor is built from this constant, never
// from the request's Host header — a request's Host header can be
// spoofed by the sender, and building an emailed link from it is a known
// attack (a poisoned link that looks like a real reset email but points
// to an attacker's domain). Update this to the real live domain before
// going live; it deliberately does not fall back to $_SERVER.
define('GSX_SITE_BASE_URL', 'https://www.gsxok.com');

// Same "not connected yet" honesty pattern as contact.php's GSX_MAIL_READY.
// While false, forgot-password.php still creates and stores a real reset
// token for an eligible account, but does not attempt to email it — every
// request still gets the same generic success response either way, so
// nothing about account existence leaks either way. Set to true only once
// GSX_CONTACT_FROM (or a dedicated portal address) is confirmed to be a
// real, authorized mailbox for this domain on HostGator.
define('GSX_PORTAL_MAIL_READY', false);
define('GSX_PORTAL_MAIL_FROM', 'GSX Portal <contact@gsxok.com>');

// ── Registration reasons ─────────────────────────────────────────────────
// New accounts require admin approval before they can log in — matches
// the legacy system's 'Pending' status, and the real spam-bot signups
// found in the legacy data (see the completion report) confirm this gate
// is load-bearing, not just theoretical.
define('GSX_NEW_ACCOUNTS_REQUIRE_APPROVAL', true);

// ── Field limits — identical shape to the Portal registration form. ─────
define('GSX_NAME_MAX', 255);
define('GSX_ADDRESS_MAX', 255);
define('GSX_CITY_MAX', 255);
define('GSX_STATE_LEN', 2);
define('GSX_ZIP_MAX', 10);
define('GSX_LICENSE_MAX', 255);
define('GSX_EMAIL_MAX', 255);
define('GSX_PHONE_MAX', 30);
define('GSX_PASSWORD_MIN', 8);

$gsxPortalSecretsFile = __DIR__ . '/portal-secrets.php';
if (is_file($gsxPortalSecretsFile)) {
    require_once $gsxPortalSecretsFile;
}
