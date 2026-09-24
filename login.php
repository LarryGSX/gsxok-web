<?php
/**
 * Login endpoint. Deliberately generic on failure — the same error message
 * comes back whether the email doesn't exist, the password is wrong, or
 * the account is pending/suspended, so a visitor can never use this
 * endpoint to discover which email addresses have accounts, or their
 * status. Rate-limited per email AND per IP (see portal-security.php)
 * before the password is even checked.
 */

require_once __DIR__ . '/portal-security.php';

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
$stmt = $db->prepare('SELECT id, password_hash, account_status FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

$passwordOk = gsx_verify_password($password, $user['password_hash'] ?? null);
$statusOk = $user !== false && $user['account_status'] === 'active';

if ($user !== false && $passwordOk && $statusOk) {
    gsx_record_login_attempt($email, $ip, true);
    gsx_prune_login_attempts();

    gsx_regenerate_session();
    $_SESSION['user_id'] = (int) $user['id'];

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
