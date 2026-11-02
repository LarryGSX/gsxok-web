<?php
/**
 * Sets or changes an approved customer's pricing tier. Administrators only.
 *
 * There are exactly two tiers: 'old' (Old / Grandfathered) and 'new' (New /
 * Standard). Nothing else is accepted: no per-product prices, no discounts.
 * A pending account gets its tier at approval (admin-customer-status.php), not
 * here. The customer's own price is always read from this saved choice on the
 * server when they browse or order; the browser never supplies it.
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
$tier = $body['pricingTier'] ?? null;

if ($userId <= 0 || !in_array($tier, ['old', 'new'], true)) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'invalid_fields']);
}

$db = gsx_db();
$stmt = $db->prepare('SELECT account_status FROM users WHERE id = :id');
$stmt->execute(['id' => $userId]);
$status = $stmt->fetchColumn();

if ($status === false) {
    gsx_admin_json(404, ['ok' => false, 'error' => 'not_found']);
}
if ($status === 'pending') {
    gsx_admin_json(400, ['ok' => false, 'error' => 'not_approved']);
}

$stmt = $db->prepare('SELECT tier FROM customer_pricing WHERE user_id = :id');
$stmt->execute(['id' => $userId]);
$oldTier = $stmt->fetchColumn();

if ($oldTier !== $tier) {
    $db->prepare(
        'INSERT INTO customer_pricing (user_id, tier, set_by) VALUES (:id, :tier, :admin)
         ON DUPLICATE KEY UPDATE tier = VALUES(tier), set_by = VALUES(set_by)'
    )->execute(['id' => $userId, 'tier' => $tier, 'admin' => $admin['id']]);

    gsx_admin_audit((int) $admin['id'], 'customer_pricing_set', $userId, ($oldTier ?: 'none') . ' -> ' . $tier);
}

gsx_admin_json(200, ['ok' => true, 'pricingTier' => $tier]);
