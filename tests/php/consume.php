<?php
if (PHP_SAPI!=='cli') exit(1);
require __DIR__.'/bootstrap.php'; require __DIR__.'/../../account-lib.php';
$input=json_decode(stream_get_contents(STDIN),true);
echo json_encode(gsx_account_token('reset',$input['token'],'Race replacement 42!'));
