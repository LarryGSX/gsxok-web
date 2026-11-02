<?php
/** Removes one of the signed-in customer's own companies. Past orders keep their own copy of the details. */

require_once __DIR__ . '/shop-lib.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_json_response(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();
$customer = gsx_shop_customer();
$body = gsx_json_body();

$id = isset($body['id']) && is_int($body['id']) ? $body['id'] : 0;
if ($id <= 0) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields']);
}

$stmt = gsx_db()->prepare('DELETE FROM companies WHERE id = :id AND user_id = :user_id');
$stmt->execute(['id' => $id, 'user_id' => $customer['id']]);

gsx_json_response(200, ['ok' => true]);
