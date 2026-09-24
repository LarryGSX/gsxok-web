<?php
/**
 * Contact form settings — HostGator static build.
 *
 * Safe to commit: nothing in this file is a credential. Field limits,
 * anti-spam thresholds, and the public "deliver to" address are not
 * secrets. Real mail credentials (if HostGator SMTP is ever configured
 * instead of mail(), see the report on this decision) belong in
 * contact-secrets.php instead — a file that is .gitignore'd, denied by
 * .htaccess, and only ever created directly on the server via FTP/File
 * Manager, never committed. See the optional-include block at the bottom
 * of this file.
 */

// Where submitted messages are delivered.
define('GSX_CONTACT_TO', 'contact@gsxok.com');

// Must be a real mailbox on the domain this site is hosted on. Using an
// address HostGator doesn't recognize as belonging to this domain is the
// single most common reason a contact form's mail() call silently never
// arrives (spam-foldered or dropped) even when mail() itself returns true.
// This is a public-facing address, not a secret — safe to commit.
define('GSX_CONTACT_FROM', 'GSX Website <contact@gsxok.com>');

// Set to true only after GSX_CONTACT_FROM above is confirmed to be a real,
// authorized mailbox for this domain on HostGator. While false, contact.php
// still runs every validation/anti-spam check for real, but responds with
// { ok: false, error: 'delivery_unavailable' } instead of attempting to
// send — the same honest "not connected yet" behavior as the Portal login
// page, rather than a silently-swallowed message.
define('GSX_MAIL_READY', false);

// ── Anti-spam thresholds — identical values to the Vercel version's
//    lib/contact/spamGuard.ts, so behavior matches exactly. ────────────────
define('GSX_RATE_LIMIT_WINDOW_SECONDS', 10 * 60); // 10 minutes
define('GSX_RATE_LIMIT_MAX', 5); // max submissions per IP per window
define('GSX_DUPLICATE_WINDOW_SECONDS', 5 * 60); // 5 minutes
define('GSX_MIN_SUBMIT_MS', 3000); // fastest a real visitor could plausibly submit

// ── Field limits — identical values to lib/contact/schema.ts. ──────────────
define('GSX_NAME_MAX', 100);
define('GSX_EMAIL_MAX', 254);
define('GSX_PHONE_MAX', 30);
define('GSX_COMPANY_MAX', 150);
define('GSX_MESSAGE_MAX', 2000);
define('GSX_HONEYPOT_MAX', 200);

define('GSX_CONTACT_REASONS', [
    'Retailer / Wholesale Inquiry',
    'Existing Retailer Support',
    'Product Concern or Feedback',
    'Business / Partnership Inquiry',
    'Website / Technical Issue',
    'Other',
]);

// Writable directory for rate-limit / duplicate-submission tracking. Must
// be writable by the PHP process (standard HostGator shared hosting
// permissions — 755 on the directory is normally sufficient). Kept out of
// the web root's directly-servable path via data/.htaccess.
define('GSX_DATA_DIR', __DIR__ . '/data');

// ── SMTP (optional upgrade path, off by default) ────────────────────────────
// Default: use PHP's built-in mail() — no credentials, works immediately,
// appropriate for an initial launch. If HostGator SMTP is later preferred
// for deliverability (see the report — authenticated SMTP generally lands
// in the inbox more reliably than bare mail()), create contact-secrets.php
// on the SERVER ONLY (never commit it — it's .gitignore'd) with:
//
//   <?php
//   define('GSX_SMTP_ENABLED', true);
//   define('GSX_SMTP_HOST', 'mail.gsxok.com');
//   define('GSX_SMTP_PORT', 587);
//   define('GSX_SMTP_USERNAME', 'contact@gsxok.com');
//   define('GSX_SMTP_PASSWORD', 'the real mailbox password');
//
// contact.php checks for this file and uses it automatically if present;
// with no such file, it falls back to mail() exactly as it does today.
define('GSX_SMTP_ENABLED', false);

$gsxSecretsFile = __DIR__ . '/contact-secrets.php';
if (is_file($gsxSecretsFile)) {
    require_once $gsxSecretsFile;
}
