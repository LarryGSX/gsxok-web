<?php
/**
 * Tells the (static, client-rendered) Portal page whether the visitor is
 * currently logged in. Returns only the minimum needed to greet someone
 * by name — never anything sensitive.
 */

require_once __DIR__ . '/portal-security.php';

gsx_start_session();

header('Content-Type: application/json');

$userId = $_SESSION['user_id'] ?? null;

if ($userId === null) {
    gsx_json_response(200, ['ok' => true, 'loggedIn' => false]);
}

$db = gsx_db();
$stmt = $db->prepare('SELECT first_name, email, account_status FROM users WHERE id = :id');
$stmt->execute(['id' => $userId]);
$user = $stmt->fetch();

if ($user === false || $user['account_status'] !== 'active') {
    // Account was suspended (or otherwise deactivated) after the session
    // was created — treat as logged out rather than trusting the stale
    // session data.
    gsx_json_response(200, ['ok' => true, 'loggedIn' => false]);
}

gsx_json_response(200, [
    'ok' => true,
    'loggedIn' => true,
    'firstName' => $user['first_name'],
    'email' => $user['email'],
]);
