<?php
require_once __DIR__.'/account-lib.php';

function gsx_review_error(int $status, string $error): void {
    if (gsx_db()->inTransaction()) gsx_db()->rollBack();
    gsx_json_response($status, ['ok'=>false,'error'=>$error]);
}

function gsx_review_reason(array $body): string {
    $reason=is_string($body['reason']??null)?trim($body['reason']):'';
    if (mb_strlen($reason)<8 || mb_strlen($reason)>1000) gsx_review_error(400,'review_reason_required');
    return $reason;
}

function gsx_review_reauthenticate(array $admin, array $body): void {
    // Caller holds the staff row until commit. Disable/password/version changes
    // cannot race a privileged decision after the HTTP session check.
    $q=gsx_db()->prepare('SELECT password_hash,status,auth_version FROM admins WHERE id=? FOR UPDATE');
    $q->execute([$admin['id']]); $row=$q->fetch();
    if (!$row || $row['status']!=='active' || (int)$row['auth_version']!==(int)($_SESSION['auth_version']??0)
        || !is_string($body['currentPassword']??null) || !gsx_verify_password($body['currentPassword'],$row['password_hash'])) {
        gsx_review_error(403,'reauthentication_required');
    }
}

function gsx_review_audit(int $userId, string $action, array $detail): void {
    gsx_db()->prepare('INSERT INTO account_audit(actor_admin_id,target_user_id,action,detail_json) VALUES (?,?,?,?)')
        ->execute([$_SESSION['admin_id'],$userId,$action,json_encode($detail,JSON_THROW_ON_ERROR)]);
}

function gsx_profile_revision(int $companyId, bool $locking=false): array {
    $q=gsx_db()->prepare("SELECT d.id,r.profile_json FROM account_profile_decisions d JOIN account_profile_requests r ON r.id=d.request_id WHERE d.company_id=? AND d.decision='approved' ORDER BY d.id DESC LIMIT 1".($locking?' FOR UPDATE':''));
    $q->execute([$companyId]); $row=$q->fetch();
    return $row?['version'=>(int)$row['id'],'profile'=>json_decode($row['profile_json'],true,512,JSON_THROW_ON_ERROR)]:['version'=>0,'profile'=>null];
}

function gsx_directory_receipt(string $receipt, array $company, int $userId, string $customerId): array {
    if (!defined('GSX_DIRECTORY_PUBLIC_KEY_FILE') || !is_file(GSX_DIRECTORY_PUBLIC_KEY_FILE) || !function_exists('openssl_verify')) gsx_review_error(503,'directory_verification_unavailable');
    if (strlen($receipt)>8192 || !preg_match('/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/D',$receipt,$parts)) gsx_review_error(400,'invalid_directory_receipt');
    $decode=static function(string $s) {
        $bytes=base64_decode(strtr($s,'-_','+/'),true);
        return $bytes!==false && rtrim(strtr(base64_encode($bytes),'+/','-_'),'=')===$s?$bytes:false;
    };
    $payload=$decode($parts[1]); $signature=$decode($parts[2]);
    $key=file_get_contents(GSX_DIRECTORY_PUBLIC_KEY_FILE);
    if ($payload===false || $signature===false || openssl_verify($parts[1],$signature,$key,OPENSSL_ALGO_SHA256)!==1) gsx_review_error(400,'invalid_directory_receipt');
    $p=json_decode($payload,true); $now=time();
    if (!is_array($p) || ($p['version']??null)!==1 || ($p['issuer']??null)!=='gsx2-directory-export'
        || ($p['audience']??null)!==rtrim(GSX_SITE_BASE_URL,'/') || ($p['customerId']??null)!==$customerId
        || ($p['companyId']??null)!==(int)$company['id'] || ($p['accountId']??null)!==$userId
        || ($p['legacyCompanyId']??null)!==($company['legacy_id']===null?null:(int)$company['legacy_id'])
        || ($p['legacyUserId']??null)!==($company['legacy_user_id']===null?null:(int)$company['legacy_user_id'])
        || !is_int($p['issuedAt']??null) || !is_int($p['expiresAt']??null)
        || $p['issuedAt']>$now+30 || $p['issuedAt']<$now-900 || $p['expiresAt']<=$now
        || $p['expiresAt']>$p['issuedAt']+900 || $p['expiresAt']<=$p['issuedAt']
        || !preg_match('/^[a-f0-9]{64}$/D',$p['sourceHash']??'')
        || !preg_match('/^[a-f0-9-]{36}$/D',$p['receiptId']??'')) gsx_review_error(400,'invalid_directory_receipt');
    return $p+['payloadHash'=>hash('sha256',$payload)];
}
