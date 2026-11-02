<?php
/**
 * Places an order for the signed-in customer from THEIR saved cart.
 *
 * The browser sends only which of the customer's own companies the order is
 * for. What is being ordered comes from the cart saved on the server for this
 * account, prices come from the products table for this customer's price
 * list, the company must belong to this customer, and only in-stock products
 * can be ordered. The order is saved first (and the cart emptied in the same
 * step), then emailed to GSX with a confirmation to the company's email,
 * as the old site did.
 */

require_once __DIR__ . '/shop-lib.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_json_response(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();
$customer = gsx_shop_customer();
$body = gsx_json_body();

$companyId = isset($body['companyId']) && is_int($body['companyId']) ? $body['companyId'] : 0;
if ($companyId <= 0) {
    gsx_json_response(400, ['ok' => false, 'error' => 'company_required']);
}

$db = gsx_db();

// The company must belong to this customer.
$stmt = $db->prepare(
    'SELECT id, name, address, city, state, zip, omma_license, email, phone
     FROM companies WHERE id = :id AND user_id = :user_id'
);
$stmt->execute(['id' => $companyId, 'user_id' => $customer['id']]);
$companyRow = $stmt->fetch();
if ($companyRow === false) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_company']);
}
$company = [
    'id' => (int) $companyRow['id'],
    'name' => $companyRow['name'],
    'address' => $companyRow['address'],
    'city' => $companyRow['city'],
    'state' => $companyRow['state'],
    'zip' => $companyRow['zip'],
    'license' => $companyRow['omma_license'],
    'email' => $companyRow['email'],
    'phone' => $companyRow['phone'],
];

// What is being ordered: this account's saved cart, priced on the server.
$items = gsx_cart_lines($db, $customer);
if (count($items) === 0) {
    gsx_json_response(400, ['ok' => false, 'error' => 'empty_cart']);
}
$subtotalCents = 0;
foreach ($items as $it) {
    if (!$it['in_stock']) {
        gsx_json_response(400, ['ok' => false, 'error' => 'unavailable', 'title' => $it['title']]);
    }
    $subtotalCents += $it['line_cents'];
}

$db->beginTransaction();
try {
    $db->prepare(
        'INSERT INTO orders (user_id, company_id, company_name, ship_address, ship_city, ship_state,
                             ship_zip, license, contact_email, contact_phone, subtotal)
         VALUES (:user_id, :company_id, :name, :address, :city, :state, :zip, :license, :email, :phone, :subtotal)'
    )->execute([
        'user_id' => $customer['id'],
        'company_id' => $company['id'],
        'name' => $company['name'],
        'address' => $company['address'],
        'city' => $company['city'],
        'state' => $company['state'],
        'zip' => $company['zip'],
        'license' => $company['license'],
        'email' => $company['email'],
        'phone' => $company['phone'],
        'subtotal' => gsx_cents_to_money($subtotalCents),
    ]);
    $orderId = (int) $db->lastInsertId();

    $insertItem = $db->prepare(
        'INSERT INTO order_items (order_id, product_id, title, image, unit_price, qty, line_total)
         VALUES (:order_id, :product_id, :title, :image, :unit_price, :qty, :line_total)'
    );
    foreach ($items as $it) {
        $insertItem->execute([
            'order_id' => $orderId,
            'product_id' => $it['product_id'],
            'title' => $it['title'],
            'image' => $it['image'],
            'unit_price' => gsx_cents_to_money($it['unit_cents']),
            'qty' => $it['qty'],
            'line_total' => gsx_cents_to_money($it['line_cents']),
        ]);
    }

    // The order has been placed, so this account's cart is now empty.
    $db->prepare('DELETE FROM cart_items WHERE user_id = :user_id')->execute(['user_id' => $customer['id']]);

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    throw $e;
}

gsx_send_order_emails($orderId, $customer, $company, $items, $subtotalCents);

gsx_json_response(200, [
    'ok' => true,
    'orderId' => $orderId,
    'total' => gsx_cents_to_money($subtotalCents),
]);
