<?php
/** The signed-in customer's saved cart. It belongs to their account, so it follows them between sessions and devices. */

require_once __DIR__ . '/shop-lib.php';

gsx_start_session();

header('Content-Type: application/json');
header('Cache-Control: no-store');

$customer = gsx_shop_customer();

gsx_json_response(200, gsx_cart_response(gsx_db(), $customer));
