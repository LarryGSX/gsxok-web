<?php
/**
 * Shared security helpers for the portal backend — sessions, CSRF,
 * password hashing, and login rate limiting. Every portal-*.php endpoint
 * includes this file rather than reimplementing any of it.
 */

require_once __DIR__ . '/portal-config.php';
require_once __DIR__ . '/portal-db.php';
if (PHP_SAPI !== 'cli') {
    ini_set('display_errors', '0');
    set_exception_handler(function (Throwable $error): void {
        error_log('[portal] request failed ('.get_class($error).')');
        gsx_json_response(500, ['ok'=>false,'error'=>'temporarily_unavailable']);
    });
}

// Same value as portal-config.php. Repeated as a fallback because the
// portal-config.php that was already on the server before the per-IP limit
// existed does not define it, and without it every login (customer and
// administrator) stops with an "Undefined constant" error.
defined('GSX_LOGIN_MAX_ATTEMPTS_PER_IP') || define('GSX_LOGIN_MAX_ATTEMPTS_PER_IP', 20);

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

    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $local = defined('GSX_LOCAL_TEST') && GSX_LOCAL_TEST && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1','::1'], true);
    if (!$isHttps && !$local) gsx_json_response(400, ['ok'=>false,'error'=>'https_required']);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name($local ? 'gsx_account_local' : '__Host-gsx-account');

    session_set_cookie_params([
        'lifetime' => GSX_SESSION_LIFETIME_SECONDS,
        'path' => '/',
        'secure' => !$local,
        'httponly' => true,
        'samesite' => GSX_SESSION_COOKIE_SAMESITE,
    ]);

    session_start();
    header('Cache-Control: no-store');
    if (isset($_SESSION['user_id']) || isset($_SESSION['admin_id'])) {
        $now=time(); $admin=isset($_SESSION['admin_id']);
        $table=$admin?'admins':'users'; $id=$_SESSION[$admin?'admin_id':'user_id'];
        $q=gsx_db()->prepare('SELECT * FROM '.$table.' WHERE id=?'); $q->execute([$id]); $row=$q->fetch();
        $active=$row && ($admin ? $row['status']==='active' : ($row['account_access']==='approved' && $row['account_status']!=='suspended' && $row['email_verified_at']));
        if (!$active || !isset($_SESSION['auth_version'],$_SESSION['issued_at'],$_SESSION['last_seen'])
            || (int)$row['auth_version'] !== (int)$_SESSION['auth_version']
            || $now-(int)$_SESSION['issued_at']>=GSX_SESSION_LIFETIME_SECONDS
            || $now-(int)$_SESSION['last_seen']>=1800) {
            $_SESSION=[]; session_regenerate_id(true);
        } else $_SESSION['last_seen']=$now;
    }
}

function gsx_bind_session(array $row, bool $admin): void {
    $_SESSION=[]; gsx_regenerate_session();
    $_SESSION[$admin?'admin_id':'user_id']=(int)$row['id'];
    $_SESSION['auth_version']=(int)$row['auth_version'];
    $_SESSION['issued_at']=$_SESSION['last_seen']=time();
    if ($admin) $_SESSION['admin_last_seen']=time();
}
function gsx_valid_password(string $password): bool {
    // A byte bound avoids bcrypt silently truncating at 72 bytes on fallback.
    return !str_contains($password,"\0") && mb_strlen($password)>=12 && strlen($password)<=72;
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
    $expectedOrigin=rtrim(GSX_SITE_BASE_URL,'/');
    $origins=[$expectedOrigin];
    if (in_array($expectedOrigin,['https://gsxok.com','https://www.gsxok.com'],true)) $origins=['https://gsxok.com','https://www.gsxok.com'];
    if (!in_array($_SERVER['HTTP_ORIGIN']??'',$origins,true)) {
        gsx_json_response(403,['ok'=>false,'error'=>'invalid_origin']);
    }
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>16384) gsx_json_response(413,['ok'=>false,'error'=>'request_too_large']);
    if (stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0) gsx_json_response(415,['ok'=>false,'error'=>'invalid_content_type']);
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
    if (strlen($password)>72 || str_contains($password,"\0")) return false;
    if ($hash === null || $hash === '') {
        // Still run password_verify() against a real (dummy) hash so a
        // login attempt against a nonexistent/unset-password account takes
        // roughly the same time as a real one — avoids a timing signal
        // that would otherwise reveal which emails have accounts.
        password_verify($password, '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        return false;
    }
    return password_verify($password, $hash);
}

// ── Client identification ────────────────────────────────────────────────

function gsx_client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

// ── Login rate limiting / lockout ────────────────────────────────────────
// Checked against both the submitted email and the requester's IP —
// tripping either limit blocks further attempts, independent of whether
// the password would have been correct.

function gsx_login_rate_limited(string $email, string $ip): bool
{
    $db = gsx_db();

    // The window boundary is computed by MySQL itself (NOW() - INTERVAL),
    // not PHP's date()/time() — a shared host doesn't guarantee the web
    // server and database server agree on timezone, and comparing a
    // PHP-computed timestamp against MySQL's own CURRENT_TIMESTAMP columns
    // would silently drift if they don't.
    //
    // Two separate limits: a low one per email (stops password guessing on
    // one account) and a higher one per IP (stops one machine cycling through
    // many emails) — high enough that several staff sharing one store
    // connection can't lock each other out by mistyping.
    $stmt = $db->prepare(
        'SELECT COALESCE(SUM(email = :email_a), 0) AS by_email, COALESCE(SUM(ip_address = :ip_a), 0) AS by_ip
         FROM login_attempts
         WHERE succeeded = 0 AND attempted_at > (NOW() - INTERVAL :window_minutes MINUTE)
           AND (email = :email_b OR ip_address = :ip_b)'
    );
    $stmt->execute([
        'window_minutes' => GSX_LOGIN_WINDOW_MINUTES,
        'email_a' => $email,
        'email_b' => $email,
        'ip_a' => $ip,
        'ip_b' => $ip,
    ]);
    $row = $stmt->fetch();

    return (int) $row['by_email'] >= GSX_LOGIN_MAX_ATTEMPTS || (int) $row['by_ip'] >= GSX_LOGIN_MAX_ATTEMPTS_PER_IP;
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
