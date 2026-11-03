// Offline, trusted GSX operator tool. No server, database connection or writeback.
import {readFile,realpath,stat} from 'node:fs/promises';
import {createHash,createPrivateKey,randomUUID,sign} from 'node:crypto';
import {dirname,relative,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
export function verifyExport(value){
  if(value?.format!=='gsx2-logical-v1'||!Array.isArray(value.tables))throw Error('Invalid GSX export');
  const names=new Set();
  for(const table of value.tables){
    if(!['public','metrc_foundation'].includes(table.schema)&&!(table.schema==='app_security'&&['users','events'].includes(table.name)))throw Error('Invalid export scope');
    const name=table.schema+'.'+table.name;if(names.has(name))throw Error('Duplicate export table');names.add(name);
    const {sha256,...content}=table;
    if(sha256!==hash(JSON.stringify(content))||!Array.isArray(table.rows))throw Error('Invalid table checksum');
    for(const row of table.rows)JSON.parse(row);
  }
  if(value.sha256!==hash(JSON.stringify({format:value.format,tables:value.tables})))throw Error('Invalid export checksum');
}
export function createReceipt(snapshot,key,context,now=Math.floor(Date.now()/1000)){
  verifyExport(snapshot);
  if(!uuid(context.customerId)||!Number.isSafeInteger(context.companyId)||context.companyId<1||!Number.isSafeInteger(context.accountId)||context.accountId<1)throw Error('Exact customer/account/company IDs required');
  for(const id of [context.legacyUserId,context.legacyCompanyId])if(id!==null&&(!Number.isSafeInteger(id)||id<1))throw Error('Explicit legacy IDs or null required');
  const audience=new URL(context.audience);
  if(audience.origin!==context.audience || (audience.protocol!=='https:'&&!(audience.protocol==='http:'&&audience.hostname==='127.0.0.1')))throw Error('Exact HTTPS portal origin required');
  const table=snapshot.tables.find(t=>t.schema==='public'&&t.name==='order_customers');
  if(!table || table.rows.map(JSON.parse).filter(r=>r.id===context.customerId).length!==1)throw Error('Customer not present exactly once in GSX snapshot');
  const privateKey=createPrivateKey(key);
  if(privateKey.asymmetricKeyType!=='rsa'||privateKey.asymmetricKeyDetails.modulusLength<3072)throw Error('Dedicated RSA key of at least 3072 bits required');
  const payload={version:1,issuer:'gsx2-directory-export',audience:context.audience,customerId:context.customerId,accountId:context.accountId,companyId:context.companyId,legacyUserId:context.legacyUserId,legacyCompanyId:context.legacyCompanyId,sourceHash:snapshot.sha256,receiptId:randomUUID(),issuedAt:now,expiresAt:now+900};
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  return encoded+'.'+sign('RSA-SHA256',Buffer.from(encoded),privateKey).toString('base64url');
}
async function main(){
  const entries=process.argv.slice(2);if(entries.length%2)throw Error('Expected named options and values');
  const options=Object.fromEntries(Array.from({length:entries.length/2},(_,i)=>[entries[i*2].replace(/^--/,''),entries[i*2+1]]));
  const root=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
  async function privateFile(path,max){
    const actual=await realpath(path);const rel=relative(root,actual);
    if(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+(process.platform==='win32'?'\\':'/')))throw Error('Source exports and keys must remain outside the website checkout');
    const info=await stat(actual);if(!info.isFile()||info.size>max)throw Error('Invalid private input size');return actual;
  }
  const exportPath=await privateFile(options.export,64*1024*1024);
  if(Date.now()-(await stat(exportPath)).mtimeMs>86400000)throw Error('Use a fresh operator-reviewed GSX export (at most 24 hours old)');
  const snapshot=JSON.parse(await readFile(exportPath,'utf8'));
  const key=await readFile(await privateFile(options['private-key'],32768),'utf8');
  const integer=s=>s==='null'?null:Number(s);
  const context={customerId:options.customer,companyId:integer(options.company),accountId:integer(options.account),legacyUserId:integer(options['legacy-user']),legacyCompanyId:integer(options['legacy-company']),audience:options.audience};
  process.stdout.write(createReceipt(snapshot,key,context)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('GSX receipt refused: verify the private export, key, exact IDs, origin and freshness. No source data printed.');process.exitCode=1;});
