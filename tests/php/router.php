<?php
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(in_array($path,['/staff-accounts.php','/staff-account-ui.js','/staff-account-api.php'],true))return false;
if (preg_match('#^/account-fonts/(manrope|space-grotesk)\.woff2$#D',$path)) return false;
if ($path==='/test-session-clock') { require __DIR__.'/session-probe.php'; return true; }
$allowed=['/account.php','/account-ui.js','/account-ui.css','/account-api.php','/account-token.php','/admin-account-access.php','/login.php','/logout.php','/register.php','/forgot-password.php','/reset-password.php','/session-check.php','/csrf-token.php','/admin-change-password.php'];
if (!in_array($path,$allowed,true)) { http_response_code(404); exit; }
return false;
