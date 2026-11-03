<?php
// PACKAGE-ONLY safety adapter. Not a production account feature/configuration.
function gsx_compat_abort(string $code): never {
    if(PHP_SAPI==='cli'){fwrite(STDERR,"Compatibility test blocked: ".$code."\n");exit(2);}
    @error_log('Compatibility guard blocked: '.$code."\n",3,__DIR__.'/logs/guard.log');
    http_response_code(503);header('Content-Type: application/json');echo json_encode(['ok'=>false,'error'=>'compatibility_test_unavailable']);exit;
}
ini_set('display_errors','0');
$settingsFile=__DIR__.'/settings.php';
if(!is_file($settingsFile))gsx_compat_abort('settings_missing');
$s=require $settingsFile;
$run='__RUN__';
if(!is_array($s)||($s['enabled']??false)!==true||($s['runId']??null)!==$run)gsx_compat_abort('test_not_enabled');
if(!preg_match('/^[a-zA-Z0-9]+_gsxcompat_'.preg_quote($run,'/').'(?:_r[1-9][0-9]?)?$/D',$s['dbName']??'')
 ||!preg_match('/^[a-zA-Z0-9]+_gct[0-9]{2}$/D',$s['dbUser']??'')
 ||!in_array($s['dbHost']??'', ['localhost','127.0.0.1'],true)
 ||!is_int($s['dbPort']??null)||$s['dbPort']<1||$s['dbPort']>65535
 ||!is_string($s['dbPassword']??null)||$s['dbPassword']==='')gsx_compat_abort('fictional_database_namespace_required');
$origin=$s['origin']??'';$parts=is_string($origin)?parse_url($origin):false;
if(!$parts||($parts['scheme']??'')!=='https'||!isset($parts['host'])||isset($parts['user'])||isset($parts['pass'])
 ||isset($parts['path'])||isset($parts['query'])||isset($parts['fragment']))gsx_compat_abort('exact_https_origin_required');
$prefix='/gsx-account-compat-'.$run.'/';
$public=realpath($s['publicDirectory']??'');$private=realpath(__DIR__);
if(!$public||!is_dir($public)||$private===false||str_starts_with($private.DIRECTORY_SEPARATOR,$public.DIRECTORY_SEPARATOR))gsx_compat_abort('invalid_private_location');
if(session_status()!==PHP_SESSION_NONE || (bool)ini_get('session.auto_start'))gsx_compat_abort('shared_session_auto_start');
if(ini_get('session.save_handler')!=='files'||ini_get('session.cookie_domain')!=='')gsx_compat_abort('private_host_only_file_sessions_required');
foreach(['sessions','captures','logs'] as $folder)if(!is_dir(__DIR__.'/'.$folder)||!is_writable(__DIR__.'/'.$folder))gsx_compat_abort('private_directories_required');
ini_set('session.save_path',__DIR__.'/sessions');
ini_set('session.gc_maxlifetime','28800');
ini_set('error_log',__DIR__.'/logs/php-error.log');
if(PHP_SAPI!=='cli'){
    $documentRoot=realpath($_SERVER['DOCUMENT_ROOT']??'');
    if(!$documentRoot||str_starts_with($private.DIRECTORY_SEPARATOR,$documentRoot.DIRECTORY_SEPARATOR))gsx_compat_abort('private_files_inside_document_root');
    if(empty($_SERVER['REMOTE_USER'])||empty($_SERVER['HTTPS'])||$_SERVER['HTTPS']==='off')gsx_compat_abort('authenticated_https_required');
    $expectedHost=strtolower($parts['host'].(isset($parts['port'])?':'.$parts['port']:''));
    if(strtolower($_SERVER['HTTP_HOST']??'')!==$expectedHost||!str_starts_with(parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH)??'',$prefix))gsx_compat_abort('wrong_test_url');
    if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
        if(($_SERVER['HTTP_ORIGIN']??'')!==$origin)gsx_compat_abort('wrong_test_origin');
        $body=json_decode(file_get_contents('php://input',false,null,0,16385),true);
        if(is_array($body))foreach([$body['email']??null,$body['profile']['email']??null] as $email){
            if($email!==null&&(!is_string($email)||!str_ends_with(strtolower($email),'@gsx-test.invalid')))gsx_compat_abort('fictional_email_only');
        }
    }
}
define('GSX_DB_HOST',$s['dbHost'].';port='.$s['dbPort']);define('GSX_DB_NAME',$s['dbName']);define('GSX_DB_USER',$s['dbUser']);define('GSX_DB_PASS',$s['dbPassword']);
define('GSX_SITE_BASE_URL',$origin);define('GSX_PORTAL_MAIL_READY',false);
define('GSX_COMPAT_COOKIE_NAME','__Secure-gsx-compat-'.$run);define('GSX_COMPAT_COOKIE_PATH',$prefix);
define('GSX_COMPAT_PUBLIC_DIR',$public);define('GSX_COMPAT_BASE_URL',$origin.$prefix);
define('GSX_DIRECTORY_PUBLIC_KEY_FILE',__DIR__.'/directory-public.pem');
if(defined('GSX_LOCAL_TEST')||defined('GSX_TEST_MAIL_FILE'))gsx_compat_abort('incompatible_local_test_flags');
try{
    $pdo=new PDO('mysql:host='.GSX_DB_HOST.';dbname='.GSX_DB_NAME.';charset=utf8mb4',GSX_DB_USER,GSX_DB_PASS,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $marker=$pdo->query('SELECT run_id,source_commit FROM gsx_compat_guard WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if(!$marker||$marker['run_id']!==$run||$marker['source_commit']!=='__COMMIT__')gsx_compat_abort('database_marker_mismatch');
    foreach(['users','admins'] as $table){
        if((int)$pdo->query("SELECT COUNT(*) FROM ".$table." WHERE LOWER(email) NOT LIKE '%@gsx-test.invalid'")->fetchColumn()!==0)gsx_compat_abort('nonfictional_account_present');
    }
}catch(Throwable $e){gsx_compat_abort('test_database_not_ready');}
unset($pdo,$s);
function gsx_compat_capture(string $email,string $purpose,string $url): bool {
    if(PHP_SAPI!=='cli'||!str_ends_with(strtolower($email),'@gsx-test.invalid')||!str_starts_with($url,GSX_COMPAT_BASE_URL))gsx_compat_abort('unsafe_capture_job');
    if(in_array('--simulate-failure',$_SERVER['argv']??[],true))return false;
    $file=__DIR__.'/captures/mail.jsonl';
    $result=file_put_contents($file,json_encode(['recipient'=>$email,'purpose'=>$purpose,'url'=>$url],JSON_THROW_ON_ERROR)."\n",FILE_APPEND|LOCK_EX);
    if($result!==false)chmod($file,0600);
    return $result!==false;
}
