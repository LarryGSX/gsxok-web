<?php
/**
 * Lists customer accounts for the administrator screen: accounts waiting for
 * approval first, then everyone else, newest first. Administrators only.
 * Never returns password hashes.
 */

require_once __DIR__ . '/admin-security.php';

gsx_start_session();

header('Content-Type: application/json');

gsx_require_admin();

$rows = gsx_db()->query(
    "SELECT id, first_name, last_name, email, phone, address, city, state, zip,
            omma_license, account_status, created_at
     FROM users
     ORDER BY (account_status = 'pending') DESC, created_at DESC, id DESC
     LIMIT 1000"
)->fetchAll();

$customers = array_map(static function (array $r): array {
    return [
        'id' => (int) $r['id'],
        'firstName' => $r['first_name'],
        'lastName' => $r['last_name'],
        'email' => $r['email'],
        'phone' => $r['phone'],
        'address' => $r['address'],
        'city' => $r['city'],
        'state' => $r['state'],
        'zip' => $r['zip'],
        'ommaLicense' => $r['omma_license'],
        'status' => $r['account_status'],
        'createdAt' => $r['created_at'],
    ];
}, $rows);

gsx_admin_json(200, ['ok' => true, 'customers' => $customers]);
