<?php
/**
 * Create-account endpoint. Fields match the Portal registration form
 * exactly (see components/portal/PortalAuth.tsx on the hostgator-static
 * branch) ? nothing added, nothing removed.
 *
 * New accounts land as 'pending' (see portal-config.php's
 * GSX_NEW_ACCOUNTS_REQUIRE_APPROVAL) ? they cannot log in until an admin
 * approves them. This mirrors the legacy system's own gate, which real
 * data proves was load-bearing: several 'Pending' rows in the legacy
 * accounts table are obvious bot-spam signups (randomized field values)
 * that never got approved. Registration is not a login ? it never creates
 * a session.
 */

require_once __DIR__ . '/account-lib.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_json_response(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);

if (!is_array($body)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_request']);
}

function gsx_reg_str(array $body, string $key): string
{
    return isset($body[$key]) && is_string($body[$key]) ? trim($body[$key]) : '';
}

// Anti-spam: a hidden field real visitors never see. A bot that fills it in gets a
// fake success, so it learns nothing.
if (gsx_reg_str($body, 'gsxHpToken') !== '') {
    gsx_json_response(200, ['ok' => true, 'status' => 'pending']);
}

$firstName = gsx_reg_str($body, 'firstName');
$lastName = gsx_reg_str($body, 'lastName');
$address = gsx_reg_str($body, 'address');
$city = gsx_reg_str($body, 'city');
$state = strtoupper(gsx_reg_str($body, 'state'));
$zip = gsx_reg_str($body, 'zip');
$ommaLicense = gsx_reg_str($body, 'ommaLicense');
$email = strtolower(gsx_reg_str($body, 'email'));
$phone = gsx_reg_str($body, 'phone');
$password = is_string($body['password'] ?? null) ? $body['password'] : '';
$confirmPassword = is_string($body['confirmPassword'] ?? null) ? $body['confirmPassword'] : '';

$errors = [];
if ($firstName === '' || mb_strlen($firstName) > GSX_NAME_MAX) $errors[] = 'firstName';
if ($lastName === '' || mb_strlen($lastName) > GSX_NAME_MAX) $errors[] = 'lastName';
if ($address === '' || mb_strlen($address) > GSX_ADDRESS_MAX) $errors[] = 'address';
if ($city === '' || mb_strlen($city) > GSX_CITY_MAX) $errors[] = 'city';
if (mb_strlen($state) !== GSX_STATE_LEN) $errors[] = 'state';
if ($zip === '' || mb_strlen($zip) > GSX_ZIP_MAX) $errors[] = 'zip';
if ($ommaLicense === '' || mb_strlen($ommaLicense) > GSX_LICENSE_MAX) $errors[] = 'ommaLicense';
if ($email === '' || mb_strlen($email) > GSX_EMAIL_MAX || filter_var($email, FILTER_VALIDATE_EMAIL) === false) $errors[] = 'email';
if ($phone === '' || mb_strlen($phone) > GSX_PHONE_MAX) $errors[] = 'phone';
if (!gsx_valid_password($password)) $errors[] = 'password';
if ($password !== $confirmPassword) $errors[] = 'confirmPassword';

if (!empty($errors)) {
    gsx_json_response(400, ['ok' => false, 'error' => 'invalid_fields', 'fields' => $errors]);
}

$db = gsx_db();
gsx_account_throttle('register', $email);
$passwordHash = gsx_hash_password($password);

$existing = $db->prepare('SELECT id FROM users WHERE email = :email');
$existing->execute(['email' => $email]);
if ($existing->fetch() !== false) {
    gsx_json_response(200, ['ok' => true, 'status' => 'pending']);
}

$status = 'pending'; // Account approval never activates transaction status.

$insert = $db->prepare(
    'INSERT INTO users
        (first_name, last_name, address, city, state, zip, omma_license, email, phone, password_hash, account_status)
     VALUES
        (:first_name, :last_name, :address, :city, :state, :zip, :omma_license, :email, :phone, :password_hash, :status)'
);

try {
    $insert->execute([
        'first_name' => $firstName,
        'last_name' => $lastName,
        'address' => $address,
        'city' => $city,
        'state' => $state,
        'zip' => $zip,
        'omma_license' => $ommaLicense,
        'email' => $email,
        'phone' => $phone,
        'password_hash' => $passwordHash,
        'status' => $status,
    ]);
} catch (PDOException $e) {
    // Two submits for the same email landing at the same instant both pass
    // the SELECT check above before either INSERT commits ? the table's
    // own unique constraint on email is what actually stops the second one.
    // Treat that the same as the normal duplicate-email response instead of
    // letting it surface as an uncaught 500.
    if ($e->getCode() === '23000') {
        gsx_json_response(200, ['ok' => true, 'status' => 'pending']);
    }
    throw $e;
}

gsx_account_send((int)$db->lastInsertId(), $email, 'verify');
gsx_json_response(200, ['ok' => true, 'status' => 'pending']);
