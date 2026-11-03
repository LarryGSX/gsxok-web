<?php
/**
 * The one sign-in for everybody. An email + password that belongs to a GSX
 * administrator opens an administrator session; one that belongs to a
 * customer opens a customer session. Nothing in the response says which,
 * or even whether the email exists: the same generic error comes back for
 * a wrong password, an unknown email, or a pending/suspended account, so
 * this endpoint can't be used to discover who has an account. Rate-limited
 * per email AND per IP (see portal-security.php) before any password is
 * checked.
 *
 * If an email is both an administrator and a customer, the administrator
 * password opens the administrator session and the customer password opens
 * the customer one.
 */

require_once __DIR__ . '/admin-security.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_json_response(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);

if (!is_array($body)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_request']);
}

$email = isset($body['email']) && is_string($body['email']) ? strtolower(trim($body['email'])) : '';
$password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';

if ($email === '' || $password === '') {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields']);
}

$ip = gsx_client_ip();

// Checked before touching the database with the submitted credentials at
// all — a locked-out identifier is rejected the same way regardless of
// whether the password would have been correct.
if (gsx_login_rate_limited($email, $ip)) {
    gsx_json_response(429, [
        'ok' => false,
        'error' => 'rate_limited',
        'message' => 'Too many attempts. Please wait a while before trying again.',
    ]);
}

$db = gsx_db();

// Administrator lookup. If the admin tables don't exist yet, treat it as
// "no such administrator" so customer sign-in keeps working.
try {
    $stmt = $db->prepare('SELECT id, password_hash, status, auth_version FROM admins WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $admin = $stmt->fetch();
} catch (Throwable $e) {
    error_log('[login] admin lookup failed: ' . $e->getMessage());
    $admin = false;
}

$stmt = $db->prepare('SELECT id, password_hash, account_status, account_access, email_verified_at, auth_version FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

// Both checks always run, so timing doesn't reveal which kind of account
// (if any) an email has.
$adminPasswordOk = gsx_verify_password($password, $admin['password_hash'] ?? null);
$customerPasswordOk = gsx_verify_password($password, $user['password_hash'] ?? null);

if ($admin !== false && $adminPasswordOk && $admin['status'] === 'active') {
    gsx_record_login_attempt($email, $ip, true);
    gsx_prune_login_attempts();

    gsx_bind_session($admin, true);

    gsx_admin_audit((int) $admin['id'], 'admin_login', null, null);

    gsx_json_response(200, ['ok' => true]);
}

if ($user !== false && $customerPasswordOk && $user['account_status'] !== 'suspended' && $user['account_access'] === 'approved' && $user['email_verified_at']) {
    gsx_record_login_attempt($email, $ip, true);
    gsx_prune_login_attempts();

    gsx_bind_session($user, false);

    gsx_json_response(200, ['ok' => true]);
}

gsx_record_login_attempt($email, $ip, false);
gsx_prune_login_attempts();

// One message covers every failure reason on purpose (see the file header).
gsx_json_response(401, [
    'ok' => false,
    'error' => 'invalid_credentials',
    'message' => "We couldn't log you in. Check your email and password — if your account is still pending approval, contact GSX.",
]);
