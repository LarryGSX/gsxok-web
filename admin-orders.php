<?php
/**
 * The orders placed through the portal (active and completed), for the administrator screen: who
 * ordered, for which company, what, and the current status. Administrators only.
 */

require_once __DIR__ . '/admin-security.php';

gsx_start_session();

header('Content-Type: application/json');

gsx_require_admin();

$db = gsx_db();

$orders = $db->query(
    "SELECT o.id, o.status, o.company_name, o.ship_address, o.ship_city, o.ship_state, o.ship_zip,
            o.license, o.contact_email, o.contact_phone, o.subtotal, o.created_at,
            u.first_name, u.last_name, u.email AS account_email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.id DESC
     LIMIT 500"
)->fetchAll();

$itemsByOrder = [];
if (count($orders) > 0) {
    $ids = array_map(static fn(array $o): int => (int) $o['id'], $orders);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $itemStmt = $db->prepare(
        "SELECT order_id, title, unit_price, qty, line_total FROM order_items WHERE order_id IN ($placeholders) ORDER BY id"
    );
    $itemStmt->execute($ids);
    foreach ($itemStmt->fetchAll() as $it) {
        $itemsByOrder[(int) $it['order_id']][] = [
            'title' => $it['title'],
            'unitPrice' => $it['unit_price'],
            'qty' => (int) $it['qty'],
            'lineTotal' => $it['line_total'],
        ];
    }
}

$out = array_map(static function (array $o) use ($itemsByOrder): array {
    return [
        'id' => (int) $o['id'],
        'status' => $o['status'],
        'customerName' => trim($o['first_name'] . ' ' . $o['last_name']),
        'customerEmail' => $o['account_email'],
        'companyName' => $o['company_name'],
        'address' => $o['ship_address'] . ', ' . $o['ship_city'] . ', ' . $o['ship_state'] . ' ' . $o['ship_zip'],
        'license' => $o['license'],
        'contactEmail' => $o['contact_email'],
        'contactPhone' => $o['contact_phone'],
        'total' => $o['subtotal'],
        'createdAt' => $o['created_at'],
        'items' => $itemsByOrder[(int) $o['id']] ?? [],
    ];
}, $orders);

gsx_admin_json(200, ['ok' => true, 'orders' => $out]);
