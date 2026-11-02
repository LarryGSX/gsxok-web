<?php
/**
 * The product list for the signed-in customer, priced from their own price
 * list (Old / Grandfathered or New / Standard, as set by an administrator). Out-of-stock products are included and
 * flagged so the page can show "currently not available".
 */

require_once __DIR__ . '/shop-lib.php';

gsx_start_session();

header('Content-Type: application/json');
header('Cache-Control: no-store');

$customer = gsx_shop_customer();
$priceList = gsx_require_price_list($customer);

$rows = gsx_db()->query(
    'SELECT id, title, description, image, price, legacy_price, in_stock
     FROM products ORDER BY sort_order, id'
)->fetchAll();

$products = array_map(static function (array $p) use ($priceList): array {
    return [
        'id' => (int) $p['id'],
        'title' => $p['title'],
        'description' => $p['description'],
        'image' => gsx_image_url($p['image']),
        'price' => gsx_cents_to_money(gsx_unit_cents($p, $priceList)),
        'inStock' => (int) $p['in_stock'] === 1,
    ];
}, $rows);

gsx_json_response(200, ['ok' => true, 'products' => $products]);
