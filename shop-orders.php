<?php
/** The signed-in customer's own order history, newest first. */

require_once __DIR__ . '/shop-lib.php';

gsx_start_session();

header('Content-Type: application/json');
header('Cache-Control: no-store');

$customer = gsx_shop_customer();
$db = gsx_db();

$stmt = $db->prepare(
    'SELECT id, status, company_name, subtotal, created_at
     FROM orders WHERE user_id = :user_id ORDER BY id DESC LIMIT 100'
);
$stmt->execute(['user_id' => $customer['id']]);
$orders = $stmt->fetchAll();

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
        'companyName' => $o['company_name'],
        'total' => $o['subtotal'],
        'createdAt' => $o['created_at'],
        'items' => $itemsByOrder[(int) $o['id']] ?? [],
    ];
}, $orders);

gsx_json_response(200, ['ok' => true, 'orders' => $out]);
