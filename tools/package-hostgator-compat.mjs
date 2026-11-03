// Build a blocked-by-default, account-only compatibility kit. Never deploys.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,readdir,stat} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source='df16c07f724a6d4067c7363e9252a725bd6b1ca5';
const out=resolve(process.argv[2]??'');
if(!process.argv[2]||!relative(root,out).startsWith('..'))throw Error('Supply a NEW output directory outside the website checkout');
const run=process.argv[3]??randomBytes(4).toString('hex');if(!/^[a-f0-9]{8}$/.test(run))throw Error('Run ID must be eight lowercase hexadecimal characters');const substitutions=s=>s.replaceAll('__RUN__',run).replaceAll('__COMMIT__',source);
const {zipSync}=createRequire(resolve(root,'../gsx-2/package.json'))('fflate');
const digest=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out);const entries=[];
async function put(path,data,origin=null,changes=[]){const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);await mkdir(dirname(resolve(out,path)),{recursive:true});await writeFile(resolve(out,path),bytes);entries.push({path,bytes:bytes.length,sha256:digest(bytes),source:origin,changes});}
const original=path=>execFileSync('git',['show',`${source}:${path}`],{cwd:root,maxBuffer:8*1024*1024});
function once(text,from,to){if(text.split(from).length!==2)throw Error('Reviewed source no longer matches expected adapter: '+from.slice(0,45));return text.replace(from,to);}
const php=['account.php','staff-accounts.php','portal-config.php','portal-db.php','portal-security.php','account-lib.php','account-review-lib.php','login.php','logout.php','register.php','csrf-token.php','session-check.php','forgot-password.php','reset-password.php','account-token.php','account-api.php','admin-security.php','admin-account-access.php','staff-account-api.php','admin-change-password.php'];
for(const name of php){
 let text=original(name).toString('utf8').replaceAll('\r\n','\n');const changes=['Require private compatibility guard before application code'];
 text=once(text,'<?php',"<?php\nrequire_once __DIR__.'/compat-entry.php';");
 if(name==='portal-config.php'){
  const start=text.indexOf('$gsxPortalSecretsFile =');const end=text.indexOf('\n}',start)+2;
  if(start<0||end<start)throw Error('Secrets-loader adapter mismatch');text=text.slice(0,start)+text.slice(end);changes.push('Remove public secrets loader; private settings only');
  const a=text.indexOf('// ── Ordering');const b=text.indexOf('// ── Registration',a);if(a<0||b<a)throw Error('Config section mismatch');text=text.slice(0,a)+text.slice(b);changes.push('Exclude unrelated transaction configuration');
  text=once(text,'GSX Portal <contact@gsxok.com>','GSX Compatibility <noreply@gsx-test.invalid>');
 }
 if(name==='portal-security.php'){
  text=once(text,"session_name($local ? 'gsx_account_local' : '__Host-gsx-account');",'session_name(GSX_COMPAT_COOKIE_NAME);');
  text=once(text,"'path' => '/',","'path' => GSX_COMPAT_COOKIE_PATH,");changes.push('Use run-specific Secure cookie and subdirectory path');
 }
 if(name==='account-lib.php'){text=text.replaceAll('gsx_account_requests','gsx_compat_requests_'+run);changes.push('Namespace MySQL named mutex; no production lock contention');}
 if(name==='account.php'){text=once(text,'href="/"','href="account.php"');text=once(text,'<a href="mailto:contact@gsxok.com">Contact GSX</a>','Fictional compatibility test — email is captured privately');}
 if(name==='staff-accounts.php')text=once(text,'href="/account.php"','href="account.php"');
 await put('public/'+name,text,{commit:source,path:name,sha256:digest(original(name))},changes);
}
for(const name of ['account-ui.js','account-ui.css','staff-account-ui.js','account-fonts/manrope.woff2','account-fonts/space-grotesk.woff2','account-fonts/manrope-OFL.txt','account-fonts/space-grotesk-OFL.txt'])await put('public/'+name,original(name),{commit:source,path:name});
await put('public/compat-entry.php',`<?php\n$pointer=__DIR__.'/compat-location.php';\nif(!is_file($pointer)){http_response_code(503);exit('Compatibility test not configured.');}\n$private=require $pointer;\nif(!is_string($private)||!is_file($private.'/bootstrap.php')){http_response_code(503);exit('Private compatibility configuration missing.');}\nrequire_once $private.'/bootstrap.php';\n`);
await put('public/compat-location.php.example',`<?php\n// Install only as compat-location.php after approval. No credentials here.\nreturn '/home/CPANEL/gsx-compat-${run}';\n`);
const deny=`Options -Indexes\nDirectoryIndex account.php\nRewriteEngine Off\nRequire all denied\n`;
const internal='(compat-(entry|location)|portal-(config|db|security|secrets)|account-(lib|review-lib)|admin-security)';
const protectedFiles=`<FilesMatch "^${internal}\\.php$|\\.(sql|log|pem|jsonl|example|bak)$">\n  Require all denied\n</FilesMatch>\n`;
await put('public/.htaccess',deny+protectedFiles);
await put('install/htaccess.basic-auth.example',`# Replace ONLY the test directory's .htaccess after authorization.\n# Use the exact cPanel Directory Privacy-generated password-file path.\nOptions -Indexes\nDirectoryIndex account.php\nRewriteEngine Off\nAuthType Basic\nAuthName "GSX fictional compatibility ${run}"\nAuthUserFile "/ABSOLUTE/CPANEL_GENERATED_TEST_GATE_PATH"\nRequire valid-user\n${protectedFiles}`);
await put('install/00-guard.sql',`CREATE TABLE gsx_compat_guard(id TINYINT PRIMARY KEY,run_id VARCHAR(16) NOT NULL,source_commit CHAR(40) NOT NULL);\nINSERT INTO gsx_compat_guard VALUES (1,'${run}','${source}');\n`);
for(const [index,name]of ['schema.sql','admin-setup.sql','account-migration-001.sql','account-migration-002.sql'].entries())await put(`install/0${index+1}-${name}`,original(name).toString('utf8').split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n'),{commit:source,path:name},['Strip comments only; DDL/data statements unchanged']);
for(const [input,output]of [['private-bootstrap.php','bootstrap.php'],['settings.php.example','settings.php.example'],['seed-fictional.php','seed-fictional.php']])await put('private/'+output,substitutions(await readFile(resolve(root,'tools/hostgator-compat',input),'utf8')),{preparationTemplate:input});
for(const folder of ['sessions','captures','logs'])await put(`private/${folder}/.keep`,'');
let worker=original('account-mail-worker.php').toString('utf8').replaceAll('\r\n','\n');
worker=once(worker,"require_once __DIR__.'/account-lib.php';","require_once __DIR__.'/bootstrap.php';\nrequire_once GSX_COMPAT_PUBLIC_DIR.'/account-lib.php';");
worker=once(worker,"$test=defined('GSX_LOCAL_TEST') && GSX_LOCAL_TEST && defined('GSX_TEST_MAIL_FILE');",'$test=true; // Capture adapter has no sending transport.');
worker=worker.replaceAll('gsx_account_mail_worker','gsx_compat_mail_'+run);
const start=worker.indexOf('    $sent=$test');const end=worker.indexOf('\n    if($sent)',start);if(start<0||end<0)throw Error('Capture-worker adapter mismatch');
worker=worker.slice(0,start)+"    $sent=gsx_compat_capture($u['email'],$job['purpose'],$url);"+worker.slice(end);
worker=once(worker,"rtrim(GSX_SITE_BASE_URL,'/').'/account.php#'","GSX_COMPAT_BASE_URL.'account.php#'");
await put('private/capture-worker.php',worker,{commit:source,path:'account-mail-worker.php'},['CLI outside webroot','Remove mail transport entirely; capture function only','Subdirectory links','Run-specific MySQL mutex']);
await put('local-tools/gsx-customer-receipt.mjs',original('tools/gsx-customer-receipt.mjs'),{commit:source,path:'tools/gsx-customer-receipt.mjs'});
await put('local-tools/prepare-fictional-directory.mjs',await readFile(resolve(root,'tools/hostgator-compat/prepare-fictional-directory.mjs')),{preparationTemplate:'prepare-fictional-directory.mjs'});
await put('docs/INSTALL-RESTORE.md',substitutions(await readFile(resolve(root,'docs/hostgator-compatibility-test.md'),'utf8')));
await put('docs/ACCEPTANCE.md',substitutions(await readFile(resolve(root,'docs/hostgator-compatibility-acceptance.md'),'utf8')));
const publicFiles={};const privateFiles={};
for(const entry of entries){const bytes=await readFile(resolve(out,entry.path));if(entry.path.startsWith('public/'))publicFiles[entry.path.slice(7)]=bytes;else privateFiles[entry.path]=bytes;}
for(const [name,files]of [['public-upload.zip',publicFiles],['private-operator-kit.zip',privateFiles]]){const data=Buffer.from(zipSync(files,{level:6}));await writeFile(resolve(out,name),data);entries.push({path:name,bytes:data.length,sha256:digest(data)});}
await writeFile(resolve(out,'MANIFEST.json'),JSON.stringify({purpose:'ISOLATED FICTIONAL TEST ONLY; NO HOSTGATOR EXECUTION AUTHORIZED',sourceCommit:source,runId:run,testPath:'/gsx-account-compat-'+run+'/',cookieName:'__Secure-gsx-compat-'+run,entries},null,2)+'\n');
console.log(JSON.stringify({output:out,runId:run,sourceCommit:source,publicFiles:Object.keys(publicFiles).length,manifest:'MANIFEST.json'}));
