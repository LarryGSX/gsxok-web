'use strict';
let csrf='', linkToken='';
const notice=document.querySelector('#notice');
async function post(endpoint,body){
  if(!csrf) csrf=(await (await fetch('csrf-token.php',{cache:'no-store'})).json()).csrfToken;
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});
  const data=await r.json(); if(!r.ok) throw Error(data.error||'Request failed'); return data;
}
async function refresh(){
  const r=await fetch('account-api.php',{cache:'no-store'}); const logged=r.ok;
  document.querySelector('#entry').hidden=logged; document.querySelector('#dashboard').hidden=!logged;
  document.querySelector('#identity').textContent=''; document.querySelector('#companies').replaceChildren();
  if(!logged){csrf='';return;}
  const data=await r.json(); csrf=data.csrfToken;
  document.querySelector('#identity').textContent=data.account.first_name+' '+data.account.last_name+' · '+data.account.email;
  for(const company of data.companies){
    const form=document.createElement('form');const heading=document.createElement('h3');heading.textContent=company.name;form.append(heading);
    for(const key of ['name','address','city','state','zip','phone','email']){const label=document.createElement('label');label.textContent=key;const input=document.createElement('input');input.name=key;input.value=company[key];input.required=true;input.maxLength=255;label.append(input);form.append(label);}
    const button=document.createElement('button');button.textContent='Submit changes for review';form.append(button);
    form.addEventListener('submit',async e=>{e.preventDefault();try{await post('account-api.php',{action:'profile-request',companyId:Number(company.id),profile:Object.fromEntries(new FormData(form))});notice.textContent='Changes submitted for review.';}catch(err){notice.textContent=err.message;}});
    document.querySelector('#companies').append(form);
  }
}
for(const form of document.querySelectorAll('form[data-endpoint]'))form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('button');button.disabled=true;
  try{const body=Object.fromEntries(new FormData(form));if(body.action==='reset')body.token=linkToken;
    await post(form.dataset.endpoint,body);form.reset();csrf='';
    notice.textContent=form.dataset.endpoint==='register.php'?'If eligible, check your email. GSX approval is also required.':body.action==='recover'||body.action==='resend'?'If eligible, an account email will be sent.':'Account updated.';
    if(body.action==='reset'){linkToken='';document.querySelector('#reset').hidden=true;}
    await refresh();
  }catch(err){notice.textContent=err.message;}finally{button.disabled=false;}
});
document.querySelector('#logout').addEventListener('click',async()=>{try{await post('logout.php',{});csrf='';await refresh();}catch(err){notice.textContent=err.message;}});
// Links carry secrets in fragments, never query logs or HTTP Referer headers.
const fragment=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);
if(fragment.has('reset')){linkToken=fragment.get('reset');document.querySelector('#reset').hidden=false;}
async function boot(){
  await refresh();
  if(fragment.has('verify')){await post('account-token.php',{action:'verify',token:fragment.get('verify')});notice.textContent='Email verified. Sign in after GSX approves your account.';}
}
boot().catch(()=>{notice.textContent='Account link or service unavailable. Please request another account email or try again.';});
