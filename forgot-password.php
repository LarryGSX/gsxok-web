<?php
/**
 * "Forgot password?" request endpoint. Always responds with the same
 * generic success message regardless of whether the submitted email
 * belongs to an account — the same anti-enumeration principle as
 * login.php, applied here to a different question ("does this email have
 * an account?" instead of "is this the right password?").
 *
 * A real reset link is only ever generated for an account that can
 * actually use one (account_status 'active' or 'password_reset_required').
 * The raw token is emailed to the visitor and never stored — only its
 * SHA-256 hash lives in password_reset_tokens, so a database leak alone
 * can't be used to reset anyone's password.
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

// A malformed email is a client input error, not an account-existence
// signal — rejecting it here doesn't tell a visitor anything about who
// has an account.
if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields']);
}

$db = gsx_db();
$stmt = $db->prepare('SELECT id, account_status FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

$eligible = $user !== false && in_array($user['account_status'], ['active', 'password_reset_required'], true);

if ($eligible) {
    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);

    $insert = $db->prepare(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES (:user_id, :token_hash, NOW() + INTERVAL :lifetime_minutes MINUTE)'
    );
    $insert->execute([
        'user_id' => $user['id'],
        'token_hash' => $tokenHash,
        'lifetime_minutes' => GSX_RESET_TOKEN_LIFETIME_MINUTES,
    ]);

    if (GSX_PORTAL_MAIL_READY) {
        $resetLink = rtrim(GSX_SITE_BASE_URL, '/') . '/reset-password?token=' . $rawToken;
        $subject = 'Reset your GSX Portal password';
        $message = "A password reset was requested for this email address.\n\n"
            . "Reset your password: {$resetLink}\n\n"
            . 'This link expires in ' . GSX_RESET_TOKEN_LIFETIME_MINUTES . " minutes and can only be used once.\n\n"
            . "If you didn't request this, you can ignore this message.";
        $headers = 'From: ' . GSX_PORTAL_MAIL_FROM;

        // Best-effort — mail() failing here must never change the response
        // the visitor gets, or it becomes an account-existence oracle.
        @mail($email, $subject, $message, $headers);
    }
}

gsx_json_response(200, [
    'ok' => true,
    'message' => 'If an account exists for that email, a password reset link has been sent.',
]);
