<?php
/**
 * Returns a CSRF token tied to the visitor's session. The Portal page
 * fetches this once when it loads, then sends the value back as an
 * X-CSRF-Token header on every register/login/forgot-password/
 * reset-password request. See portal-security.php's comment block for why
 * this is safe without a plain-cookie token.
 */

require_once __DIR__ . '/portal-security.php';

gsx_start_session();
gsx_json_response(200, ['ok' => true, 'csrfToken' => gsx_csrf_token()]);
