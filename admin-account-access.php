<?php
require_once __DIR__.'/admin-security.php';
require_once __DIR__.'/account-review-lib.php';
gsx_start_session(); $admin=gsx_require_admin(); $b=gsx_account_body();
if (!is_int($b['id']??null) || $b['id']<=0 || !in_array($b['access']??null,['pending','approved','suspended'],true)) gsx_review_error(400,'invalid_fields');
$reason=gsx_review_reason($b); $db=gsx_db();
gsx_account_throttle('staff-reauth',$admin['email']);
$db->beginTransaction();
try {
  gsx_review_reauthenticate($admin,$b);
  $q=$db->prepare('SELECT id,email_verified_at,account_access,auth_version FROM users WHERE id=? FOR UPDATE'); $q->execute([$b['id']]); $u=$q->fetch();
  if (!$u) gsx_review_error(404,'not_found');
  if (isset($b['expectedVersion']) && (!is_int($b['expectedVersion']) || $b['expectedVersion']!==(int)$u['auth_version'])) gsx_review_error(409,'stale_account');
  if ($b['access']==='approved' && !$u['email_verified_at']) gsx_review_error(409,'email_verification_required');
  $db->prepare('UPDATE users SET account_access=?,auth_version=auth_version+1 WHERE id=?')->execute([$b['access'],$b['id']]);
  $db->prepare('UPDATE account_tokens SET used_at=NOW() WHERE user_id=? AND used_at IS NULL')->execute([$b['id']]);
  $db->prepare('UPDATE account_mail_queue SET sent_at=NOW() WHERE user_id=? AND sent_at IS NULL')->execute([$b['id']]);
  gsx_review_audit($b['id'],'access_'.$b['access'],['previous'=>$u['account_access'],'access'=>$b['access'],'reason'=>$reason,'version'=>(int)$u['auth_version']+1]);
  $db->commit();
} catch(Throwable $e) { if($db->inTransaction()) $db->rollBack(); throw $e; }
// This endpoint never reads/writes transaction approval or pricing.
gsx_admin_json(200,['ok'=>true,'access'=>$b['access'],'capabilities'=>['transactions'=>false]]);
