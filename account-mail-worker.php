<?php
// Invoke by an existing host cron, never through HTTP. No paid mail dependency.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__.'/account-lib.php';
$test=defined('GSX_LOCAL_TEST') && GSX_LOCAL_TEST && defined('GSX_TEST_MAIL_FILE');
if (!$test && !GSX_PORTAL_MAIL_READY) { fwrite(STDERR,"Account mail is not configured; queue retained.\n"); exit(2); }
$db=gsx_db();
if ((int)$db->query("SELECT GET_LOCK('gsx_account_mail_worker',0)")->fetchColumn()!==1) exit(0);
try {
  $jobs=$db->query('SELECT id,user_id,purpose FROM account_mail_queue WHERE sent_at IS NULL AND attempts<5 AND next_attempt_at<=NOW() ORDER BY id LIMIT 50')->fetchAll();
  foreach($jobs as $job) {
    $db->beginTransaction();
    $q=$db->prepare('SELECT email,email_verified_at,account_access,account_status FROM users WHERE id=? FOR UPDATE');$q->execute([$job['user_id']]);$u=$q->fetch();
    $eligible=$u && $u['account_access']!=='suspended' && $u['account_status']!=='suspended' && ($job['purpose']==='verify'?!$u['email_verified_at']:(bool)$u['email_verified_at']);
    if (!$eligible) { $db->prepare('UPDATE account_mail_queue SET sent_at=NOW() WHERE id=?')->execute([$job['id']]);$db->commit();continue; }
    $raw=bin2hex(random_bytes(32));
    $db->prepare('INSERT INTO account_tokens(user_id,purpose,token_hash,expires_at) VALUES (?,?,?,NOW()+INTERVAL 30 MINUTE)')->execute([$job['user_id'],$job['purpose'],hash('sha256',$raw)]);
    $db->prepare('UPDATE account_mail_queue SET attempts=attempts+1,next_attempt_at=NOW()+INTERVAL 5 MINUTE WHERE id=?')->execute([$job['id']]);
    $db->commit();
    $url=rtrim(GSX_SITE_BASE_URL,'/').'/account.php#'.$job['purpose'].'='.$raw;
    $sent=$test
      ? (getenv('GSX_TEST_MAIL_FAILURE') !== 'yes' && file_put_contents(GSX_TEST_MAIL_FILE,json_encode(['email'=>$u['email'],'purpose'=>$job['purpose'],'url'=>$url])."\n",FILE_APPEND|LOCK_EX)!==false)
      : mail($u['email'],'GSX account '.$job['purpose'],"Open within 30 minutes:\n".$url,'From: '.GSX_PORTAL_MAIL_FROM);
    if($sent)$db->prepare('UPDATE account_mail_queue SET sent_at=NOW() WHERE id=?')->execute([$job['id']]);
    else error_log('[account-mail] delivery failed; retry queued');
  }
} finally { if($db->inTransaction())$db->rollBack();$db->query("SELECT RELEASE_LOCK('gsx_account_mail_worker')"); }
