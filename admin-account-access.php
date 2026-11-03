<?php
require_once __DIR__.'/admin-security.php';
require_once __DIR__.'/account-lib.php';
gsx_start_session(); $admin=gsx_require_admin(); $b=gsx_account_body();
if (!is_int($b['id']??null) || !in_array($b['access']??null,['pending','approved','suspended'],true)) gsx_admin_json(400,['ok'=>false,'error'=>'invalid_fields']);
gsx_account_throttle('admin-reauth',$admin['email']);
$q=gsx_db()->prepare('SELECT password_hash FROM admins WHERE id=?'); $q->execute([$admin['id']]);
if (!is_string($b['currentPassword']??null) || !gsx_verify_password($b['currentPassword'],$q->fetchColumn())) gsx_admin_json(403,['ok'=>false,'error'=>'reauthentication_required']);
$db=gsx_db(); $db->beginTransaction();
try {
  $q=$db->prepare('SELECT id,email_verified_at FROM users WHERE id=? FOR UPDATE'); $q->execute([$b['id']]); $u=$q->fetch();
  if (!$u) { $db->rollBack(); gsx_admin_json(404,['ok'=>false,'error'=>'not_found']); }
  if ($b['access']==='approved' && !$u['email_verified_at']) { $db->rollBack(); gsx_admin_json(409,['ok'=>false,'error'=>'email_verification_required']); }
  $db->prepare('UPDATE users SET account_access=?,auth_version=auth_version+1 WHERE id=?')->execute([$b['access'],$b['id']]);
  $db->prepare('UPDATE account_tokens SET used_at=NOW() WHERE user_id=? AND used_at IS NULL')->execute([$b['id']]);
  $db->prepare('UPDATE account_mail_queue SET sent_at=NOW() WHERE user_id=? AND sent_at IS NULL')->execute([$b['id']]);
  gsx_account_audit($b['id'],'access_'.$b['access']); $db->commit();
} catch(Throwable $e) { if($db->inTransaction()) $db->rollBack(); throw $e; }
// No account_status, pricing or other transaction tables are read or changed.
gsx_admin_json(200,['ok'=>true,'access'=>$b['access'],'capabilities'=>['transactions'=>false]]);
