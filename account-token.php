<?php
require_once __DIR__.'/account-lib.php';
gsx_start_session(); $b=gsx_account_body();
$action=$b['action']??'';
if (in_array($action,['recover','resend'],true)) {
  $email=gsx_account_email($b); gsx_account_throttle($action,$email);
  $q=gsx_db()->prepare('SELECT id,email,email_verified_at,account_access,account_status FROM users WHERE email=?'); $q->execute([$email]); $u=$q->fetch();
  if ($u && $u['account_access']!=='suspended' && $u['account_status']!=='suspended') {
    if ($action==='resend' && !$u['email_verified_at']) gsx_account_send((int)$u['id'],$email,'verify');
    if ($action==='recover' && $u['email_verified_at']) gsx_account_send((int)$u['id'],$email,'reset');
  }
  gsx_json_response(202,['ok'=>true,'message'=>'If eligible, an account email will be sent.']);
}
if (!in_array($action,['verify','reset'],true)) gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']);
gsx_account_throttle($action,gsx_client_ip());
$password=is_string($b['password']??null)?$b['password']:'';
if ($action==='reset' && (!gsx_valid_password($password) || $password!==($b['confirmPassword']??null))) gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']);
$token=is_string($b['token']??null)?$b['token']:'';
if (!gsx_account_token($action,$token,$password)) gsx_json_response(400,['ok'=>false,'error'=>'invalid_or_expired_token']);
gsx_json_response(200,['ok'=>true]);
