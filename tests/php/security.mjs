import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {staffScenarios} from './staff-security.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const php=process.env.GSX_TEST_PHP,ext=process.env.GSX_TEST_PHP_EXT;
assert(php&&ext&&process.env.GSX_FICTIONAL_TEST==='yes','Explicit portable PHP and fictional opt-in required');
assert(!existsSync(resolve(root,'portal-secrets.php')),'Refuse any real/local secret file');
const args=['-n','-d',`extension_dir=${ext}`,'-d','extension=php_mbstring.dll','-d','extension=php_pdo_mysql.dll','-d','extension=php_openssl.dll'];
const script=name=>resolve(root,'tests/php',name);
assert.equal(JSON.parse(execFileSync(php,[...args,script('transport.php')],{encoding:'utf8'})).error,'https_required');
console.log('PASS forged forwarded TLS cannot authorize HTTP outside explicit loopback test mode');
const sql=(sql,params=[])=>JSON.parse(execFileSync(php,[...args,script('db.php')],{input:JSON.stringify({sql,params}),encoding:'utf8',stdio:['pipe','pipe','pipe']}));
const clean=()=>sql('DELETE FROM account_requests');
const pass=message=>console.log('PASS '+message);
class Client {
 cookie='';
 async request(path,body,headers={}){
  const r=await fetch('http://127.0.0.1:4318/'+path,{method:body===undefined?'GET':'POST',headers:{...(this.cookie?{Cookie:this.cookie}:{}),...(body===undefined?{}:{Origin:'http://127.0.0.1:4318','Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const cookie=r.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];
  const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:r.status,data,headers:r.headers};
 }
 async post(path,body,headers={}){const c=await this.request('csrf-token.php');return this.request(path,body,{'X-CSRF-Token':c.data.csrfToken,...headers});}
 async login(email='cedar@example.invalid',password='Fictional password 42!'){return this.post('login.php',{email,password});}
}
const mail=()=>existsSync(process.env.GSX_FICTIONAL_MAIL)?readFileSync(process.env.GSX_FICTIONAL_MAIL,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const token=(email,purpose)=>{
 execFileSync(php,[...args,'-d',`auto_prepend_file=${script('bootstrap.php')}`,resolve(root,'account-mail-worker.php')]);
 return new URL(mail().filter(m=>m.email===email&&m.purpose===purpose).at(-1).url).hash.split('=')[1];
};
const server=spawn(php,[...args,'-d',`auto_prepend_file=${script('bootstrap.php')}`,'-d',`session.save_path=${process.env.GSX_TEST_SESSION_DIR}`,'-S','127.0.0.1:4318','-t',root,script('router.php')],{stdio:['ignore','ignore','pipe']});
let errors='';server.stderr.on('data',d=>{errors+=d;});
try {
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:4318/csrf-token.php');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const a=new Client(), b=new Client(), admin=new Client();
 assert.equal((await a.login()).status,200);assert.equal((await b.login('prairie@example.invalid')).status,200);
 assert.equal((await admin.login('reviewer@example.invalid')).status,200);pass('customer and reviewer login with fictional existing credentials');
 let r=await a.request('account-api.php');assert.equal(r.data.companies.length,1);assert.equal(r.data.companies[0].name,'Fictional Cedar');assert.equal(r.data.capabilities.transactions,false);assert.equal(r.headers.get('cache-control'),'no-store');pass('own-company read isolation and private-response cache policy');
 const profile={name:'Fictional changed',address:'Example',city:'Example',state:'OK',zip:'00000',phone:'000',email:'test@example.invalid'};
 const before=sql('SELECT * FROM companies ORDER BY id');
 assert.equal((await a.post('account-api.php',{action:'profile-request',companyId:2,profile})).status,404);
 assert.equal((await a.post('account-api.php',{action:'profile-request',companyId:1,profile})).status,202);
 assert.deepEqual(sql('SELECT * FROM companies ORDER BY id'),before);pass('cross-company mutation denied; own edits remain claims; legacy company data unchanged');
 assert.equal((await a.post('account-api.php',{action:'profile-request',companyId:1,profile},{Origin:'https://attacker.invalid'})).status,403);
 assert.equal((await a.request('account-api.php',{action:'revoke-sessions'})).status,403);pass('cross-origin and missing-CSRF rejection');
 clean(); const password='  Fictional spaced password 42!  ';
 const registration={firstName:'Fictional',lastName:'New',address:'Example',city:'Example',state:'OK',zip:'00000',ommaLicense:'FICTIONAL',email:'new@example.invalid',phone:'000',password,confirmPassword:password};
 const n=new Client();r=await n.post('register.php',registration);assert.equal(r.status,200);
 assert.deepEqual(await n.post('register.php',registration).then(x=>({status:x.status,data:x.data})),{status:r.status,data:r.data});
 assert.equal((await n.login(registration.email,password)).status,401);pass('registration duplicate response matches new account; unverified account denied');
 assert.equal((await admin.post('admin-account-access.php',{reason:'Fictional account access review',id:3,access:'approved',currentPassword:'Fictional password 42!'})).status,409);
 assert.equal((await n.post('register.php',{...registration,email:'short@example.invalid',password:'short',confirmPassword:'short'})).status,400);
 assert.equal((await n.post('register.php',{...registration,email:'long@example.invalid',password:'x'.repeat(73),confirmPassword:'x'.repeat(73)})).status,400);
 pass('unverified approval denied; weak and bcrypt-truncated new passwords rejected');
 const verify=token(registration.email,'verify');
 assert.equal((await n.post('account-token.php',{action:'verify',token:verify})).status,200);
 assert.equal((await n.post('account-token.php',{action:'verify',token:verify})).status,400);
 clean();assert.equal((await n.post('admin-account-access.php',{reason:'Fictional account access review',id:3,access:'approved',currentPassword:password})).status,401);
 assert.equal((await admin.post('admin-account-access.php',{reason:'Fictional account access review',id:3,access:'approved',currentPassword:'Fictional password 42!'})).status,200);
 assert.equal(sql('SELECT account_status FROM users WHERE id=3')[0].account_status,'pending');
 assert.equal((await n.login(registration.email,password)).status,200);assert.equal((await n.login(registration.email,password.trim())).status,401);pass('single-use email verification, staff-only account approval, exact password preservation; no transaction activation');
 clean(); const unknown=await n.post('forgot-password.php',{email:'absent@example.invalid'});const known=await n.post('forgot-password.php',{email:registration.email});assert.equal(known.status,unknown.status);assert.deepEqual(known.data,unknown.data);
 const reset=token(registration.email,'reset'); const replacement='New fictional password 42!';
 assert.equal((await n.post('reset-password.php',{token:reset,password:replacement,confirmPassword:replacement})).status,200);
 assert.equal((await n.post('reset-password.php',{token:reset,password:replacement,confirmPassword:replacement})).status,400);
 assert.equal((await n.request('account-api.php')).status,401);pass('generic recovery, reset replay denied and existing session revoked');
 assert.equal((await n.login(registration.email,replacement)).status,200);
 clean();const changed='Changed fictional password 42!';
 assert.equal((await n.post('account-api.php',{action:'password',currentPassword:'wrong',password:changed,confirmPassword:changed})).status,403);
 assert.equal((await n.post('account-api.php',{action:'password',currentPassword:replacement,password:changed,confirmPassword:changed})).status,200);
 assert.equal((await n.request('account-api.php')).status,401);
 assert.equal((await n.login(registration.email,changed)).status,200);pass('password change requires reauthentication and invalidates sessions');
 clean();assert.equal((await n.post('account-api.php',{action:'revoke-sessions',currentPassword:changed})).status,200);assert.equal((await n.request('account-api.php')).status,401);pass('explicit session revocation');
 assert.equal((await a.request('test-session-clock',{idle:true})).status,200);assert.equal((await a.request('account-api.php')).status,401);
 assert.equal((await a.login()).status,200);await a.request('test-session-clock',{absolute:true});assert.equal((await a.request('account-api.php')).status,401);pass('idle and absolute expiration independently enforced');
 clean();assert.equal((await b.request('account-api.php')).status,200);
 assert.equal((await admin.post('admin-account-access.php',{reason:'Fictional account access review',id:2,access:'suspended',currentPassword:'Fictional password 42!'})).status,200);
 assert.equal((await b.request('account-api.php')).status,401);
 assert.equal((await admin.post('admin-account-access.php',{reason:'Fictional account access review',id:2,access:'approved',currentPassword:'Fictional password 42!'})).status,200);
 assert.equal((await b.request('account-api.php')).status,401);pass('suspension/reapproval cannot resurrect prior sessions');
 clean();for(let i=0;i<10;i++)assert.equal((await a.post('forgot-password.php',{email:'absent@example.invalid'},{'X-Forwarded-For':'192.0.2.'+i,'X-Real-IP':'198.51.100.'+i})).status,200);
 assert.equal((await a.post('forgot-password.php',{email:'different@example.invalid'},{'X-Forwarded-For':'203.0.113.42'})).status,429);
 assert.equal(sql('SELECT DISTINCT ip_address FROM account_requests')[0].ip_address,'127.0.0.1');pass('forged forwarding headers cannot bypass recovery throttling');
 clean();await n.post('forgot-password.php',{email:registration.email});const race=token(registration.email,'reset');
 const consume=()=>new Promise((resolve,reject)=>{const p=spawn(php,[...args,script('consume.php')],{stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',d=>out+=d);p.on('exit',code=>code===0?resolve(JSON.parse(out)):reject(Error('Token worker failed')));p.stdin.end(JSON.stringify({token:race}));});
 assert.deepEqual((await Promise.all([consume(),consume()])).sort(),[false,true]);pass('concurrent reset consumers: exactly one succeeds across independent DB connections');
 clean();await n.post('forgot-password.php',{email:registration.email});const expired=token(registration.email,'reset');
 sql('UPDATE account_tokens SET expires_at=NOW()-INTERVAL 1 MINUTE WHERE purpose=?',['reset']);
 assert.equal((await n.post('reset-password.php',{token:expired,password:replacement,confirmPassword:replacement})).status,400);pass('expired recovery tokens rejected');
 clean();await n.post('forgot-password.php',{email:registration.email});
 execFileSync(php,[...args,'-d',`auto_prepend_file=${script('bootstrap.php')}`,resolve(root,'account-mail-worker.php')],{env:{...process.env,GSX_TEST_MAIL_FAILURE:'yes'},stdio:['ignore','pipe','pipe']});
 assert.equal(Number(sql('SELECT COUNT(*) AS n FROM account_mail_queue WHERE sent_at IS NULL AND attempts=1')[0].n),1);
 sql('UPDATE account_mail_queue SET next_attempt_at=NOW() WHERE sent_at IS NULL');token(registration.email,'reset');
 assert.equal(Number(sql('SELECT COUNT(*) AS n FROM account_mail_queue WHERE sent_at IS NULL')[0].n),0);pass('mail delivery failure retains durable queue job and retry succeeds locally');
 assert.equal(sql('SELECT account_status FROM users WHERE id=3')[0].account_status,'pending');assert.deepEqual(sql('SELECT id,legacy_id FROM users WHERE id<3 ORDER BY id'),[{id:1,legacy_id:9001},{id:2,legacy_id:9002}]);pass('original legacy identity links preserved after all account operations');
 clean();
 await staffScenarios({Client,sql,clean,root,pass});
 const {chromium}=createRequire(resolve(root,'../gsx-2/package.json'))('@playwright/test');
 const browser=await chromium.launch({executablePath:process.env.GSX_TEST_BROWSER,headless:true});
 try {
  for (const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
    const context=await browser.newContext({viewport});const page=await context.newPage();const pageErrors=[];const external=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await page.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}return route.continue();});
    await page.goto('http://127.0.0.1:4318/account.php');
    await page.getByRole('heading',{name:'Create an account',exact:true}).waitFor();
    const evidence=process.env.GSX_TEST_SCREENSHOTS;
    if(evidence){mkdirSync(evidence,{recursive:true});await page.screenshot({path:resolve(evidence,`${name}-entry.png`),fullPage:true});}
    const login=page.locator('form[data-endpoint="login.php"]');
    await login.locator('[name=email]').fill('cedar@example.invalid');await login.locator('[name=password]').fill('Fictional password 42!');await login.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.locator('#dashboard').waitFor({state:'visible'});
    assert.match(await page.locator('#identity').textContent(),/cedar@example.invalid/);
    assert.equal(await page.locator('#companies form').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(evidence)await page.screenshot({path:resolve(evidence,`${name}-dashboard.png`),fullPage:true});
    await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.locator('#entry').waitFor({state:'visible'});
    assert.equal(await page.locator('#identity').textContent(),'');assert.equal(await page.locator('#companies form').count(),0);
    // Drive the actual staff screens with a separate, existing staff identity.
    clean();sql("INSERT INTO users(first_name,last_name,address,city,state,zip,omma_license,email,phone,password_hash,account_status,email_verified_at) SELECT 'Fictional','Browser',address,city,state,zip,omma_license,?,phone,password_hash,'pending',NOW() FROM users WHERE id=1",[`staffui-${name}@example.invalid`]);
    const revision=sql("SELECT MAX(id) AS id FROM account_profile_decisions WHERE company_id=1 AND decision='approved'")[0].id;
    sql('INSERT INTO account_profile_requests(user_id,company_id,profile_json,base_revision) VALUES (1,1,?,?)',[JSON.stringify({name:`Fictional browser ${name}`,address:'Example',city:'Example',state:'OK',zip:'00000',phone:'000',email:'browser@example.invalid'}),revision]);
    const requestId=sql('SELECT MAX(id) AS id FROM account_profile_requests')[0].id;
    await page.goto('http://127.0.0.1:4318/staff-accounts.php');
    const staffLogin=page.locator('#staff-login');await staffLogin.locator('[name=email]').fill('reviewer@example.invalid');await staffLogin.locator('[name=password]').fill('Fictional password 42!');await staffLogin.getByRole('button',{name:'Sign in',exact:true}).click();
    const card=page.locator('#account-list article').filter({hasText:`staffui-${name}@example.invalid`});await card.waitFor();await card.locator('select').selectOption('approved');await card.locator('[name=reason]').fill('Fictional browser account approval');await page.locator('#review-password').fill('Fictional password 42!');
    await Promise.all([page.waitForResponse(r=>r.url().endsWith('/admin-account-access.php')&&r.request().method()==='POST'&&r.status()===200),card.getByRole('button',{name:'Confirm review decision'}).click()]);
    assert.equal(sql('SELECT account_status FROM users WHERE email=?',[`staffui-${name}@example.invalid`])[0].account_status,'pending');
    await page.waitForFunction(()=>document.querySelector('#review-password').value==='');
    const profileCard=page.locator('#profile-list article').filter({has:page.getByRole('heading',{name:new RegExp('Request '+requestId+'$')})});await profileCard.waitFor();
    await profileCard.locator('[name=reason]').fill('Fictional browser profile approval');await page.locator('#review-password').fill('Fictional password 42!');
    await Promise.all([page.waitForResponse(r=>r.url().includes('/staff-account-api.php')&&r.request().method()==='POST'&&r.status()===200),profileCard.getByRole('button',{name:'Confirm review decision'}).click()]);
    await page.locator('#review-password').waitFor();await page.waitForFunction(()=>document.querySelector('#review-password').value==='');
    assert.equal(sql('SELECT decision FROM account_profile_decisions WHERE request_id=?',[requestId])[0].decision,'approved');
    const cedar=page.locator('#account-list article').filter({hasText:'cedar@example.invalid'});await cedar.getByRole('button',{name:'Review businesses and history'}).click();await page.locator('#company-section').waitFor({state:'visible'});await page.locator('#history-list article').first().waitFor();
    assert.match(await page.locator('#company-list').textContent(),/11111111-1111-4111-8111-111111111111/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(evidence){await page.screenshot({path:resolve(evidence,`${name}-staff.png`)});await profileCard.screenshot({path:resolve(evidence,`${name}-staff-profile.png`)});await page.locator('#company-section').screenshot({path:resolve(evidence,`${name}-staff-link.png`)});}
    await page.locator('#staff-logout').click();await page.locator('#staff-entry').waitFor({state:'visible'});assert.equal(await page.locator('#account-list article').count(),0);
    assert.deepEqual(pageErrors,[]);assert.deepEqual(external,[]);await context.close();
    pass(`${name} browser login -> own-company dashboard -> logout; no script errors, external calls or overflow`);
    pass(`${name} staff browser approval/profile review/link display/history/logout; no transaction activation`);
  }
 } finally {await browser.close();}
 assert(!/Fatal error|Uncaught|Warning:/.test(errors),errors);console.log('ALL PHP ACCOUNT SECURITY AND BROWSER SCENARIOS PASSED');
}finally{server.kill();}
