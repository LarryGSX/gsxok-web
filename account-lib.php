<?php
require_once __DIR__ . '/portal-security.php';

function gsx_account_body(): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') gsx_json_response(405, ['ok'=>false,'error'=>'method_not_allowed']);
    gsx_require_csrf();
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) gsx_json_response(415, ['ok'=>false,'error'=>'invalid_content_type']);
    $raw = file_get_contents('php://input', false, null, 0, 16385);
    if (strlen($raw) > 16384) gsx_json_response(413, ['ok'=>false,'error'=>'request_too_large']);
    $body = json_decode($raw, true);
    if (!is_array($body)) gsx_json_response(400, ['ok'=>false,'error'=>'invalid_request']);
    return $body;
}
function gsx_account_user(): array {
    $id = $_SESSION['user_id'] ?? 0;
    $q = gsx_db()->prepare('SELECT id,first_name,last_name,email,account_access,email_verified_at,auth_version FROM users WHERE id=?');
    $q->execute([$id]); $u = $q->fetch();
    if (!$u || $u['account_access'] !== 'approved' || !$u['email_verified_at']) gsx_json_response(401, ['ok'=>false,'error'=>'not_signed_in']);
    return $u;
}
function gsx_account_audit(int $target, string $action): void {
    gsx_db()->prepare('INSERT INTO account_audit (actor_user_id,actor_admin_id,target_user_id,action) VALUES (?,?,?,?)')
      ->execute([$_SESSION['user_id']??null,$_SESSION['admin_id']??null,$target,$action]);
}
function gsx_account_throttle(string $action, string $email): void {
    $db=gsx_db(); $hash=hash('sha256',$email); $ip=gsx_client_ip();
    // One DB mutex makes the check+record atomic across PHP workers.
    $lock=$db->query("SELECT GET_LOCK('gsx_account_requests', 5)")->fetchColumn();
    if ((int)$lock !== 1) gsx_json_response(503,['ok'=>false,'error'=>'temporarily_unavailable']);
    try {
      $q=$db->prepare('SELECT COUNT(*) FROM account_requests WHERE created_at > NOW() - INTERVAL 15 MINUTE AND (email_hash=? OR ip_address=?)');
      $q->execute([$hash,$ip]); $limited=(int)$q->fetchColumn()>=10;
      if (!$limited) $db->prepare('INSERT INTO account_requests(action,email_hash,ip_address) VALUES (?,?,?)')->execute([$action,$hash,$ip]);
    } finally { $db->query("SELECT RELEASE_LOCK('gsx_account_requests')"); }
    if ($limited) gsx_json_response(429,['ok'=>false,'error'=>'rate_limited']);
}
function gsx_account_send(int $userId, string $email, string $purpose): void {
    // Request latency never includes SMTP delivery. No raw token in the queue.
    gsx_db()->prepare('INSERT INTO account_mail_queue(user_id,purpose,next_attempt_at) VALUES (?,?,NOW())')->execute([$userId,$purpose]);
}
function gsx_account_email(array $body): string {
    $email=is_string($body['email']??null)?strtolower(trim($body['email'])):'';
    if (strlen($email)>255 || !filter_var($email,FILTER_VALIDATE_EMAIL)) gsx_json_response(400,['ok'=>false,'error'=>'invalid_fields']);
    return $email;
}
function gsx_account_token(string $purpose, string $raw, ?string $password=null): bool {
    if (!preg_match('/^[a-f0-9]{64}$/D',$raw)) return false;
    $db=gsx_db(); $db->beginTransaction();
    try {
      // First find identity, then lock the user before the token: same lock order
      // as password changes/revocation. All eligibility is rechecked under locks.
      $q=$db->prepare('SELECT user_id FROM account_tokens WHERE token_hash=? AND purpose=?'); $q->execute([hash('sha256',$raw),$purpose]); $id=$q->fetchColumn();
      if (!$id) { $db->rollBack(); return false; }
      $q=$db->prepare('SELECT * FROM users WHERE id=? FOR UPDATE'); $q->execute([$id]); $u=$q->fetch();
      $q=$db->prepare('SELECT id FROM account_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>NOW() FOR UPDATE'); $q->execute([hash('sha256',$raw),$purpose]); $token=$q->fetchColumn();
      if (!$token || $u['account_access']==='suspended' || $u['account_status']==='suspended') { $db->rollBack(); return false; }
      if ($purpose==='verify') {
        $db->prepare('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=?')->execute([$id]);
      } else {
        if (!$u['email_verified_at']) { $db->rollBack(); return false; }
        $db->prepare('UPDATE users SET password_hash=?,auth_version=auth_version+1 WHERE id=?')->execute([gsx_hash_password($password),$id]);
        // Never activate account_status or transaction access from a reset.
        $db->prepare('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=? AND used_at IS NULL')->execute([$id]);
      }
      $db->prepare('UPDATE account_tokens SET used_at=NOW() WHERE user_id=? AND purpose=? AND used_at IS NULL')->execute([$id,$purpose]);
      $db->prepare('UPDATE account_mail_queue SET sent_at=NOW() WHERE user_id=? AND purpose=? AND sent_at IS NULL')->execute([$id,$purpose]);
      gsx_account_audit((int)$id,$purpose==='verify'?'email_verified':'password_reset');
      $db->commit(); return true;
    } catch(Throwable $e) { if($db->inTransaction()) $db->rollBack(); throw $e; }
}
