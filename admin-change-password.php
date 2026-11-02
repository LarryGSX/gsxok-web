<?php
/**
 * Lets a signed-in admin set a new password. Required once, right after
 * the first sign-in with the temporary password they were given. Needs the
 * current password too, so a left-open browser can't be used to lock the
 * real person out.
 */

require_once __DIR__ . '/admin-security.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_admin_json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();

$admin = gsx_require_admin(true);

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);

if (!is_array($body)) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'invalid_request']);
}

$current = isset($body['currentPassword']) && is_string($body['currentPassword']) ? $body['currentPassword'] : '';
$new = isset($body['newPassword']) && is_string($body['newPassword']) ? $body['newPassword'] : '';
$confirm = isset($body['confirmPassword']) && is_string($body['confirmPassword']) ? $body['confirmPassword'] : '';

$errors = [];
if ($current === '') $errors[] = 'currentPassword';
if (mb_strlen($new) < GSX_ADMIN_PASSWORD_MIN) $errors[] = 'newPassword';
if ($new !== $confirm) $errors[] = 'confirmPassword';
if ($new === $current && $new !== '') $errors[] = 'newPassword';

if (!empty($errors)) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'invalid_fields', 'fields' => $errors]);
}

$db = gsx_db();
$stmt = $db->prepare('SELECT password_hash FROM admins WHERE id = :id');
$stmt->execute(['id' => $admin['id']]);
$row = $stmt->fetch();

if ($row === false || !gsx_verify_password($current, $row['password_hash'])) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'wrong_current_password']);
}

$db->prepare('UPDATE admins SET password_hash = :hash, must_change_password = 0 WHERE id = :id')
    ->execute(['hash' => gsx_hash_password($new), 'id' => $admin['id']]);

gsx_admin_audit((int) $admin['id'], 'admin_password_changed', null, null);

gsx_admin_json(200, ['ok' => true]);
