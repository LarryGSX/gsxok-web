<?php
/**
 * Approve, suspend, or reactivate a customer account. Administrators only.
 *
 * An account can only become active with a pricing tier ('old' = Old /
 * Grandfathered, 'new' = New / Standard) on file. Approving a pending account
 * must say which one in the same request (pricingTier); reactivating an
 * account that already has one keeps it. A tier is never defaulted or guessed.
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

$pricingTier = $body['pricingTier'] ?? null;

if (
    $userId <= 0
    || !in_array($newStatus, ['pending', 'active', 'suspended'], true)
    || ($pricingTier !== null && !in_array($pricingTier, ['old', 'new'], true))
) {
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
    $storedTier = false;
    if ($newStatus === 'active') {
        $stmt = $db->prepare('SELECT tier FROM customer_pricing WHERE user_id = :id');
        $stmt->execute(['id' => $userId]);
        $storedTier = $stmt->fetchColumn();
        if ($pricingTier === null && $storedTier === false) {
            gsx_admin_json(400, ['ok' => false, 'error' => 'pricing_required']);
        }
    }

    // The status change and the pricing choice are saved together, or not at all.
    $db->beginTransaction();
    try {
        if ($newStatus === 'active' && $pricingTier !== null) {
            $db->prepare(
                'INSERT INTO customer_pricing (user_id, tier, set_by) VALUES (:id, :tier, :admin)
                 ON DUPLICATE KEY UPDATE tier = VALUES(tier), set_by = VALUES(set_by)'
            )->execute(['id' => $userId, 'tier' => $pricingTier, 'admin' => $admin['id']]);
        }
        $db->prepare('UPDATE users SET account_status = :status, auth_version = auth_version + 1 WHERE id = :id')
            ->execute(['status' => $newStatus, 'id' => $userId]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    gsx_admin_audit((int) $admin['id'], 'customer_status_changed', $userId, $oldStatus . ' -> ' . $newStatus);
    if ($newStatus === 'active' && $pricingTier !== null && $pricingTier !== $storedTier) {
        gsx_admin_audit((int) $admin['id'], 'customer_pricing_set', $userId, ($storedTier ?: 'none') . ' -> ' . $pricingTier);
    }
}

$stmt = $db->prepare('SELECT tier FROM customer_pricing WHERE user_id = :id');
$stmt->execute(['id' => $userId]);
$tier = $stmt->fetchColumn();

gsx_admin_json(200, ['ok' => true, 'status' => $newStatus, 'pricingTier' => $tier === false ? null : $tier]);
