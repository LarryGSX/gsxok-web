// Local rehearsal only. Fixed loopback database; never accepts a remote target.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,stat} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {request as httpRequest} from 'node:http';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const pkg=resolve(process.argv[2]);const manifest=JSON.parse(await readFile(resolve(pkg,'MANIFEST.json'),'utf8'));const run=manifest.runId;
assert(/^[a-f0-9]{8}$/.test(run));assert.equal(manifest.sourceCommit,'df16c07f724a6d4067c7363e9252a725bd6b1ca5');
const php=process.env.GSX_TEST_PHP,ext=process.env.GSX_TEST_PHP_EXT,mysql=process.env.GSX_COMPAT_TEST_MYSQL,dump=process.env.GSX_COMPAT_TEST_DUMP;
assert(php&&ext&&mysql&&dump&&process.env.GSX_FICTIONAL_TEST==='yes');
const hash=b=>createHash('sha256').update(b).digest('hex');const pass=s=>console.log('PASS '+s);
const {unzipSync}=createRequire(resolve(root,'../gsx-2/package.json'))('fflate');
for(const entry of manifest.entries)assert.equal(hash(await readFile(resolve(pkg,entry.path))),entry.sha256,entry.path);
const publicZip=unzipSync(await readFile(resolve(pkg,'public-upload.zip')));const privateZip=unzipSync(await readFile(resolve(pkg,'private-operator-kit.zip')));
assert(publicZip['.htaccess']);assert(Buffer.from(publicZip['.htaccess']).toString().includes('Require all denied'));
assert(Object.keys(publicZip).every(n=>!/^shop-|^admin-(orders|customers|customer-status|customer-pricing)|^account-mail-worker|\.sql$|\.pem$|node_modules|\.env|portal-secrets/.test(n)));
assert(!Object.keys(privateZip).some(n=>/private\.pem$|settings\.php$|fixture-password\.txt$|mail\.jsonl$/.test(n)));
for(const [name,data]of [...Object.entries(publicZip),...Object.entries(privateZip)])if(name.endsWith('.php')){
 const text=Buffer.from(data).toString();assert(!/\bmail\s*\(/.test(text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*/g,'')),name+' has sending code');
}
pass('archive hashes/allowlists/default access denial; no sending worker, secrets or transaction files');
const suffix=randomBytes(2).toString('hex');const prefix='fict'+suffix;const db=prefix+'_gsxcompat_'+run,restored=db+'_r1';const user=prefix+'_gct01',user2=prefix+'_gct02';
const directory=resolve(root,'../.tools/compat-rehearsal-'+run+'-'+suffix);const pub=resolve(directory,'public'),priv=resolve(directory,'private');await mkdir(directory);await cp(resolve(pkg,'public'),pub,{recursive:true});await cp(resolve(pkg,'private'),priv,{recursive:true});
// OneDrive marks copied directories ReadOnly even when NTFS permits writes;
// clear that attribute on THESE disposable fixture directories only.
if(process.platform==='win32')for(const folder of ['sessions','captures','logs'])execFileSync('attrib',['-R',resolve(priv,folder)],{windowsHide:true});
const flags=['-n','-d',`extension_dir=${ext}`,'-d','extension=php_mbstring.dll','-d','extension=php_pdo_mysql.dll','-d','extension=php_openssl.dll','-d','disable_functions=mail'];
function admin(sql,database){return execFileSync(mysql,['--protocol=tcp','--host=127.0.0.1','--port=53317','--user=root','--password=fictional-root-only','--batch',...(database?[database]:[])],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});}
admin(`CREATE DATABASE ${db} CHARACTER SET utf8mb4; CREATE DATABASE ${restored} CHARACTER SET utf8mb4; CREATE USER '${user}'@'127.0.0.1' IDENTIFIED BY 'fictional-only'; CREATE USER '${user2}'@'127.0.0.1' IDENTIFIED BY 'fictional-only'; GRANT SELECT,INSERT,UPDATE,DELETE ON ${db}.* TO '${user}'@'127.0.0.1'; GRANT SELECT,INSERT,UPDATE,DELETE ON ${restored}.* TO '${user2}'@'127.0.0.1';`);
for(const name of ['00-guard.sql','01-schema.sql','02-admin-setup.sql','03-account-migration-001.sql','04-account-migration-002.sql'])admin(await readFile(resolve(pkg,'install',name),'utf8'),db);
async function settings(database=db,username=user,extra={}){
 const values={enabled:true,runId:run,origin:'https://gsxok.com',publicDirectory:pub,dbHost:'127.0.0.1',dbPort:53317,dbName:database,dbUser:username,dbPassword:'fictional-only',...extra};
 const encoded=Buffer.from(JSON.stringify(values)).toString('base64');await writeFile(resolve(priv,'settings.php'),`<?php return json_decode(base64_decode('${encoded}'),true);`);
}
await settings();await writeFile(resolve(pub,'compat-location.php'),`<?php return base64_decode('${Buffer.from(priv).toString('base64')}');`);await writeFile(resolve(priv,'fixture-password.txt'),'Fictional compatibility password 42!');
const cli=(file,args=[])=>execFileSync(php,[...flags,resolve(priv,file),...args],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
cli('seed-fictional.php');assert.throws(()=>cli('seed-fictional.php'));pass('fresh isolated schema/seeding works; reseeding refuses nonempty data');
await writeFile(resolve(priv,'query.php'),`<?php require __DIR__.'/bootstrap.php';require GSX_COMPAT_PUBLIC_DIR.'/account-lib.php';$i=json_decode(stream_get_contents(STDIN),true);try{$q=gsx_db()->prepare($i['sql']);$q->execute($i['params']??[]);echo json_encode($q->columnCount()?$q->fetchAll():['affected'=>$q->rowCount()]);}catch(Throwable $e){echo json_encode(['denied'=>true]);}`);
const sql=(text,params=[])=>JSON.parse(execFileSync(php,[...flags,resolve(priv,'query.php')],{input:JSON.stringify({sql:text,params}),encoding:'utf8',stdio:['pipe','pipe','pipe']}));
assert.deepEqual(sql('CREATE TABLE must_not_exist(id INT)'),{denied:true});pass('runtime role cannot perform DDL');
const pointerOriginal=await readFile(resolve(priv,'settings.php'));await settings('okgatesc_gsxportal');assert.throws(()=>cli('capture-worker.php'));await writeFile(resolve(priv,'settings.php'),pointerOriginal);pass('live database name rejected before any connection');
// Explicit local TLS/auth simulation. This router is NOT included in either ZIP.
const router=resolve(directory,'router.php');await writeFile(router,`<?php $_SERVER['HTTPS']=($_SERVER['HTTP_X_FIXTURE_HTTP']??'')==='yes'?'off':'on';$_SERVER['REMOTE_USER']=($_SERVER['HTTP_X_FIXTURE_ANON']??'')==='yes'?'':'fictional-gate';$_SERVER['DOCUMENT_ROOT']=${JSON.stringify(pub)};$prefix='/gsx-account-compat-${run}/';$p=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);if(!str_starts_with($p,$prefix)){http_response_code(404);exit;}$name=substr($p,strlen($prefix));if(!preg_match('/^[a-z-]+\\.php$/D',$name)||!is_file(__DIR__.'/public/'.$name)){http_response_code(404);exit;}require __DIR__.'/public/'.$name;`);
const server=spawn(php,[...flags,'-S','127.0.0.1:4328',router],{stdio:['ignore','ignore','pipe']});let errors='';server.stderr.on('data',d=>errors+=d);
class Client{cookie='';async request(file,body,extra={}){
 const payload=body===undefined?undefined:JSON.stringify(body);
 const response=await new Promise((accept,reject)=>{const q=httpRequest({hostname:'127.0.0.1',port:4328,path:'/gsx-account-compat-'+run+'/'+file,method:body===undefined?'GET':'POST',headers:{Host:'gsxok.com',...(this.cookie?{Cookie:this.cookie}:{}),...(body===undefined?{}:{Origin:'https://gsxok.com','Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}),...extra}},r=>{let text='';r.setEncoding('utf8');r.on('data',d=>text+=d);r.on('end',()=>accept({status:r.statusCode,headers:r.headers,text}));});q.on('error',reject);q.end(payload);});
 const set=response.headers['set-cookie']?.[0];if(set)this.cookie=set.split(';')[0];let data;try{data=JSON.parse(response.text);}catch{data=response.text;}return {status:response.status,data,set};
 }async post(file,body){const t=await this.request('csrf-token.php');return this.request(file,body,{'X-CSRF-Token':t.data.csrfToken});}}
try{
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:4328/');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const a=new Client(),b=new Client(),staff=new Client();let response=await a.request('csrf-token.php');if(response.status!==200)console.log(await readFile(resolve(priv,'logs/guard.log'),'utf8'));assert.equal(response.status,200);assert(response.set.includes('__Secure-gsx-compat-'+run));assert(response.set.toLowerCase().includes('secure'));assert(response.set.toLowerCase().includes('httponly'));assert(response.set.includes('path=/gsx-account-compat-'+run+'/'));
 assert.equal((await a.request('csrf-token.php',undefined,{'X-Fixture-HTTP':'yes','X-Forwarded-Proto':'https'})).status,503);assert.equal((await a.request('csrf-token.php',undefined,{'X-Fixture-Anon':'yes'})).status,503);pass('dedicated Secure cookie/path and guarded TLS/auth boundary (simulated locally)');
 assert.equal((await a.post('account-token.php',{action:'resend',email:'customer-a@gsx-test.invalid'})).status,202);
 cli('capture-worker.php',['--simulate-failure']);assert.equal(sql('SELECT attempts FROM account_mail_queue')[0].attempts,1);assert.equal(sql('SELECT sent_at FROM account_mail_queue')[0].sent_at,null);
 sql('UPDATE account_mail_queue SET next_attempt_at=NOW()');cli('capture-worker.php');
 const capture=JSON.parse((await readFile(resolve(priv,'captures/mail.jsonl'),'utf8')).trim());assert.equal(capture.recipient,'customer-a@gsx-test.invalid');assert(capture.url.startsWith('https://gsxok.com/gsx-account-compat-'+run+'/account.php#verify='));
 const token=new URL(capture.url).hash.split('=')[1];assert.equal((await a.post('account-token.php',{action:'verify',token})).status,200);assert.equal((await a.post('account-token.php',{action:'verify',token})).status,400);pass('capture-only queue failure/retry, scoped link and single-use verification');
 const login=(client,email)=>client.post('login.php',{email,password:'Fictional compatibility password 42!'});assert.equal((await login(staff,'staff@gsx-test.invalid')).status,200);
 assert.equal((await staff.post('admin-account-access.php',{id:1,access:'approved',reason:'Fictional package compatibility',currentPassword:'Fictional compatibility password 42!'})).status,200);
 assert.equal((await login(a,'customer-a@gsx-test.invalid')).status,200);assert.equal((await login(b,'customer-b@gsx-test.invalid')).status,200);assert.equal((await a.request('account-api.php')).data.companies[0].name,'Fictional Company A');assert.equal((await b.request('account-api.php')).data.companies[0].name,'Fictional Company B');
 assert.equal(sql('SELECT account_status FROM users WHERE id=1')[0].account_status,'pending');pass('packaged staff approval/customer login/isolation work without transaction activation');
 const profile={name:'Fictional reviewed display',address:'1 Example St',city:'Example',state:'OK',zip:'00000',phone:'000',email:'customer-a@gsx-test.invalid'};
 assert.equal((await a.post('account-api.php',{action:'profile-request',companyId:2,profile})).status,404);
 assert.equal((await a.post('account-api.php',{action:'profile-request',companyId:1,profile})).status,202);
 assert.equal((await staff.post('staff-account-api.php',{action:'profile-review',requestId:1,decision:'approved',reason:'Fictional compatibility review',currentPassword:'Fictional compatibility password 42!'})).status,200);
 assert.equal((await a.request('account-api.php')).data.companies[0].name,profile.name);assert.equal(sql('SELECT name FROM companies WHERE id=1')[0].name,'Fictional Company A');
 const link={action:'link',companyId:1,expectedVersion:0,customerId:'11111111-1111-4111-8111-111111111111',receipt:'not-signed',reason:'Fictional compatibility identity',currentPassword:'Fictional compatibility password 42!'};
 assert.equal((await staff.post('staff-account-api.php',link)).status,503);
 const keys=resolve(directory,'local-fictional-keys');execFileSync(process.execPath,[resolve(pkg,'local-tools/prepare-fictional-directory.mjs'),keys],{stdio:['ignore','pipe','pipe']});await cp(resolve(keys,'directory-public.pem'),resolve(priv,'directory-public.pem'));
 const receipt=execFileSync(process.execPath,[resolve(pkg,'local-tools/gsx-customer-receipt.mjs'),'--export',resolve(keys,'fictional-export.json'),'--private-key',resolve(keys,'fictional-private.pem'),'--customer',link.customerId,'--account','1','--company','1','--legacy-user','9001','--legacy-company','9101','--audience','https://gsxok.com'],{encoding:'utf8'}).trim();
 assert.equal((await staff.post('staff-account-api.php',{...link,receipt})).status,200);
 assert.equal(sql('SELECT customer_uuid FROM account_company_identity WHERE company_id=1')[0].customer_uuid,link.customerId);pass('packaged profile review and fictional signed linking preserve original company identity');
 assert.equal((await a.post('forgot-password.php',{email:'customer-a@gsx-test.invalid'})).status,200);cli('capture-worker.php');
 const resetCapture=JSON.parse((await readFile(resolve(priv,'captures/mail.jsonl'),'utf8')).trim().split('\n').at(-1));assert.equal(resetCapture.purpose,'reset');assert(resetCapture.url.startsWith('https://gsxok.com/gsx-account-compat-'+run+'/account.php#reset='));
 const newPassword='Fictional restored account password 42!';assert.equal((await a.post('reset-password.php',{token:new URL(resetCapture.url).hash.split('=')[1],password:newPassword,confirmPassword:newPassword})).status,200);assert.equal((await a.request('account-api.php')).status,401);
 assert.equal((await a.post('login.php',{email:'customer-a@gsx-test.invalid',password:newPassword})).status,200);pass('capture-only password recovery revokes sessions and preserves account-only access');
 assert.equal((await a.post('forgot-password.php',{email:'never-send@example.com'})).status,503);
 const before=await stat(resolve(priv,'captures/mail.jsonl'));admin("UPDATE users SET email='never-send@example.com' WHERE id=1",db);assert.throws(()=>cli('capture-worker.php'));assert.equal((await stat(resolve(priv,'captures/mail.jsonl'))).size,before.size);admin("UPDATE users SET email='customer-a@gsx-test.invalid' WHERE id=1",db);pass('non-test submitted or stored recipient blocks processing; no transport can send');
 await writeFile(resolve(priv,'snapshot.php'),`<?php require __DIR__.'/bootstrap.php';require GSX_COMPAT_PUBLIC_DIR.'/account-lib.php';$out=[];foreach(gsx_db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t){if(!preg_match('/^[a-z_]+$/D',$t))exit(2);$rows=gsx_db()->query('SELECT * FROM '.$t.' ORDER BY 1')->fetchAll();$out[$t]=['count'=>count($rows),'sha256'=>hash('sha256',json_encode($rows))];}echo json_encode($out);`);
 const beforeAll=JSON.parse(cli('snapshot.php'));
 const dumpBytes=execFileSync(dump,['--protocol=tcp','--host=127.0.0.1','--port=53317','--user=root','--password=fictional-root-only','--single-transaction','--skip-comments','--triggers',db],{maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});await writeFile(resolve(directory,'fictional-baseline.sql'),dumpBytes);admin(dumpBytes,restored);
 const beforeUsers=sql('SELECT id,email,password_hash,legacy_id,account_access FROM users ORDER BY id');const beforeAudit=sql('SELECT * FROM account_audit ORDER BY id');const beforeCompanies=sql('SELECT * FROM companies ORDER BY id');
 await settings(restored,user2);assert.deepEqual(JSON.parse(cli('snapshot.php')),beforeAll);assert.deepEqual(sql('SELECT id,email,password_hash,legacy_id,account_access FROM users ORDER BY id'),beforeUsers);assert.deepEqual(sql('SELECT * FROM account_audit ORDER BY id'),beforeAudit);assert.deepEqual(sql('SELECT * FROM companies ORDER BY id'),beforeCompanies);assert.deepEqual(sql("UPDATE account_audit SET action='invalid' WHERE id=1"),{denied:true});
 // A restored test installation receives a NEW empty session store, never copies sessions.
 const priorSessions=resolve(priv,'sessions');await cp(priorSessions,resolve(directory,'old-sessions-not-restored'),{recursive:true});
 const {rename}=await import('node:fs/promises');await rename(priorSessions,resolve(priv,'sessions-before-restore'));await mkdir(priorSessions);if(process.platform==='win32')execFileSync('attrib',['-R',priorSessions],{windowsHide:true});
 assert.equal((await a.request('account-api.php')).status,401);pass('test-only SQL dump/restore preserves hashes, mappings, audit, triggers; old browser session unusable');
 await settings(restored,user2,{enabled:false});assert.equal((await a.request('csrf-token.php')).status,503);pass('disable switch blocks test endpoints without touching the website');
 assert(!/Fatal error|Warning:|Uncaught/.test(errors),errors);
 for(const entry of manifest.entries)assert.equal(hash(await readFile(resolve(pkg,entry.path))),entry.sha256);
 console.log(JSON.stringify({result:'PASS',packageRun:run,sourceCommit:manifest.sourceCommit,localDatabase:db,restoredDatabase:restored,artifactUnchanged:true,apacheAndRealTlsTested:false}));
}finally{server.kill();}
