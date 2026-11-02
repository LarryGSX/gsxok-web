<?php
/** The signed-in customer's companies (the locations they order for). Their own only. */

require_once __DIR__ . '/shop-lib.php';

gsx_start_session();

header('Content-Type: application/json');
header('Cache-Control: no-store');

$customer = gsx_shop_customer();

$stmt = gsx_db()->prepare(
    'SELECT id, name, address, city, state, zip, omma_license, email, phone
     FROM companies WHERE user_id = :user_id ORDER BY name, id'
);
$stmt->execute(['user_id' => $customer['id']]);

$companies = array_map(static function (array $c): array {
    return [
        'id' => (int) $c['id'],
        'name' => $c['name'],
        'address' => $c['address'],
        'city' => $c['city'],
        'state' => $c['state'],
        'zip' => $c['zip'],
        'ommaLicense' => $c['omma_license'],
        'email' => $c['email'],
        'phone' => $c['phone'],
    ];
}, $stmt->fetchAll());

gsx_json_response(200, ['ok' => true, 'companies' => $companies]);
