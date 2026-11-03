import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createReceipt} from '../../tools/gsx-customer-receipt.mjs';

export async function staffScenarios({Client,sql,clean,root,pass}) {
 const admin=new Client(),customer=new Client(),anonymous=new Client();
 assert.equal((await admin.login('reviewer@example.invalid')).status,200);assert.equal((await customer.login()).status,200);
 const reason='Fictional reviewed account identity';const password='Fictional password 42!';
 const post=(body,headers={})=>admin.post('staff-account-api.php',{reason,currentPassword:password,...body},headers);
 const baseCompanies=sql('SELECT * FROM companies ORDER BY id');const baseUsers=sql('SELECT id,password_hash,legacy_id,account_status FROM users WHERE id<3 ORDER BY id');
 assert.equal((await anonymous.request('staff-account-api.php')).status,401);
 assert.equal((await customer.request('staff-account-api.php')).status,401);
 assert.equal((await customer.post('staff-account-api.php',{action:'link'})).status,401);
 const listing=await admin.request('staff-account-api.php');assert.equal(listing.status,200);assert.equal(listing.data.capabilities.transactions,false);assert(!JSON.stringify(listing.data).includes('password_hash'));
 assert.equal((await admin.request('staff-account-api.php?page=0')).status,400);
 assert.equal((await admin.request('staff-account-api.php?resource=unknown')).status,400);
 pass('staff-only paginated account lists deny customer/anonymous access and never expose hashes');
 sql("INSERT INTO admins(email,first_name,password_hash,must_change_password) SELECT 'temporary@example.invalid','Fictional',password_hash,1 FROM admins WHERE id=1");
 const temporary=new Client();assert.equal((await temporary.login('temporary@example.invalid')).status,200);assert.equal((await temporary.request('staff-account-api.php')).status,403);
 sql("UPDATE admins SET must_change_password=0 WHERE email='temporary@example.invalid'");
 assert.equal((await temporary.request('staff-account-api.php')).status,200);
 sql("UPDATE admins SET status='disabled' WHERE email='temporary@example.invalid'");
 assert.equal((await temporary.request('staff-account-api.php')).status,401);
 pass('temporary-password and disabled staff accounts cannot use the review API');

 const count=()=>Number(sql('SELECT COUNT(*) AS n FROM account_audit')[0].n);
 let before=count();clean();
 assert.equal((await post({action:'profile-review',requestId:1,decision:'approved',currentPassword:'wrong'})).status,403);
 assert.equal((await post({action:'profile-review',requestId:1,decision:'approved'},{Origin:'https://attacker.invalid'})).status,403);
 assert.equal((await admin.request('staff-account-api.php',{action:'profile-review'})).status,403);
 assert.equal((await post({action:'profile-review',requestId:1,decision:'approved',reason:''})).status,400);
 assert.equal(count(),before);pass('staff decisions require CSRF, exact Origin, fresh password and reason; denied actions add no audit');
 clean();for(let i=0;i<10;i++)assert.equal((await post({action:'profile-review',requestId:1,decision:'approved',currentPassword:'wrong'})).status,403);
 assert.equal((await post({action:'profile-review',requestId:1,decision:'approved',currentPassword:'wrong'})).status,429);
 assert.equal(count(),before);pass('staff password throttling survives decision rollback and blocks repeated reauthentication guesses');

 sql("INSERT INTO users(first_name,last_name,address,city,state,zip,omma_license,email,phone,password_hash,account_status,email_verified_at) SELECT 'Fictional','Pending',address,city,state,zip,omma_license,'pending@example.invalid',phone,password_hash,'pending',NOW() FROM users WHERE id=1");
 let pending=sql("SELECT id,auth_version FROM users WHERE email='pending@example.invalid'")[0];
 clean();assert.equal((await admin.post('admin-account-access.php',{id:Number(pending.id),expectedVersion:Number(pending.auth_version),access:'approved',reason,currentPassword:password})).status,200);
 assert.equal((await admin.post('admin-account-access.php',{id:Number(pending.id),expectedVersion:Number(pending.auth_version),access:'suspended',reason,currentPassword:password})).status,409);
 assert.equal(sql('SELECT account_status FROM users WHERE id=?',[pending.id])[0].account_status,'pending');
 let events=(await admin.request('staff-account-api.php?resource=history&accountId='+pending.id)).data.rows;
 assert.equal(events[0].action,'access_approved');assert.equal(Number(events[0].actor_admin_id),1);assert.equal(JSON.parse(events[0].detail_json).reason,reason);
 pass('account approval records staff/reason, rejects stale decisions and leaves transaction status pending');

 clean();const profile={name:'Fictional approved account name',address:'Example',city:'Example',state:'OK',zip:'00000',phone:'000',email:'approved@example.invalid'};
 assert.equal((await customer.post('account-api.php',{action:'profile-request',companyId:1,profile})).status,202);
 const pendingRequests=sql('SELECT id FROM account_profile_requests WHERE company_id=1 ORDER BY id');assert(pendingRequests.length>=2);
 const first=Number(pendingRequests[0].id),second=Number(pendingRequests.at(-1).id);
 assert.equal((await post({action:'profile-review',requestId:first,decision:'approved'})).status,200);
 assert.equal((await post({action:'profile-review',requestId:first,decision:'rejected'})).status,409);
 assert.equal((await post({action:'profile-review',requestId:second,decision:'approved'})).status,409);
 assert.equal((await post({action:'profile-review',requestId:second,decision:'rejected'})).status,200);
 const own=(await customer.request('account-api.php')).data.companies[0];assert.equal(own.name,'Fictional changed');assert(own.profileVersion>0);
 assert.equal((await customer.post('account-api.php',{action:'profile-request',companyId:1,profileVersion:0,profile})).status,409);
 assert.deepEqual(sql('SELECT * FROM companies ORDER BY id'),baseCompanies);
 pass('profile approval updates only account overlay; rejected/duplicate/stale reviews cannot overwrite it');

 const privateDir=process.env.GSX_TEST_DIRECTORY_DIR;assert(privateDir&&process.env.GSX_TEST_DIRECTORY_PUBLIC_KEY);mkdirSync(privateDir,{recursive:true});
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 writeFileSync(process.env.GSX_TEST_DIRECTORY_PUBLIC_KEY,publicKey);const keyPath=resolve(privateDir,'fictional-private.pem');writeFileSync(keyPath,privateKey);
 const {PGlite}=createRequire(resolve(root,'../gsx-2/package.json'))('@electric-sql/pglite');
 const {exportBusinessData}=await import(pathToFileURL(resolve(root,'../gsx-2/database/export.ts')).href);
 const canonical=new PGlite();
 try {
  const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
  await canonical.exec('CREATE TABLE order_customers(id UUID PRIMARY KEY,name TEXT NOT NULL)');
  await canonical.query('INSERT INTO order_customers VALUES ($1,$2),($3,$4)',[id,'Fictional canonical Cedar',other,'Fictional canonical Prairie']);
  const snapshot=await exportBusinessData(canonical);const snapshotBefore=JSON.stringify(snapshot);const snapshotPath=resolve(privateDir,'fictional-gsx-export.json');writeFileSync(snapshotPath,snapshotBefore);
  const context={customerId:id,accountId:1,companyId:1,legacyUserId:9001,legacyCompanyId:9101,audience:'http://127.0.0.1:4318'};
  assert.throws(()=>createReceipt(snapshot,privateKey,{...context,customerId:'33333333-3333-4333-8333-333333333333'}));
  assert.throws(()=>createReceipt({...snapshot,sha256:'0'.repeat(64)},privateKey,context));
  const receipt=execFileSync(process.execPath,[resolve(root,'tools/gsx-customer-receipt.mjs'),'--export',snapshotPath,'--private-key',keyPath,'--customer',id,'--account','1','--company','1','--legacy-user','9001','--legacy-company','9101','--audience',context.audience],{encoding:'utf8'}).trim();
  assert.equal(readFileSync(snapshotPath,'utf8'),snapshotBefore);pass('offline signer uses existing GSX export format, rejects absent IDs/checksum changes and never modifies source');
  clean();const link={action:'link',companyId:1,expectedVersion:0,customerId:id,receipt};
  renameSync(process.env.GSX_TEST_DIRECTORY_PUBLIC_KEY,process.env.GSX_TEST_DIRECTORY_PUBLIC_KEY+'.fixture-backup');
  try { assert.equal((await post(link)).status,503); } finally {renameSync(process.env.GSX_TEST_DIRECTORY_PUBLIC_KEY+'.fixture-backup',process.env.GSX_TEST_DIRECTORY_PUBLIC_KEY);}
  pass('customer linking fails closed when directory verification is unavailable');
  const tampered=receipt.slice(0,10)+(receipt[10]==='a'?'b':'a')+receipt.slice(11);
  assert.equal((await post({...link,receipt:tampered})).status,400);
  assert.equal((await post({...link,receipt:createReceipt(snapshot,privateKey,context,Math.floor(Date.now()/1000)-901)})).status,400);
  assert.equal((await post({...link,receipt:createReceipt(snapshot,privateKey,{...context,legacyCompanyId:999})})).status,400);
  assert.equal((await post({...link,receipt:createReceipt(snapshot,privateKey,{...context,audience:'https://other.invalid'})})).status,400);
  assert.equal((await post({...link,companyId:2})).status,400);
  assert.equal(Number(sql('SELECT COUNT(*) AS n FROM account_link_history')[0].n),0);
  pass('link receipts reject tampering, expiry, wrong audience/company and legacy-reference mismatch');
  clean();assert.equal((await post(link)).status,200);
  let companies=(await admin.request('staff-account-api.php?resource=companies&accountId=1')).data.rows;assert.equal(companies[0].customer_uuid,id);
  assert.equal((await post({...link,expectedVersion:1})).status,409);
  const secondContext={...context,companyId:2,accountId:2,legacyUserId:9002,legacyCompanyId:9102};
  assert.equal((await post({action:'link',companyId:2,expectedVersion:0,customerId:id,receipt:createReceipt(snapshot,privateKey,secondContext)})).status,409);
  assert.equal((await post({action:'unlink',companyId:1,expectedVersion:0})).status,409);
  assert.equal((await post({action:'unlink',companyId:1,expectedVersion:1})).status,200);
  assert.equal((await post({...link,expectedVersion:2})).status,409); // consumed receipt cannot be replayed
  assert.equal((await post({...link,expectedVersion:2,receipt:createReceipt(snapshot,privateKey,context)})).status,200);
  pass('exact-ID linking enforces uniqueness, explicit unlink, optimistic versions and single-use receipts');
  const history=sql('SELECT * FROM account_link_history WHERE company_id=1 ORDER BY version');assert.equal(history.length,3);assert.equal(history[1].previous_uuid,id);assert.equal(history[1].customer_uuid,null);assert.equal(history[0].legacy_company_id,9101);
  events=(await admin.request('staff-account-api.php?resource=history&accountId=1')).data.rows;
  assert(events.some(e=>e.action==='customer_linked'&&JSON.parse(e.detail_json).reason===reason));
  assert(!JSON.stringify(events).includes(receipt));assert(!JSON.stringify(events).includes(password));
  assert.throws(()=>sql("UPDATE account_audit SET action='tampered' WHERE id=1"));
  assert.throws(()=>sql('DELETE FROM account_profile_decisions WHERE request_id=?',[first]));
  assert.throws(()=>sql('DELETE FROM account_link_history WHERE company_id=1'));
  assert.deepEqual(sql('SELECT * FROM companies ORDER BY id'),baseCompanies);assert.deepEqual(sql('SELECT id,password_hash,legacy_id,account_status FROM users WHERE id<3 ORDER BY id'),baseUsers);
  assert.equal(JSON.stringify(await exportBusinessData(canonical)),snapshotBefore);
  pass('append-only staff audit/link/profile history preserves legacy records and the authoritative GSX directory');
 } finally {await canonical.close();}
 clean();return {adminPassword:password};
}
