<?php
require_once __DIR__.'/account-lib.php';
gsx_start_session(); $u=gsx_account_user(); $db=gsx_db();
if ($_SERVER['REQUEST_METHOD']==='GET') {
  $q=$db->prepare('SELECT id,name,address,city,state,zip,omma_license,email,phone FROM companies WHERE user_id=? ORDER BY id'); $q->execute([$u['id']]);
  gsx_json_response(200,['ok'=>true,'account'=>$u,'companies'=>$q->fetchAll(),'csrfToken'=>gsx_csrf_token(),'capabilities'=>['transactions'=>false]]);
}
$b=gsx_account_body(); $action=$b['action']??'';
if ($action==='profile-request') {
  $id=is_int($b['companyId']??null)?$b['companyId']:0;
  $profile=$b['profile']??null;
  if (!is_array($profile)) gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']);
  $claim=[];
  foreach (['name','address','city','state','zip','phone','email'] as $key) {
    if (!is_string($profile[$key]??null) || strlen($profile[$key])>255 || trim($profile[$key])==='') gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']);
    $claim[$key]=trim($profile[$key]);
  }
  // Scope ownership in the INSERT itself; never update the source company.
  $q=$db->prepare('INSERT INTO account_profile_requests(user_id,company_id,profile_json) SELECT user_id,id,? FROM companies WHERE id=? AND user_id=?');
  $q->execute([json_encode($claim),$id,$u['id']]);
  if (!$q->rowCount()) gsx_json_response(404,['ok'=>false,'error'=>'not_found']);
  gsx_account_audit((int)$u['id'],'profile_requested');
  gsx_json_response(202,['ok'=>true,'status'=>'pending_review']);
}
if (in_array($action,['password','revoke-sessions'],true)) {
  $current=is_string($b['currentPassword']??null)?$b['currentPassword']:'';
  gsx_account_throttle('reauth',$u['email']);
  $db->beginTransaction();
  try {
    $q=$db->prepare('SELECT password_hash,auth_version FROM users WHERE id=? FOR UPDATE'); $q->execute([$u['id']]); $row=$q->fetch();
    if ((int)$row['auth_version']!==(int)$_SESSION['auth_version'] || !gsx_verify_password($current,$row['password_hash'])) { $db->rollBack(); gsx_json_response(403,['ok'=>false,'error'=>'reauthentication_required']); }
    if ($action==='password') {
      $new=is_string($b['password']??null)?$b['password']:'';
      if (!gsx_valid_password($new) || $new!==($b['confirmPassword']??null)) { $db->rollBack(); gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']); }
      $db->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([gsx_hash_password($new),$u['id']]);
    }
    $db->prepare('UPDATE users SET auth_version=auth_version+1 WHERE id=?')->execute([$u['id']]);
    $db->prepare('UPDATE account_tokens SET used_at=NOW() WHERE user_id=? AND used_at IS NULL')->execute([$u['id']]);
    $db->prepare('UPDATE account_mail_queue SET sent_at=NOW() WHERE user_id=? AND sent_at IS NULL')->execute([$u['id']]);
    $db->prepare('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=? AND used_at IS NULL')->execute([$u['id']]);
    gsx_account_audit((int)$u['id'],$action==='password'?'password_changed':'sessions_revoked'); $db->commit();
  } catch(Throwable $e) { if($db->inTransaction()) $db->rollBack(); throw $e; }
  $_SESSION=[]; session_regenerate_id(true); gsx_json_response(200,['ok'=>true]);
}
gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']);
