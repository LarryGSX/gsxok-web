<?php
// Never load this from production or permit credentials/remote databases.
if (getenv('GSX_FICTIONAL_TEST') !== 'yes') throw new RuntimeException('Fictional test opt-in required');
define('GSX_LOCAL_TEST', true);
define('GSX_DB_HOST','127.0.0.1;port=53317');
define('GSX_DB_NAME','gsx_account_fictional');
define('GSX_DB_USER','gsx_fictional');
define('GSX_DB_PASS','fictional-local-only');
define('GSX_SITE_BASE_URL','http://127.0.0.1:4318');
define('GSX_TEST_MAIL_FILE',getenv('GSX_FICTIONAL_MAIL'));
if(getenv('GSX_TEST_DIRECTORY_PUBLIC_KEY'))define('GSX_DIRECTORY_PUBLIC_KEY_FILE',getenv('GSX_TEST_DIRECTORY_PUBLIC_KEY'));
ini_set('display_errors','0');
