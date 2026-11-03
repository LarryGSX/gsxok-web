// LOCAL OPERATOR ONLY. Generates fictional inputs; never reads a real directory.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,generateKeyPairSync} from 'node:crypto';
if(!process.argv[2])throw Error('Supply a NEW PRIVATE LOCAL directory, never a web directory');
const out=resolve(process.argv[2]);await mkdir(out,{mode:0o700});
const hash=s=>createHash('sha256').update(s).digest('hex');
const columns=[{name:'id',type:'uuid'},{name:'name',type:'text'}];
const rows=[JSON.stringify({id:'11111111-1111-4111-8111-111111111111',name:'FICTIONAL canonical company A'}),JSON.stringify({id:'22222222-2222-4222-8222-222222222222',name:'FICTIONAL canonical company B'})].sort();
const content={schema:'public',name:'order_customers',columns,rows};const table={...content,sha256:hash(JSON.stringify(content))};
const source={format:'gsx2-logical-v1',tables:[table]};const snapshot={...source,sha256:hash(JSON.stringify(source))};
const keys=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
await writeFile(resolve(out,'fictional-export.json'),JSON.stringify(snapshot),{mode:0o600,flag:'wx'});
await writeFile(resolve(out,'fictional-private.pem'),keys.privateKey,{mode:0o600,flag:'wx'});
await writeFile(resolve(out,'directory-public.pem'),keys.publicKey,{mode:0o600,flag:'wx'});
console.log('Fictional export and test-only keys prepared. Copy ONLY directory-public.pem to the private HostGator test directory after approval. Keep the private key local.');
