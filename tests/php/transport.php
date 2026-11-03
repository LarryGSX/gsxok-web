<?php
if(PHP_SAPI!=='cli')exit(1);
$_SERVER['HTTPS']='off';
$_SERVER['HTTP_X_FORWARDED_PROTO']='https';
$_SERVER['REMOTE_ADDR']='192.0.2.1';
require __DIR__.'/../../portal-security.php';
gsx_start_session();
throw new RuntimeException('Forwarded TLS header was incorrectly trusted');
