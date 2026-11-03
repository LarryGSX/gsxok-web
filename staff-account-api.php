<?php
require_once __DIR__.'/admin-security.php';
require_once __DIR__.'/account-review-lib.php';
gsx_start_session(); $admin=gsx_require_admin(); $db=gsx_db();

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $resource=$_GET['resource']??'accounts';
    $page=filter_var($_GET['page']??1,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>10000]]);
    if (!$page) gsx_review_error(400,'invalid_page');
    $offset=($page-1)*25;
    if ($resource==='accounts') {
        $rows=$db->query('SELECT id,first_name,last_name,email,account_access,email_verified_at,legacy_id,auth_version FROM users ORDER BY id DESC LIMIT 25 OFFSET '.$offset)->fetchAll();
    } elseif ($resource==='profiles') {
        $rows=$db->query('SELECT r.*,c.name AS company_name,u.email,d.decision,d.reason,d.reviewer_id FROM account_profile_requests r JOIN companies c ON c.id=r.company_id AND c.user_id=r.user_id JOIN users u ON u.id=r.user_id LEFT JOIN account_profile_decisions d ON d.request_id=r.id ORDER BY r.id DESC LIMIT 25 OFFSET '.$offset)->fetchAll();
        foreach($rows as &$row) { $row['profile']=json_decode($row['profile_json'],true); unset($row['profile_json']); $row['currentProfile']=gsx_profile_revision((int)$row['company_id']); }
        foreach($rows as &$row) {
            if ($row['currentProfile']['profile']===null) {
                $baseline=$db->prepare('SELECT name,address,city,state,zip,phone,email FROM companies WHERE id=?');
                $baseline->execute([$row['company_id']]);$row['currentProfile']['profile']=$baseline->fetch();
            }
        }
        unset($row);
    } elseif (in_array($resource,['companies','history'],true)) {
        $id=filter_var($_GET['accountId']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        if (!$id) gsx_review_error(400,'invalid_fields');
        if ($resource==='companies') {
            $q=$db->prepare('SELECT c.id,c.name,c.legacy_id,c.user_id,i.customer_uuid,COALESCE(i.version,0) AS link_version FROM companies c LEFT JOIN account_company_identity i ON i.company_id=c.id WHERE c.user_id=? ORDER BY c.id LIMIT 25 OFFSET '.$offset);
        } else {
            $q=$db->prepare('SELECT a.id,a.actor_admin_id,a.actor_user_id,a.action,a.detail_json,a.created_at FROM account_audit a WHERE a.target_user_id=? ORDER BY a.id DESC LIMIT 25 OFFSET '.$offset);
        }
        $q->execute([$id]); $rows=$q->fetchAll();
    } else gsx_review_error(400,'invalid_resource');
    gsx_admin_json(200,['ok'=>true,'rows'=>$rows,'page'=>$page,'csrfToken'=>gsx_csrf_token(),'capabilities'=>['transactions'=>false]]);
}

