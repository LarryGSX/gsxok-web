<?php
// Test router only; Apache denies this entire directory. No production switch.
require_once __DIR__.'/bootstrap.php'; require_once __DIR__.'/../../portal-security.php';
gsx_start_session();
$b=json_decode(file_get_contents('php://input'),true);
if (isset($b['idle'])) $_SESSION['last_seen']=time()-1801;
if (isset($b['absolute'])) $_SESSION['issued_at']=time()-28801;
gsx_json_response(200,['ok'=>true]);
