<?php
/**
 * Approve, suspend, or reactivate a customer account. Administrators only.
 *
 * Allowed changes are limited to pending / active / suspended. An account
 * still waiting on its forced password reset (a migrated old account) can't
 * be changed here: it becomes active by itself once the customer sets a
 * password, and activating it earlier would leave an account with no
 * password at all.
 */

require_once __DIR__ . '/admin-security.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_admin_json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();

$admin = gsx_require_admin();

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);

if (!is_array($body)) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'invalid_request']);
}

$userId = isset($body['id']) && is_int($body['id']) ? $body['id'] : 0;
$newStatus = isset($body['status']) && is_string($body['status']) ? $body['status'] : '';

if ($userId <= 0 || !in_array($newStatus, ['pending', 'active', 'suspended'], true)) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'invalid_fields']);
}

$db = gsx_db();
$stmt = $db->prepare('SELECT email, first_name, account_status, password_hash FROM users WHERE id = :id');
$stmt->execute(['id' => $userId]);
$user = $stmt->fetch();

if ($user === false) {
    gsx_admin_json(404, ['ok' => false, 'error' => 'not_found']);
}

$oldStatus = $user['account_status'];

if ($oldStatus === 'password_reset_required') {
    gsx_admin_json(400, ['ok' => false, 'error' => 'awaiting_password_reset']);
}

if ($newStatus === 'active' && ($user['password_hash'] === null || $user['password_hash'] === '')) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'no_password_set']);
}

if ($oldStatus !== $newStatus) {
    $db->prepare('UPDATE users SET account_status = :status WHERE id = :id')
        ->execute(['status' => $newStatus, 'id' => $userId]);

    gsx_admin_audit((int) $admin['id'], 'customer_status_changed', $userId, $oldStatus . ' -> ' . $newStatus);
}

gsx_admin_json(200, ['ok' => true, 'status' => $newStatus]);