$b=gsx_account_body(); $reason=gsx_review_reason($b); $action=$b['action']??'';
if (!in_array($action,['profile-review','link','unlink'],true)) gsx_review_error(400,'invalid_fields');
gsx_account_throttle('staff-reauth',$admin['email']);
$db->beginTransaction();
try {
    gsx_review_reauthenticate($admin,$b);
    if ($action==='profile-review') {
        if (!is_int($b['requestId']??null) || !in_array($b['decision']??null,['approved','rejected'],true)) gsx_review_error(400,'invalid_fields');
        $q=$db->prepare('SELECT r.*,c.user_id AS owner_id FROM account_profile_requests r JOIN companies c ON c.id=r.company_id WHERE r.id=?'); $q->execute([$b['requestId']]); $request=$q->fetch();
        if (!$request || (int)$request['owner_id']!==(int)$request['user_id']) gsx_review_error(404,'not_found');
        $q=$db->prepare('SELECT id FROM companies WHERE id=? FOR UPDATE');$q->execute([$request['company_id']]);
        $q=$db->prepare('SELECT id FROM account_profile_decisions WHERE request_id=?');$q->execute([$request['id']]);
        if ($q->fetch()) gsx_review_error(409,'already_reviewed');
        $previous=gsx_profile_revision((int)$request['company_id'],true);
        if ($b['decision']==='approved' && $previous['version']!==(int)$request['base_revision']) gsx_review_error(409,'stale_profile');
        $db->prepare('INSERT INTO account_profile_decisions(request_id,company_id,decision,reviewer_id,reason) VALUES (?,?,?,?,?)')->execute([$request['id'],$request['company_id'],$b['decision'],$admin['id'],$reason]);
        gsx_review_audit((int)$request['user_id'],'profile_'.$b['decision'],['requestId'=>(int)$request['id'],'companyId'=>(int)$request['company_id'],'reason'=>$reason,'previousRevision'=>$previous['version']]);
    } else {
        if (!is_int($b['companyId']??null) || !is_int($b['expectedVersion']??null)) gsx_review_error(400,'invalid_fields');
        $q=$db->prepare('SELECT c.id,c.user_id,c.legacy_id,u.legacy_id AS legacy_user_id FROM companies c JOIN users u ON u.id=c.user_id WHERE c.id=? FOR UPDATE');$q->execute([$b['companyId']]); $company=$q->fetch();
        if (!$company) gsx_review_error(404,'not_found');
        $db->prepare('INSERT IGNORE INTO account_company_identity(company_id) VALUES (?)')->execute([$company['id']]);
        $q=$db->prepare('SELECT customer_uuid,version FROM account_company_identity WHERE company_id=? FOR UPDATE');$q->execute([$company['id']]);$link=$q->fetch();
        if ((int)$link['version']!==$b['expectedVersion']) gsx_review_error(409,'stale_link');
        $customerId=null; $sourceHash=null;
        if ($action==='link') {
            if ($link['customer_uuid']!==null) gsx_review_error(409,'existing_link_must_be_revoked');
            $customerId=$b['customerId']??null;
            if (!is_string($customerId) || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/D',$customerId)) gsx_review_error(400,'invalid_fields');
            $receipt=gsx_directory_receipt(is_string($b['receipt']??null)?$b['receipt']:'',$company,(int)$company['user_id'],$customerId);
            $sourceHash=$receipt['sourceHash'];
            $db->prepare('INSERT INTO account_link_receipts(receipt_uuid,payload_hash) VALUES (?,?)')->execute([$receipt['receiptId'],$receipt['payloadHash']]);
        } elseif ($link['customer_uuid']===null) gsx_review_error(409,'no_existing_link');
        $version=(int)$link['version']+1;
        $db->prepare('UPDATE account_company_identity SET customer_uuid=?,version=? WHERE company_id=?')->execute([$customerId,$version,$company['id']]);
        $db->prepare('INSERT INTO account_link_history(company_id,version,previous_uuid,customer_uuid,reviewer_id,reason,source_hash,legacy_user_id,legacy_company_id) VALUES (?,?,?,?,?,?,?,?,?)')->execute([$company['id'],$version,$link['customer_uuid'],$customerId,$admin['id'],$reason,$sourceHash,$company['legacy_user_id'],$company['legacy_id']]);
        gsx_review_audit((int)$company['user_id'],$action==='link'?'customer_linked':'customer_unlinked',['companyId'=>(int)$company['id'],'previous'=>$link['customer_uuid'],'customerId'=>$customerId,'version'=>$version,'reason'=>$reason,'sourceHash'=>$sourceHash]);
    }
    $db->commit();
} catch(PDOException $e) {
    if ($db->inTransaction()) $db->rollBack();
    if ($e->getCode()==='23000') gsx_review_error(409,'link_or_review_conflict');
    throw $e;
} catch(Throwable $e) { if($db->inTransaction())$db->rollBack(); throw $e; }
gsx_admin_json(200,['ok'=>true,'capabilities'=>['transactions'=>false]]);
