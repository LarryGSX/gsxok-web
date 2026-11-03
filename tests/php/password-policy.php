<?php
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/../../portal-security.php';
echo json_encode(array_map('gsx_valid_password',json_decode(stream_get_contents(STDIN),true)));
