'use strict';
let csrf='',selectedAccount=null;const pages={accounts:1,profiles:1,companies:1,history:1};
const notice=document.querySelector('#notice');
const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
function profileDetails(profile){const list=node('dl');const labels={name:'Business name',address:'Address',city:'City',state:'State',zip:'ZIP',phone:'Phone',email:'Business email'};for(const [key,label] of Object.entries(labels)){list.append(node('dt',label),node('dd',profile?.[key]??'Not supplied'));}return list;}
function clearPrivate(){for(const id of ['account-list','profile-list','company-list','history-list'])document.getElementById(id).replaceChildren();document.querySelector('#staff-identity').textContent='';document.querySelector('#review-password').value='';document.querySelector('#staff-dashboard').hidden=true;document.querySelector('#staff-entry').hidden=false;csrf='';selectedAccount=null;}
async function post(endpoint,body){
 if(!csrf)csrf=(await (await fetch('csrf-token.php',{cache:'no-store'})).json()).csrfToken;
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});const data=await r.json();
 if(!r.ok){if(r.status===401)clearPrivate();throw Error(data.error||'Request failed');}return data;
}
async function get(resource){
 const query=new URLSearchParams({resource,page:pages[resource]});if(selectedAccount)query.set('accountId',selectedAccount);
 const r=await fetch('staff-account-api.php?'+query,{cache:'no-store'});const data=await r.json();
 if(!r.ok){if(r.status===401||r.status===403)clearPrivate();throw Error(data.error||'Review unavailable');}csrf=data.csrfToken;return data.rows;
}
function field(form,label,name,value='',type='text'){const wrapper=node('label',label);const input=node(type==='textarea'?'textarea':'input');input.name=name;input.value=value;if(type!=='textarea')input.type=type;input.required=true;input.maxLength=type==='textarea'?8192:1000;wrapper.append(input);form.append(wrapper);return input;}
function decision(form,endpoint,makeBody,onDone){
 field(form,'Reason for this decision (8 characters minimum)','reason').minLength=8;
 const button=node('button','Confirm review decision');form.append(button);
 form.addEventListener('submit',async event=>{
  event.preventDefault();button.disabled=true;const password=document.querySelector('#review-password');
  try{const fields=Object.fromEntries(new FormData(form));await post(endpoint,{...makeBody(fields),reason:fields.reason,currentPassword:password.value});notice.textContent='Review decision recorded. Transaction permissions unchanged.';await onDone();}
  catch(error){notice.textContent=error.message;}finally{password.value='';button.disabled=false;}
 });
}
async function accounts(){const rows=await get('accounts');const target=document.querySelector('#account-list');target.replaceChildren();
 for(const account of rows){const card=node('article');card.append(node('h3',account.first_name+' '+account.last_name),node('p',account.email),node('p','Account access: '+account.account_access+' · Email '+(account.email_verified_at?'verified':'not verified')+' · Legacy ID: '+(account.legacy_id??'none')));
  const form=node('form');const label=node('label','Account access');const select=node('select');select.name='access';for(const status of ['pending','approved','suspended']){const option=node('option',status);option.value=status;option.selected=account.account_access===status;select.append(option);}label.append(select);form.append(label);
  decision(form,'admin-account-access.php',f=>({id:Number(account.id),access:f.access,expectedVersion:Number(account.auth_version)}),async()=>{await accounts();if(selectedAccount===String(account.id))await history();});card.append(form);
  const review=node('button','Review businesses and history');review.type='button';review.addEventListener('click',async()=>{selectedAccount=String(account.id);pages.companies=pages.history=1;try{await companies();await history();}catch(error){notice.textContent=error.message;}});card.append(review);target.append(card);
 }if(!rows.length)target.append(node('p','No accounts on this page.'));}
async function profiles(){const rows=await get('profiles');const target=document.querySelector('#profile-list');target.replaceChildren();
 for(const request of rows){const card=node('article');card.append(node('h3',request.company_name+' · Request '+request.id),node('p',request.email),node('p','Decision: '+(request.decision??'pending')));
  const current=profileDetails(request.currentProfile.profile);const proposed=profileDetails(request.profile);card.append(node('h4','Current approved account profile'),current,node('h4','Submitted changes'),proposed);
  if(!request.decision){const form=node('form');const label=node('label','Decision');const select=node('select');select.name='decision';for(const value of ['approved','rejected']){const option=node('option',value);option.value=value;select.append(option);}label.append(select);form.append(label);decision(form,'staff-account-api.php',f=>({action:'profile-review',requestId:Number(request.id),decision:f.decision}),async()=>{await profiles();if(selectedAccount)await history();});card.append(form);}else card.append(node('p','Reason: '+request.reason));target.append(card);
 }if(!rows.length)target.append(node('p','No profile requests on this page.'));}
async function companies(){const rows=await get('companies');document.querySelector('#company-section').hidden=false;const target=document.querySelector('#company-list');target.replaceChildren();
 for(const company of rows){const card=node('article');card.append(node('h3',company.name),node('p','Portal account '+company.user_id+' · Company '+company.id+' · Legacy company '+(company.legacy_id??'none')),node('p','GSX customer: '+(company.customer_uuid??'not linked')));
  const form=node('form');if(!company.customer_uuid){field(form,'Exact GSX customer UUID','customerId');field(form,'Signed single-record directory receipt','receipt','','textarea');}
  decision(form,'staff-account-api.php',f=>({action:company.customer_uuid?'unlink':'link',companyId:Number(company.id),expectedVersion:Number(company.link_version),...(company.customer_uuid?{}:{customerId:f.customerId,receipt:f.receipt})}),async()=>{await companies();await history();});if(company.customer_uuid)form.prepend(node('p','Confirming this decision explicitly revokes this identity link.'));card.append(form);target.append(card);
 }if(!rows.length)target.append(node('p','No companies on this page.'));}
async function history(){const rows=await get('history');document.querySelector('#history-section').hidden=false;const target=document.querySelector('#history-list');target.replaceChildren();for(const row of rows){const card=node('article');card.append(node('h3',row.action),node('p',row.created_at+' · Staff '+(row.actor_admin_id??'none')+' · Customer '+(row.actor_user_id??'none')),node('pre',row.detail_json??''));target.append(card);}if(!rows.length)target.append(node('p','No history on this page.'));}
async function boot(){const data=await (await fetch('session-check.php',{cache:'no-store'})).json();if(!data.loggedIn)return clearPrivate();if(data.role!=='admin'||data.mustChangePassword){clearPrivate();notice.textContent=data.mustChangePassword?'Set your staff password using the existing portal first.':'A staff account is required.';return;}document.querySelector('#staff-entry').hidden=true;document.querySelector('#staff-dashboard').hidden=false;document.querySelector('#staff-identity').textContent=data.firstName+' · '+data.email;await accounts();await profiles();}
document.querySelector('#staff-login').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{await post('login.php',Object.fromEntries(new FormData(form)));csrf='';form.reset();await boot();}catch(error){notice.textContent=error.message;}});
document.querySelector('#staff-logout').addEventListener('click',async()=>{try{await post('logout.php',{});clearPrivate();}catch(error){notice.textContent=error.message;}});
for(const resource of Object.keys(pages))for(const direction of ['prev','next'])document.getElementById(resource+'-'+direction).addEventListener('click',async()=>{pages[resource]=Math.max(1,pages[resource]+(direction==='next'?1:-1));try{await ({accounts,profiles,companies,history}[resource])();}catch(error){notice.textContent=error.message;}});
boot().catch(error=>{clearPrivate();notice.textContent=error.message;});
