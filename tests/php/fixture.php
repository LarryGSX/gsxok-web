<?php
if (PHP_SAPI !== 'cli') exit(1);
require __DIR__.'/bootstrap.php';
require __DIR__.'/../../account-lib.php';
$db=gsx_db();
if (in_array('--reset-fictional',$argv,true)) {
    if ($db->query('SELECT DATABASE()')->fetchColumn()!=='gsx_account_fictional') throw new RuntimeException('Wrong fictional schema');
    $db->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach($db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
        if(!preg_match('/^[a-z_]+$/D',$table))throw new RuntimeException('Unexpected fixture table');
        $db->exec('DROP TABLE `'.$table.'`');
    }
    $db->exec('SET FOREIGN_KEY_CHECKS=1');
}
if (count($db->query('SHOW TABLES')->fetchAll())) throw new RuntimeException('Refuse nonempty test database');
$db->exec(file_get_contents(__DIR__.'/../../schema.sql'));
$db->exec(file_get_contents(__DIR__.'/../../admin-setup.sql'));
$hash=gsx_hash_password('Fictional password 42!');
$db->prepare("INSERT INTO users(first_name,last_name,address,city,state,zip,omma_license,email,phone,password_hash,account_status,legacy_id) VALUES ('Fictional','Cedar','1 Example St','Example','OK','00000','FICTIONAL','cedar@example.invalid','000',?,'active',9001),('Fictional','Prairie','2 Example St','Example','OK','00000','FICTIONAL','prairie@example.invalid','000',?,'active',9002)")->execute([$hash,$hash]);
$db->exec("INSERT INTO companies(user_id,name,address,city,state,zip,omma_license,email,phone,legacy_id) VALUES (1,'Fictional Cedar','1 Example','Example','OK','00000','FICTIONAL','cedar@example.invalid','000',9101),(2,'Fictional Prairie','2 Example','Example','OK','00000','FICTIONAL','prairie@example.invalid','000',9102)");
$before=$db->query('SELECT * FROM users ORDER BY id')->fetchAll();
$companies=$db->query('SELECT * FROM companies ORDER BY id')->fetchAll();
$db->exec(file_get_contents(__DIR__.'/../../account-migration-001.sql'));
$db->exec(file_get_contents(__DIR__.'/../../account-migration-002.sql'));
foreach($db->query('SELECT * FROM users ORDER BY id')->fetchAll() as $i=>$row) foreach($before[$i] as $key=>$value) if($row[$key]!==$value) throw new RuntimeException('Migration modified original column '.$key);
if ($companies!==$db->query('SELECT * FROM companies ORDER BY id')->fetchAll()) throw new RuntimeException('Company preservation failed');
$db->exec('UPDATE users SET email_verified_at=NOW()');
$db->prepare("INSERT INTO admins(email,first_name,password_hash,must_change_password) VALUES ('reviewer@example.invalid','Fictional',?,0)")->execute([$hash]);
echo "PASS additive migration preserves original account columns, credentials, company records and legacy mappings\n";
