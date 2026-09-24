<?php
/**
 * Shared security helpers for the portal backend — sessions, CSRF,
 * password hashing, and login rate limiting. Every portal-*.php endpoint
 * includes this file rather than reimplementing any of it.
 */

require_once __DIR__ . '/portal-config.php';
require_once __DIR__ . '/portal-db.php';

// ── Sessions ─────────────────────────────────────────────────────────────

/**
 * Starts (or resumes) a session with secure cookie flags. Must be called
 * before any output and before reading/writing $_SESSION.
 */
function gsx_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => GSX_SESSION_LIFETIME_SECONDS,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => GSX_SESSION_COOKIE_SAMESITE,
    ]);

    session_start();
}

/** Call immediately after a successful login — prevents session fixation. */
function gsx_regenerate_session(): void
{
    session_regenerate_id(true);
}

// ── CSRF ─────────────────────────────────────────────────────────────────
// The frontend is a separate static site, not a server-rendered PHP form,
// so classic hidden-input CSRF tokens don't apply. Instead: the session
// holds a random token, exposed to the frontend only via a JSON response
// (csrf-token.php) — never as a plain cookie, so a cross-site attacker
// page can trigger a request here but can never read the response body
// (blocked by same-origin policy) and so can never learn the token to
// send back. Every state-changing endpoint (register/login/forgot-
// password/reset-password) requires it as an X-CSRF-Token header.

function gsx_csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function gsx_require_csrf(): void
{
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';

    if ($header === '' || $expected === '' || !hash_equals($expected, $header)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'invalid_csrf_token']);
        exit;
    }
}

// ── Passwords ────────────────────────────────────────────────────────────

/** Argon2id where the PHP build supports it, bcrypt (cost 12) otherwise. Never MD5, never plaintext. */
function gsx_hash_password(string $password): string
{
    if (defined('PASSWORD_ARGON2ID')) {
        return password_hash($password, PASSWORD_ARGON2ID);
    }
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

function gsx_verify_password(string $password, ?string $hash): bool
{
    if ($hash === null || $hash === '') {
        // Still run password_verify() against a real (dummy) hash so a
        // login attempt against a nonexistent/unset-password account takes
        // roughly the same time as a real one — avoids a timing signal
        // that would otherwise reveal which emails have accounts.
        password_verify($password, '$2y$12$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxyz1234');
        return false;
    }
    return password_verify($password, $hash);
}

// ── Client identification ────────────────────────────────────────────────

function gsx_client_ip(): string
{
    $forwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null;
    if ($forwardedFor) {
        $parts = explode(',', $forwardedFor);
        return trim($parts[0]);
    }
    return $_SERVER['HTTP_X_REAL_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

// ── Login rate limiting / lockout ────────────────────────────────────────
// Checked against both the submitted email and the requester's IP —
// tripping either blocks further attempts on that axis, independent of
// whether the password would have been correct.

function gsx_login_rate_limited(string $email, string $ip): bool
{
    $db = gsx_db();

    // The window boundary is computed by MySQL itself (NOW() - INTERVAL),
    // not PHP's date()/time() — a shared host doesn't guarantee the web
    // server and database server agree on timezone, and comparing a
    // PHP-computed timestamp against MySQL's own CURRENT_TIMESTAMP columns
    // would silently drift if they don't.
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE succeeded = 0 AND attempted_at > (NOW() - INTERVAL :window_minutes MINUTE)
           AND (email = :email OR ip_address = :ip)'
    );
    $stmt->execute([
        'window_minutes' => GSX_LOGIN_WINDOW_MINUTES,
        'email' => $email,
        'ip' => $ip,
    ]);

    return (int) $stmt->fetchColumn() >= GSX_LOGIN_MAX_ATTEMPTS;
}

function gsx_record_login_attempt(string $email, string $ip, bool $succeeded): void
{
    $db = gsx_db();
    $stmt = $db->prepare(
        'INSERT INTO login_attempts (email, ip_address, succeeded) VALUES (:email, :ip, :succeeded)'
    );
    $stmt->execute(['email' => $email, 'ip' => $ip, 'succeeded' => $succeeded ? 1 : 0]);
}

/** Opportunistic cleanup — called at the end of the login endpoint so the table doesn't grow forever. */
function gsx_prune_login_attempts(): void
{
    $db = gsx_db();
    // Keep a week of history regardless of the (much shorter) rate-limit
    // window, in case it's ever useful for reviewing abuse patterns. Cutoff
    // computed by MySQL itself for the same reason as gsx_login_rate_limited().
    $db->query('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 7 DAY)');
}

// ── JSON response helper ─────────────────────────────────────────────────

function gsx_json_response(int $status, array $body): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($body);
    exit;
}
