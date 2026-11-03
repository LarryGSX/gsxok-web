<?php
if (PHP_SAPI!=='cli') exit(1);
require __DIR__.'/bootstrap.php'; require __DIR__.'/../../account-lib.php';
$input=json_decode(stream_get_contents(STDIN),true);
$q=gsx_db()->prepare($input['sql']); $q->execute($input['params']??[]);
echo json_encode($q->columnCount()?$q->fetchAll():['affected'=>$q->rowCount()]);
