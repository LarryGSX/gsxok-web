<?php
require_once __DIR__.'/account-lib.php';
gsx_start_session(); $b=gsx_account_body(); gsx_account_throttle('reset',gsx_client_ip());
$password=is_string($b['password']??null)?$b['password']:'';
if (!gsx_valid_password($password) || $password!==($b['confirmPassword']??null)) gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']);
if (!gsx_account_token('reset',is_string($b['token']??null)?$b['token']:'',$password)) gsx_json_response(400,['ok'=>false,'error'=>'invalid_or_expired_token']);
gsx_json_response(200,['ok'=>true]);
