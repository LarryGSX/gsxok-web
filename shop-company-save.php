<?php
/**
 * Adds a company for the signed-in customer, or edits one of their own
 * (pass "id" to edit). Same fields the old site collected.
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

function gsx_co_str(array $body, string $key): string
{
    return isset($body[$key]) && is_string($body[$key]) ? trim($body[$key]) : '';
}

$id = isset($body['id']) && is_int($body['id']) ? $body['id'] : 0;
$name = gsx_co_str($body, 'name');
$address = gsx_co_str($body, 'address');
$city = gsx_co_str($body, 'city');
$state = strtoupper(gsx_co_str($body, 'state'));
$zip = gsx_co_str($body, 'zip');
$license = gsx_co_str($body, 'ommaLicense');
$email = strtolower(gsx_co_str($body, 'email'));
$phone = gsx_co_str($body, 'phone');

$errors = [];
if ($name === '' || mb_strlen($name) > 255) $errors[] = 'name';
if ($address === '' || mb_strlen($address) > 255) $errors[] = 'address';
if ($city === '' || mb_strlen($city) > 255) $errors[] = 'city';
if (mb_strlen($state) !== 2) $errors[] = 'state';
if ($zip === '' || mb_strlen($zip) > 10) $errors[] = 'zip';
if ($license === '' || mb_strlen($license) > 255) $errors[] = 'ommaLicense';
if ($email === '' || mb_strlen($email) > 255 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) $errors[] = 'email';
if ($phone === '' || mb_strlen($phone) > 30) $errors[] = 'phone';

if (!empty($errors)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields', 'fields' => $errors]);
}

$db = gsx_db();
$values = [
    'name' => $name, 'address' => $address, 'city' => $city, 'state' => $state,
    'zip' => $zip, 'license' => $license, 'email' => $email, 'phone' => $phone,
];

if ($id > 0) {
    // Only ever touches a company that belongs to this customer.
    $stmt = $db->prepare(
        'UPDATE companies SET name = :name, address = :address, city = :city, state = :state,
                zip = :zip, omma_license = :license, email = :email, phone = :phone
         WHERE id = :id AND user_id = :user_id'
    );
    $stmt->execute($values + ['id' => $id, 'user_id' => $customer['id']]);

    $check = $db->prepare('SELECT id FROM companies WHERE id = :id AND user_id = :user_id');
    $check->execute(['id' => $id, 'user_id' => $customer['id']]);
    if ($check->fetch() === false) {
        gsx_json_response(404, ['ok' => false, 'error' => 'not_found']);
    }
    gsx_json_response(200, ['ok' => true, 'id' => $id]);
}

$stmt = $db->prepare(
    'INSERT INTO companies (user_id, name, address, city, state, zip, omma_license, email, phone)
     VALUES (:user_id, :name, :address, :city, :state, :zip, :license, :email, :phone)'
);
$stmt->execute($values + ['user_id' => $customer['id']]);

gsx_json_response(200, ['ok' => true, 'id' => (int) $db->lastInsertId()]);
