<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/bootstrap.php';
require_once GSX_COMPAT_PUBLIC_DIR.'/account-lib.php';
$passwordFile=__DIR__.'/fixture-password.txt';
if(!is_file($passwordFile))gsx_compat_abort('private_fixture_password_required');
$password=rtrim(file_get_contents($passwordFile),"\r\n");
if(!gsx_valid_password($password))gsx_compat_abort('fixture_password_policy');
$db=gsx_db();
foreach($db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table){
    if($table==='gsx_compat_guard')continue;
    if(!preg_match('/^[a-z_]+$/D',$table)||(int)$db->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn()!==0)gsx_compat_abort('seed_requires_empty_test_schema');
}
$db->beginTransaction();
try{
    $hash=gsx_hash_password($password);
    $q=$db->prepare("INSERT INTO users(first_name,last_name,address,city,state,zip,omma_license,email,phone,password_hash,account_status,account_access,email_verified_at,legacy_id) VALUES ('Fictional',?,'1 Example St','Example','OK','00000','FICTIONAL-NOT-VALID',?,'000',?,'pending',?,?,?)");
    $q->execute(['Customer A','customer-a@gsx-test.invalid',$hash,'pending',null,9001]);
    $q->execute(['Customer B','customer-b@gsx-test.invalid',$hash,'approved',date('Y-m-d H:i:s'),9002]);
    $db->prepare("INSERT INTO admins(email,first_name,password_hash,must_change_password) VALUES ('staff@gsx-test.invalid','Fictional Reviewer',?,0)")->execute([$hash]);
    $q=$db->prepare("INSERT INTO companies(user_id,name,address,city,state,zip,omma_license,email,phone,legacy_id) VALUES (?,?,'1 Example St','Example','OK','00000','FICTIONAL-NOT-VALID',?,'000',?)");
    $q->execute([1,'Fictional Company A','customer-a@gsx-test.invalid',9101]);
    $q->execute([2,'Fictional Company B','customer-b@gsx-test.invalid',9102]);
    $db->commit();echo "Created two fictional customers/companies and one fictional reviewer. No passwords printed.\n";
}catch(Throwable $e){if($db->inTransaction())$db->rollBack();gsx_compat_abort('fictional_seed_failed');}
