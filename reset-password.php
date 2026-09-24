<?php
/**
 * Consumes a password reset token (from forgot-password.php, or a
 * migrated legacy account's forced reset — see schema.sql's
 * password_reset_required status) and sets a new password.
 *
 * The token itself is the secret here, not an email address, so unlike
 * login.php/forgot-password.php this endpoint can safely say "invalid or
 * expired" outright — that reveals nothing about which accounts exist.
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

$token = isset($body['token']) && is_string($body['token']) ? trim($body['token']) : '';
$password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
$confirmPassword = isset($body['confirmPassword']) && is_string($body['confirmPassword']) ? $body['confirmPassword'] : '';

$errors = [];
if ($token === '') $errors[] = 'token';
if (mb_strlen($password) < GSX_PASSWORD_MIN) $errors[] = 'password';
if ($password !== $confirmPassword) $errors[] = 'confirmPassword';

if (!empty($errors)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields', 'fields' => $errors]);
}

$tokenHash = hash('sha256', $token);

$db = gsx_db();
$stmt = $db->prepare(
    'SELECT prt.id AS token_id, u.id AS user_id, u.account_status
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = :token_hash
       AND prt.used_at IS NULL
       AND prt.expires_at > NOW()'
);
$stmt->execute(['token_hash' => $tokenHash]);
$row = $stmt->fetch();

// Re-checked at consumption time, not just when the token was issued — an
// account can be suspended in between requesting a reset and clicking the
// emailed link.
$eligible = $row !== false && in_array($row['account_status'], ['active', 'password_reset_required'], true);

if (!$eligible) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_or_expired_token']);
}

$db->beginTransaction();
try {
    $db->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = :id')
        ->execute(['id' => $row['token_id']]);

    $db->prepare(
        "UPDATE users
         SET password_hash = :password_hash,
             account_status = IF(account_status = 'password_reset_required', 'active', account_status)
         WHERE id = :user_id"
    )->execute([
        'password_hash' => gsx_hash_password($password),
        'user_id' => $row['user_id'],
    ]);

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    throw $e;
}

gsx_json_response(200, ['ok' => true]);
