<?php
/** Ends the current session. */

require_once __DIR__ . '/portal-security.php';

gsx_start_session();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gsx_json_response(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

gsx_require_csrf();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}

session_destroy();

gsx_json_response(200, ['ok' => true]);
