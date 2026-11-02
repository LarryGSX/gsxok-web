<?php
/**
 * Changes the signed-in customer's own saved cart:
 *   add    - put a product in the cart (adds to any quantity already there)
 *   set    - change the quantity of a product already in the cart
 *   remove - take a product out of the cart
 * The cart row always belongs to the signed-in account; no cart or user ID is
 * ever read from the request.
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

$action = isset($body['action']) && is_string($body['action']) ? $body['action'] : '';
$productId = isset($body['productId']) && is_int($body['productId']) ? $body['productId'] : 0;
$qty = isset($body['qty']) && is_int($body['qty']) ? $body['qty'] : 0;

if (!in_array($action, ['add', 'set', 'remove'], true) || $productId <= 0) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields']);
}
if ($action !== 'remove' && ($qty < 1 || $qty > GSX_QTY_TECHNICAL_MAX)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_quantity']);
}

$db = gsx_db();

if ($action === 'remove') {
    $db->prepare('DELETE FROM cart_items WHERE user_id = :u AND product_id = :p')
        ->execute(['u' => $customer['id'], 'p' => $productId]);
    gsx_json_response(200, gsx_cart_response($db, $customer));
}

// Only real, in-stock products can go in the cart.
$stmt = $db->prepare('SELECT title, in_stock FROM products WHERE id = :id');
$stmt->execute(['id' => $productId]);
$product = $stmt->fetch();
if ($product === false) {
    gsx_json_response(400, ['ok' => false, 'error' => 'unknown_product']);
}
if ((int) $product['in_stock'] !== 1) {
    gsx_json_response(400, ['ok' => false, 'error' => 'unavailable', 'title' => $product['title']]);
}

if ($action === 'add') {
    $db->prepare(
        'INSERT INTO cart_items (user_id, product_id, qty) VALUES (:u, :p, :q)
         ON DUPLICATE KEY UPDATE qty = LEAST(qty + VALUES(qty), :max)'
    )->execute(['u' => $customer['id'], 'p' => $productId, 'q' => $qty, 'max' => GSX_QTY_TECHNICAL_MAX]);
} else {
    $db->prepare(
        'INSERT INTO cart_items (user_id, product_id, qty) VALUES (:u, :p, :q)
         ON DUPLICATE KEY UPDATE qty = VALUES(qty)'
    )->execute(['u' => $customer['id'], 'p' => $productId, 'q' => $qty]);
}

gsx_json_response(200, gsx_cart_response($db, $customer));
