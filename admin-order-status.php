<?php
/**
 * Marks a placed order as completed, as the old admin's "Mark Completed" did.
 * Administrators only; logged. There is deliberately no way to reopen or
 * cancel an order here: the only statuses are in progress and completed.
 */

require_once __DIR__ . '/admin-security.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_admin_json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();
$admin = gsx_require_admin();

$body = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($body)) {
    gsx_admin_json(400, ['ok' => false, 'error' => 'invalid_request']);
}

$orderId = isset($body['id']) && is_int($body['id']) ? $body['id'] : 0;
$status = isset($body['status']) && is_string($body['status']) ? $body['status'] : '';

if ($orderId <= 0 || $status !== 'completed') {
    gsx_admin_json(400, ['ok' => false, 'error' => 'invalid_fields']);
}

$db = gsx_db();
$stmt = $db->prepare('SELECT status FROM orders WHERE id = :id');
$stmt->execute(['id' => $orderId]);
$row = $stmt->fetch();
if ($row === false) {
    gsx_admin_json(404, ['ok' => false, 'error' => 'not_found']);
}

if ($row['status'] !== 'completed') {
    $db->prepare("UPDATE orders SET status = 'completed' WHERE id = :id")->execute(['id' => $orderId]);
    gsx_admin_audit((int) $admin['id'], 'order_completed', null, 'order ' . $orderId);
}

gsx_admin_json(200, ['ok' => true, 'status' => 'completed']);
