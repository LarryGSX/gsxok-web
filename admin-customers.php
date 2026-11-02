<?php
/**
 * Lists customer accounts for the administrator screen: accounts waiting for
 * approval first, then everyone else, newest first. Administrators only.
 * Includes each account's pricing tier ('old', 'new', or null if none has been
 * assigned yet). Never returns password hashes.
 */

require_once __DIR__ . '/admin-security.php';

gsx_start_session();

header('Content-Type: application/json');

gsx_require_admin();

$rows = gsx_db()->query(
    "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.address, u.city, u.state, u.zip,
            u.omma_license, u.account_status, u.created_at, p.tier AS pricing_tier
     FROM users u LEFT JOIN customer_pricing p ON p.user_id = u.id
     ORDER BY (u.account_status = 'pending') DESC, u.created_at DESC, u.id DESC
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
        'pricingTier' => $r['pricing_tier'],
        'createdAt' => $r['created_at'],
    ];
}, $rows);

gsx_admin_json(200, ['ok' => true, 'customers' => $customers]);
