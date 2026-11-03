<?php
require_once __DIR__.'/account-lib.php';
gsx_start_session(); $b=gsx_account_body(); $email=gsx_account_email($b);
gsx_account_throttle('recover',$email);
$q=gsx_db()->prepare('SELECT id,email,email_verified_at,account_access,account_status FROM users WHERE email=?'); $q->execute([$email]); $u=$q->fetch();
if ($u && $u['email_verified_at'] && $u['account_access']!=='suspended' && $u['account_status']!=='suspended') gsx_account_send((int)$u['id'],$email,'reset');
gsx_json_response(200,['ok'=>true,'message'=>'If eligible, an account email will be sent.']);
